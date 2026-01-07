import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentWeek, getWeekByNumber, ICOPSYCH_SCHEDULE } from "@/lib/schedule"

export const dynamic = 'force-dynamic'

interface StudyTask {
  day: string
  date: string
  timeSlots: Array<{
    startTime: string
    endTime: string
    duration: number // minutes
    topic: string
    subject: string
    type: 'review' | 'practice' | 'lecture' | 'prep'
    description: string
    priority: 'high' | 'medium' | 'low'
  }>
  totalHours: number
}

interface WeeklyStudyPlan {
  week: number
  weekTitle: string
  weekDate: string
  currentWeekTopic: string
  recommendedHours: number
  userPerformance: {
    currentWeekSubject: {
      subject: string
      score: number
      status: 'strong' | 'moderate' | 'weak'
    }
    weakSubjects: Array<{
      subject: string
      score: number
      priority: 'high' | 'medium'
    }>
  }
  dailyPlan: StudyTask[]
  upcomingTests: Array<{
    type: string
    date: string
    subjects: string[]
  }>
  progress: {
    completedHours: number
    totalHours: number
    completionRate: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get('week')
    const week = weekParam ? parseInt(weekParam) : getCurrentWeek()

    const plan = await generateWeeklyStudyPlan(session.user.id, week, request)
    
    return NextResponse.json({ plan })

  } catch (error) {
    console.error("Error generating weekly study plan:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateWeeklyStudyPlan(userId: string, weekNumber: number, request: NextRequest): Promise<WeeklyStudyPlan> {
  // Get current week info
  const weekData = getWeekByNumber(weekNumber)
  if (!weekData) {
    throw new Error(`Week ${weekNumber} not found`)
  }

  // Get user preferences
  const userPreferences = await prisma.userPreferences.findUnique({
    where: { userId }
  })

  const dailyAvailability = userPreferences?.dailyAvailability 
    ? JSON.parse(userPreferences.dailyAvailability) 
    : null
  const weeklyStudyGoal = userPreferences?.weeklyStudyGoal || 10.0

  // Get user's test attempts and performance
  const testAttempts = await prisma.testAttempt.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    take: 20
  })

  // Get ML recommendations
  let mlRecommendations: any = null
  try {
    // For /recommendations endpoint, use ML_API_URL if provided, otherwise construct from base
    let mlApiUrl: string
    if (process.env.ML_API_URL) {
      // If ML_API_URL already points to /recommendations, use it as-is
      // Otherwise, append /recommendations to the base URL
      if (process.env.ML_API_URL.includes('/recommendations')) {
        mlApiUrl = process.env.ML_API_URL
      } else {
        const baseUrl = process.env.ML_API_URL.replace(/\/$/, '')
        mlApiUrl = `${baseUrl}/recommendations`
      }
    } else {
      const mlApiBaseUrl = process.env.ML_API_BASE_URL || 'https://ml-recommendations-api.onrender.com'
      mlApiUrl = `${mlApiBaseUrl}/recommendations`
    }
    if (testAttempts.length > 0) {
      const mostRecent = testAttempts[0]
      if (mostRecent.subjectScores) {
        const subjectScores = JSON.parse(mostRecent.subjectScores)
        const mlSubjectScores: Record<string, { percentage: number }> = {}
        Object.entries(subjectScores).forEach(([subject, scores]: [string, any]) => {
          const percentage = scores.total > 0 ? (scores.correct / scores.total) * 100 : 0
          mlSubjectScores[subject] = { percentage }
        })

        const response = await fetch(mlApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectScores: mlSubjectScores,
            testType: mostRecent.testType || 'pre-test'
          })
        })

        if (response.ok) {
          mlRecommendations = await response.json()
        }
      }
    }
  } catch (error) {
    console.log('ML API unavailable, using rule-based recommendations')
  }

  // Analyze user performance
  const subjectPerformance = analyzeSubjectPerformance(testAttempts)
  const currentWeekSubject = weekData.activities[0]?.subjects[0] || 'General Psychology'
  const currentWeekScore = subjectPerformance[currentWeekSubject]?.percentage || 0

  // Identify weak subjects
  const weakSubjects = Object.entries(subjectPerformance)
    .filter(([_, stats]: [string, any]) => stats.percentage < 70)
    .map(([subject, stats]: [string, any]) => ({
      subject,
      score: stats.percentage,
      priority: stats.percentage < 60 ? 'high' as const : 'medium' as const
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  // Calculate recommended hours based on preferences or performance
  // Logic: If Total Available > Goal: allocate up to Goal. If Total Available < Goal: warn and use Available.
  let recommendedHours: number
  let totalAvailableHours = 0
  if (dailyAvailability) {
    const values = Object.values(dailyAvailability) as (string | number)[]
    totalAvailableHours = values.reduce((sum: number, hours: string | number) => {
      return sum + (parseFloat(String(hours)) || 0)
    }, 0)
  }
  
  if (dailyAvailability && totalAvailableHours > 0) {
    // User has set daily availability
    if (totalAvailableHours >= weeklyStudyGoal) {
      // Available hours meet or exceed goal: allocate up to goal
      recommendedHours = weeklyStudyGoal
    } else {
      // Available hours less than goal: use available hours (system will warn in UI)
      recommendedHours = totalAvailableHours
    }
  } else {
    // Fallback to performance-based calculation when no availability set
    const baseHours = weeklyStudyGoal || 10
    const weakSubjectBonus = weakSubjects.length * 2 // +2 hours per weak subject
    const currentWeekBonus = currentWeekScore < 70 ? 3 : 0 // +3 hours if weak in current week topic
    recommendedHours = baseHours + weakSubjectBonus + currentWeekBonus
  }

  // Generate daily plan
  const dailyPlan = generateDailyPlan(
    weekNumber,
    weekData,
    currentWeekSubject,
    currentWeekScore,
    weakSubjects,
    mlRecommendations,
    recommendedHours,
    dailyAvailability,
    userPreferences
  )

  // Get upcoming tests
  const upcomingTests = getUpcomingTests(weekNumber, weekData)

  // Calculate progress (for now, 0 - will be updated when session tracking is added)
  const completedHours = 0 // TODO: Get from study sessions
  const totalHours = recommendedHours
  const completionRate = totalHours > 0 ? (completedHours / totalHours) * 100 : 0

  // Get ML prediction for risk level
  let mlRiskLevel: string | null = null
  let mlStatus = 'unavailable'
  try {
    // Call ML API directly using internal function
    const { prisma: prismaClient } = await import('@/lib/prisma')
    const testAttemptsForML = await prismaClient.testAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 20
    })
    const preferencesForML = await prismaClient.userPreferences.findUnique({
      where: { userId }
    })
    
    if (testAttemptsForML.length > 0) {
      // Supports both ML_API_URL (full URL) and ML_API_BASE_URL + ML_API_ENDPOINT
      let mlApiUrl: string
      if (process.env.ML_API_URL) {
        // If ML_API_URL is provided, use it directly (but ensure it points to /api/predict)
        const baseUrl = process.env.ML_API_URL.replace(/\/recommendations$/, '').replace(/\/$/, '')
        mlApiUrl = `${baseUrl}/api/predict`
      } else {
        // Fallback to separate base URL and endpoint
        const mlApiBaseUrl = process.env.ML_API_BASE_URL || 'https://ml-recommendations-api.onrender.com'
        const mlApiEndpoint = process.env.ML_API_ENDPOINT || '/api/predict'
        mlApiUrl = `${mlApiBaseUrl}${mlApiEndpoint}`
      }
      const featureVector = await calculateFeatureVectorForML(testAttemptsForML, preferencesForML)
      
      try {
        const mlResponse = await fetch(mlApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, features: featureVector })
        })
        
        if (mlResponse.ok) {
          const mlData = await mlResponse.json()
          mlRiskLevel = mlData.riskLevel
          mlStatus = 'available'
        }
      } catch (error) {
        // Fallback to rule-based
        mlRiskLevel = calculateRuleBasedRiskLevel(featureVector)
        mlStatus = 'unavailable'
      }
    }
  } catch (error) {
    console.log('Could not fetch ML prediction for study plan')
  }

  // Map risk level to recommendation intensity (Chapter 4 Section 4.6.2.C)
  const getRecommendationIntensity = (riskLevel: string | null, score: number) => {
    if (!riskLevel) return 'Maintenance'
    
    if (riskLevel === 'high' && score < 70) return 'Intensive Review (8-10 hours/week)'
    if (riskLevel === 'high' && score >= 70 && score < 80) return 'Focused Review (6-8 hours/week)'
    if (riskLevel === 'medium' && score < 75) return 'Focused Review (6-8 hours/week)'
    if (riskLevel === 'medium' && score >= 75) return 'Maintenance (4-6 hours/week)'
    if (riskLevel === 'low' && score < 80) return 'Maintenance (4-6 hours/week)'
    if (riskLevel === 'low' && score >= 80) return 'Maintenance (2-4 hours/week)'
    
    return 'Maintenance'
  }

  // Helper functions for ML prediction
  async function calculateFeatureVectorForML(testAttempts: any[], preferences: any) {
    const features: Record<string, number> = {}
    const subjectScores: Record<string, number[]> = {}
    
    testAttempts.forEach(attempt => {
      if (attempt.subjectScores) {
        const scores = JSON.parse(attempt.subjectScores)
        Object.entries(scores).forEach(([subject, data]: [string, any]) => {
          if (!subjectScores[subject]) subjectScores[subject] = []
          if (data.total > 0) {
            const percentage = (data.correct / data.total) * 100
            const points = (percentage / 100) * 30
            subjectScores[subject].push(points)
          }
        })
      }
    })

    features.abnormal_psych_score = calculateAverage(subjectScores['Abnormal Psychology'] || []) || 24.0
    features.developmental_psych_score = calculateAverage(subjectScores['Developmental Psychology'] || []) || 24.0
    features.industrial_psych_score = calculateAverage(subjectScores['Industrial Psychology'] || []) || 24.0
    features.psychological_assessment_score = calculateAverage(subjectScores['Psychological Assessment'] || []) || 24.0

    const allSubjectAverages = [
      features.abnormal_psych_score,
      features.developmental_psych_score,
      features.industrial_psych_score,
      features.psychological_assessment_score
    ]

    features.overall_avg_score = allSubjectAverages.reduce((a, b) => a + b, 0) / allSubjectAverages.length
    const mean = features.overall_avg_score
    const variance = allSubjectAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allSubjectAverages.length
    const stdDev = Math.sqrt(variance)
    features.score_consistency = mean > 0 ? stdDev / mean : 0

    const preTests = testAttempts.filter(t => t.testType === 'pre-test')
    const postTests = testAttempts.filter(t => t.testType === 'post-test')
    if (preTests.length > 0 && postTests.length > 0) {
      const preAvg = preTests.reduce((sum, t) => sum + (t.score / t.totalQuestions * 30), 0) / preTests.length
      const postAvg = postTests.reduce((sum, t) => sum + (t.score / t.totalQuestions * 30), 0) / postTests.length
      features.improvement_rate = preAvg > 0 ? (postAvg - preAvg) / preAvg : 0
    } else {
      features.improvement_rate = 0
    }

    features.total_tests_taken = testAttempts.length
    const subjectsWithTests = Object.keys(subjectScores).length
    features.avg_tests_per_subject = subjectsWithTests > 0 ? testAttempts.length / subjectsWithTests : 0
    features.test_type = testAttempts[0]?.testType === 'pre-test' ? 0 : 1
    features.study_hours_per_week = preferences?.weeklyStudyGoal || 10.0
    
    // Study Habit Composite Scores (Chapter 4 Section 4.1.3)
    // Use new composite scores if available, fallback to legacy fields for backward compatibility
    features.active_learning_score = preferences?.habitActiveLearning ?? 
                                     preferences?.habitActiveTechniques ?? 0.5
    features.planning_score = preferences?.habitPlanning ?? 0.5
    features.discipline_score = preferences?.habitDiscipline ?? 0.5
    features.confidence_score = preferences?.habitConfidence ?? 0.5
    
    // Legacy fields (for backward compatibility with old ML models)
    features.habitActiveTechniques = preferences?.habitActiveTechniques ?? 
                                     preferences?.habitActiveLearning ?? 0.5
    features.habitQuietEnv = preferences?.habitQuietEnv ?? 0.5

    const score = features.overall_avg_score
    if (score < 20) features.risk_level = 2
    else if (score < 26) features.risk_level = 1
    else features.risk_level = 0

    return features
  }

  function calculateAverage(values: number[]): number | null {
    if (values.length === 0) return null
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  function calculateRuleBasedRiskLevel(features: any): 'high' | 'medium' | 'low' {
    const score = features.overall_avg_score || 24.0
    if (score < 20) return 'high'
    if (score < 26) return 'medium'
    return 'low'
  }

  return {
    week: weekNumber,
    weekTitle: weekData.title,
    weekDate: weekData.date,
    currentWeekTopic: currentWeekSubject,
    recommendedHours,
    recommendationIntensity: getRecommendationIntensity(mlRiskLevel, currentWeekScore),
    mlRiskLevel,
    mlStatus,
    mlRecommendations: mlRecommendations,
    totalAvailableHours: totalAvailableHours,
    weeklyStudyGoal: weeklyStudyGoal,
    userPerformance: {
      currentWeekSubject: {
        subject: currentWeekSubject,
        score: currentWeekScore,
        status: currentWeekScore >= 80 ? 'strong' : currentWeekScore >= 60 ? 'moderate' : 'weak'
      },
      weakSubjects
    },
    dailyPlan,
    upcomingTests,
    progress: {
      completedHours,
      totalHours,
      completionRate: Math.round(completionRate)
    }
  }
}

function analyzeSubjectPerformance(testAttempts: any[]) {
  const subjectStats: Record<string, { correct: number, total: number, percentage: number }> = {}
  
  testAttempts.forEach(attempt => {
    if (attempt.subjectScores) {
      try {
        const scores = JSON.parse(attempt.subjectScores)
        Object.entries(scores).forEach(([subject, score]: [string, any]) => {
          if (!subjectStats[subject]) {
            subjectStats[subject] = { correct: 0, total: 0, percentage: 0 }
          }
          subjectStats[subject].correct += score.correct || 0
          subjectStats[subject].total += score.total || 0
        })
      } catch (e) {
        // Skip invalid JSON
      }
    }
  })

  // Calculate percentages
  Object.keys(subjectStats).forEach(subject => {
    const stats = subjectStats[subject]
    stats.percentage = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
  })

  return subjectStats
}

function generateDailyPlan(
  weekNumber: number,
  weekData: any,
  currentWeekSubject: string,
  currentWeekScore: number,
  weakSubjects: Array<{ subject: string; score: number; priority: 'high' | 'medium' }>,
  mlRecommendations: any,
  totalHours: number,
  dailyAvailability: Record<string, number> | null = null,
  userPreferences: any = null
): StudyTask[] {
  const tasks: StudyTask[] = []
  const weekStart = getWeekStartDate(weekNumber)
  
  // Get topics from ML recommendations if available
  const mlTopics: string[] = []
  if (mlRecommendations?.recommendations) {
    mlTopics.push(...mlRecommendations.recommendations.map((r: any) => r.topic).filter(Boolean))
  }

  // Generate topics for current week subject
  const currentWeekTopics = getTopicsForSubject(currentWeekSubject, mlTopics)
  
  // Generate topics for weak subjects
  const weakSubjectTopics: Record<string, string[]> = {}
  weakSubjects.forEach(ws => {
    weakSubjectTopics[ws.subject] = getTopicsForSubject(ws.subject, mlTopics)
  })

  // Distribute hours across the week based on availability
  let remainingHours = totalHours
  const dayHours: number[] = []

  if (dailyAvailability) {
    // Use user's specified availability
    for (let day = 0; day < 7; day++) {
      const dayKey = day.toString()
      dayHours.push(parseFloat(dailyAvailability[dayKey]) || 0)
    }
  } else {
    // Distribute evenly, but skip Sunday
    const hoursPerDay = Math.ceil(totalHours / 6) // 6 days (Mon-Sat)
    for (let day = 0; day < 7; day++) {
      dayHours.push(day === 6 ? 0 : hoursPerDay) // Sunday = 0
    }
  }

  // Adjust if total exceeds available hours
  const totalAvailable = dayHours.reduce((sum, h) => sum + h, 0)
  if (totalAvailable > 0 && totalAvailable < totalHours) {
    // Scale down to fit availability
    const scale = totalAvailable / totalHours
    remainingHours = totalAvailable
    for (let i = 0; i < dayHours.length; i++) {
      dayHours[i] = dayHours[i] * scale
    }
  }

  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + day)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    const dateStr = date.toISOString().split('T')[0]
    const dayHoursAvailable = dayHours[day]

    // Skip days with no availability
    if (dayHoursAvailable <= 0) {
      tasks.push({
        day: dayName,
        date: dateStr,
        timeSlots: [],
        totalHours: 0
      })
      continue
    }

    const timeSlots: StudyTask['timeSlots'] = []

    // Extract study habit composite scores (Chapter 4 Section 4.1.3)
    const activeLearning = userPreferences?.habitActiveLearning ?? 0.5 // Default to moderate
    const planning = userPreferences?.habitPlanning ?? 0.5
    const discipline = userPreferences?.habitDiscipline ?? 0.5
    const confidence = userPreferences?.habitConfidence ?? 0.5
    
    // Legacy fallback (for backward compatibility)
    const prefersActive = userPreferences?.habitActiveTechniques && userPreferences.habitActiveTechniques > 0.67
    const prefersMorning = userPreferences?.habitQuietEnv && userPreferences.habitQuietEnv > 0.67
    
    // Use new composite scores if available, otherwise fall back to legacy
    const usesActiveLearning = activeLearning > 0.5 || (prefersActive && activeLearning === 0.5)
    const hasGoodPlanning = planning > 0.67
    const hasGoodDiscipline = discipline > 0.67
    const isConfident = confidence > 0.67
    
    // Determine study approach based on habits
    // Active Learning: influences task types (practice vs lecture)
    // Planning: influences schedule structure (detailed vs flexible)
    // Discipline: influences session frequency (frequent short vs longer sessions)
    // Confidence: influences intensity and difficulty

    // Monday - Focus on current week topic
    if (day === 0) {
      // Adjust start time based on planning score (better planners prefer structured morning times)
      const morningStart = hasGoodPlanning ? '08:00' : '09:00'
      const afternoonStart = hasGoodPlanning ? '13:00' : '14:00'
      
      // Determine task type based on active learning score
      const taskType = usesActiveLearning ? 'practice' as const : 'lecture' as const
      const taskDescription = usesActiveLearning
        ? `Use active learning techniques (summarizing, highlighting, concept mapping) to review ${currentWeekSubject}`
        : `Review ${currentWeekSubject} lecture materials and key concepts`
      
      // Adjust duration based on discipline (high discipline = longer focused sessions)
      const sessionDuration = hasGoodDiscipline ? 120 : 90
      
      const slot1 = {
        startTime: morningStart,
        endTime: hasGoodDiscipline ? '11:00' : '10:30',
        duration: sessionDuration,
        topic: currentWeekTopics[0] || `${currentWeekSubject} Fundamentals`,
        subject: currentWeekSubject,
        type: taskType,
        description: taskDescription,
        priority: currentWeekScore < 70 ? 'high' as const : 'medium' as const
      }
      timeSlots.push(slot1)

      if (dayHoursAvailable > 1.5) {
        // For users with high active learning, add more practice-focused tasks
        const practiceDuration = usesActiveLearning ? 90 : 60
        const slot2 = {
          startTime: afternoonStart,
          endTime: hasGoodDiscipline ? '15:30' : '15:00',
          duration: practiceDuration,
          topic: currentWeekTopics[1] || 'Practice Questions',
          subject: currentWeekSubject,
          type: usesActiveLearning ? 'practice' as const : 'review' as const,
          description: usesActiveLearning
            ? `Complete practice questions and create concept maps for ${currentWeekSubject}`
            : `Complete practice questions on ${currentWeekSubject}`,
          priority: 'medium' as const
        }
        timeSlots.push(slot2)
      }
    }
    // Tuesday - Current week + weak subject
    else if (day === 1) {
      const weakSubject = weakSubjects[0]
      if (weakSubject && dayHoursAvailable >= 2) {
        timeSlots.push({
          startTime: '10:00',
          endTime: '11:30',
          duration: 90,
          topic: weakSubjectTopics[weakSubject.subject]?.[0] || `${weakSubject.subject} Review`,
          subject: weakSubject.subject,
          type: 'review' as const,
          description: `Review weak areas in ${weakSubject.subject} (Score: ${Math.round(weakSubject.score)}%)`,
          priority: 'high' as const
        })

        // Add frequent short review sessions for users with high discipline
        if (dayHoursAvailable > 1.5 && hasGoodDiscipline) {
          timeSlots.push({
            startTime: '15:00',
            endTime: '15:30',
            duration: 30,
            topic: currentWeekTopics[2] || 'Quick Review',
            subject: currentWeekSubject,
            type: usesActiveLearning ? 'practice' as const : 'review' as const,
            description: usesActiveLearning
              ? `Quick active review: summarize key ${currentWeekSubject} concepts`
              : `Quick review of ${currentWeekSubject} concepts`,
            priority: 'medium' as const
          })
        }
      } else {
        timeSlots.push({
          startTime: '10:00',
          endTime: '11:30',
          duration: 90,
          topic: currentWeekTopics[1] || 'Practice Questions',
          subject: currentWeekSubject,
          type: 'practice' as const,
          description: `Practice questions on ${currentWeekSubject}`,
          priority: 'medium' as const
        })
      }
    }
    // Wednesday - Current week focus
    else if (day === 2) {
      // Adjust difficulty and intensity based on confidence
      const advancedDuration = isConfident ? 120 : 90
      const advancedType = usesActiveLearning ? 'practice' as const : 'lecture' as const
      const advancedDescription = isConfident
        ? `Deep dive into ${currentWeekSubject} advanced topics${usesActiveLearning ? ' with active learning techniques' : ''}`
        : `Review ${currentWeekSubject} concepts with focus on challenging areas`
      
      timeSlots.push({
        startTime: hasGoodPlanning ? '09:00' : '10:00',
        endTime: hasGoodPlanning ? '11:00' : '11:30',
        duration: advancedDuration,
        topic: currentWeekTopics[2] || 'Advanced Concepts',
        subject: currentWeekSubject,
        type: advancedType,
        description: advancedDescription,
        priority: 'medium' as const
      })
    }
    // Thursday - Pre-test prep
    else if (day === 3) {
      timeSlots.push({
        startTime: '10:00',
        endTime: '11:30',
        duration: 90,
        topic: 'Pre-Test Preparation',
        subject: currentWeekSubject,
        type: 'prep' as const,
        description: `Review all ${currentWeekSubject} concepts for tomorrow's pre-test`,
        priority: 'high' as const
      })

      // Add practice test for users with high active learning or planning
      if (dayHoursAvailable > 1.5 && (usesActiveLearning || hasGoodPlanning)) {
        const practiceDuration = hasGoodDiscipline ? 30 : 20
        timeSlots.push({
          startTime: hasGoodPlanning ? '14:00' : '15:00',
          endTime: hasGoodPlanning ? '14:30' : '15:20',
          duration: practiceDuration,
          topic: 'Practice Test',
          subject: currentWeekSubject,
          type: 'practice' as const,
          description: usesActiveLearning
            ? 'Quick practice test with active review techniques to assess readiness'
            : 'Quick practice test to assess readiness',
          priority: 'medium' as const
        })
      }
    }
    // Friday - Pre-test day (light review)
    else if (day === 4) {
      timeSlots.push({
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        topic: 'Final Pre-Test Review',
        subject: currentWeekSubject,
        type: 'prep' as const,
        description: `Final review before pre-test at 10:30 AM`,
        priority: 'high' as const
      })
    }
    // Saturday - Weak subjects review
    else if (day === 5) {
      const weakSubject = weakSubjects[1] || weakSubjects[0]
      if (weakSubject) {
        timeSlots.push({
          startTime: '10:00',
          endTime: '12:00',
          duration: 120,
          topic: weakSubjectTopics[weakSubject.subject]?.[0] || `${weakSubject.subject} Review`,
          subject: weakSubject.subject,
          type: 'review' as const,
          description: `Comprehensive review of ${weakSubject.subject} weak areas`,
          priority: weakSubject.priority
        })
      } else {
        timeSlots.push({
          startTime: '10:00',
          endTime: '11:30',
          duration: 90,
          topic: 'General Review',
          subject: 'All Subjects',
          type: 'review' as const,
          description: 'Review topics from this week',
          priority: 'medium' as const
        })
      }
    }

    const totalMinutes = timeSlots.reduce((sum, slot) => sum + slot.duration, 0)
    const totalHoursForDay = totalMinutes / 60

    tasks.push({
      day: dayName,
      date: dateStr,
      timeSlots: timeSlots.length > 0 ? timeSlots : [{
        startTime: '10:00',
        endTime: '11:00',
        duration: 60,
        topic: 'Study Session',
        subject: currentWeekSubject,
        type: 'review',
        description: 'General study session',
        priority: 'medium'
      }],
      totalHours: totalHoursForDay
    })

    remainingHours -= totalHoursForDay
    if (remainingHours <= 0.1) break // Small threshold for floating point
  }

  return tasks
}

function getWeekStartDate(weekNumber: number): Date {
  const PROGRAM_START_DATE = new Date('2025-03-01T00:00:00')
  const weekStart = new Date(PROGRAM_START_DATE)
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7)
  return weekStart
}

function getTopicsForSubject(subject: string, mlTopics: string[]): string[] {
  // Default topics for each subject
  const defaultTopics: Record<string, string[]> = {
    'Developmental Psychology': [
      'Piaget\'s Stages of Cognitive Development',
      'Erikson\'s Psychosocial Stages',
      'Attachment Theory',
      'Language Development'
    ],
    'Abnormal Psychology': [
      'DSM-5 Criteria',
      'Mood Disorders',
      'Anxiety Disorders',
      'Personality Disorders'
    ],
    'Industrial Psychology': [
      'Organizational Behavior',
      'Employee Motivation',
      'Leadership Theories',
      'Workplace Assessment'
    ],
    'Psychological Assessment': [
      'Test Validity and Reliability',
      'Intelligence Testing',
      'Personality Assessment',
      'Clinical Assessment Tools'
    ]
  }

  // Use ML topics if available, otherwise use defaults
  const subjectTopics = mlTopics.filter(t => 
    t.toLowerCase().includes(subject.toLowerCase()) || 
    subject.toLowerCase().includes(t.toLowerCase())
  )

  if (subjectTopics.length > 0) {
    return subjectTopics.slice(0, 4)
  }

  return defaultTopics[subject] || [`${subject} Fundamentals`, 'Key Concepts', 'Practice Questions']
}

function getUpcomingTests(weekNumber: number, weekData: any): Array<{ type: string; date: string; subjects: string[] }> {
  const tests: Array<{ type: string; date: string; subjects: string[] }> = []
  const weekStart = getWeekStartDate(weekNumber)

  weekData.activities.forEach((activity: any) => {
    if (activity.type === 'pre-test' || activity.type === 'post-test' || activity.type === 'mock-exam') {
      // Pre-test is typically on Monday, post-test on Friday
      let testDate = new Date(weekStart)
      if (activity.type === 'pre-test') {
        testDate.setDate(testDate.getDate() + 0) // Monday
      } else if (activity.type === 'post-test') {
        testDate.setDate(testDate.getDate() + 4) // Friday
      } else {
        testDate.setDate(testDate.getDate() + 0) // Monday for mock exams
      }

      tests.push({
        type: activity.type,
        date: testDate.toISOString().split('T')[0],
        subjects: activity.subjects || []
      })
    }
  })

  return tests
}

