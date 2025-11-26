import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

interface StudyRecommendation {
  id: string
  type: 'weakness' | 'strength' | 'review' | 'practice'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  subjects: string[]
  estimatedTime: number // in minutes
  difficulty: 'easy' | 'medium' | 'hard'
  resources?: string[]
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recommendations = await generateStudyRecommendations(session.user.id)
    
    return NextResponse.json({ recommendations })

  } catch (error) {
    console.error("Error generating study recommendations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

async function generateStudyRecommendations(userId: string): Promise<StudyRecommendation[]> {
  try {
    // Get user's test attempts and question attempts
    const testAttempts = await prisma.testAttempt.findMany({
      where: { userId },
      include: {
        questionAttempts: {
          include: {
            question: true
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 10 // Last 10 tests
    })

    if (testAttempts.length === 0) {
      return getDefaultRecommendations()
    }

    // Try to use ML API first
    try {
      const mlRecommendations = await getMLRecommendations(testAttempts)
      if (mlRecommendations && mlRecommendations.length > 0) {
        console.log('✅ Using ML model recommendations')
        return mlRecommendations
      }
    } catch (mlError) {
      console.log('⚠️ ML API unavailable, falling back to rule-based recommendations:', mlError)
    }

    // Fallback to rule-based recommendations
    const subjectAnalysis = analyzeSubjectPerformance(testAttempts)
    const difficultyAnalysis = analyzeDifficultyPerformance(testAttempts)
    const recentWeaknesses = identifyRecentWeaknesses(testAttempts)

    const recommendations: StudyRecommendation[] = []

    // Generate recommendations based on analysis
    recommendations.push(...generateWeaknessRecommendations(subjectAnalysis, recentWeaknesses))
    recommendations.push(...generateStrengthRecommendations(subjectAnalysis))
    recommendations.push(...generateReviewRecommendations(testAttempts))
    recommendations.push(...generatePracticeRecommendations(difficultyAnalysis))

    // Sort by priority and return top 8
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, 8)

  } catch (error) {
    console.error("Error analyzing user performance:", error)
    return getDefaultRecommendations()
  }
}

async function getMLRecommendations(testAttempts: any[]): Promise<StudyRecommendation[]> {
  // Get the most recent test attempt
  const mostRecentAttempt = testAttempts[0]
  if (!mostRecentAttempt || !mostRecentAttempt.subjectScores) {
    return []
  }

  // Parse subject scores
  const subjectScores = JSON.parse(mostRecentAttempt.subjectScores)
  
  // Convert to format expected by ML API
  const mlSubjectScores: Record<string, { percentage: number }> = {}
  Object.entries(subjectScores).forEach(([subject, scores]: [string, any]) => {
    const percentage = scores.total > 0 ? (scores.correct / scores.total) * 100 : 0
    mlSubjectScores[subject] = { percentage }
  })

  // Call ML API - use environment variable or default to localhost for development
  const mlApiUrl = process.env.ML_API_URL || 'http://localhost:5000/recommendations'
  const response = await fetch(mlApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subjectScores: mlSubjectScores,
      testType: mostRecentAttempt.testType || 'pre-test'
    })
  })

  if (!response.ok) {
    throw new Error(`ML API returned ${response.status}`)
  }

  const mlData = await response.json()

  // Map ML response to StudyRecommendation format
  const recommendations: StudyRecommendation[] = []

  // Urgent recommendations (weak subjects)
  if (mlData.weakSubjects && mlData.weakSubjects.length > 0) {
    mlData.weakSubjects.forEach((subject: string, index: number) => {
      const subjectScore = mlSubjectScores[subject]?.percentage || 0
      recommendations.push({
        id: `ml-weakness-${subject}-${index}`,
        type: 'weakness',
        title: `Urgent: Focus on ${subject}`,
        description: `Your performance in ${subject} is ${Math.round(subjectScore)}%. The ML model recommends prioritizing this area for improvement. Review fundamental concepts and practice targeted questions.`,
        priority: 'high',
        subjects: [subject],
        estimatedTime: 60,
        difficulty: 'medium',
        resources: [`${subject} Study Guide`, 'Practice Questions', 'Concept Review']
      })
    })
  }

  // Study plan recommendations
  if (mlData.studyPlan && mlData.studyPlan.length > 0) {
    mlData.studyPlan.slice(0, 3).forEach((plan: any, index: number) => {
      recommendations.push({
        id: `ml-plan-${plan.subject}-${index}`,
        type: plan.priority === 'high' ? 'weakness' : 'practice',
        title: `${plan.subject}: ${plan.hours} hours/week`,
        description: plan.focus || `Recommended study plan for ${plan.subject}`,
        priority: plan.priority === 'high' ? 'high' : plan.priority === 'medium' ? 'medium' : 'low',
        subjects: [plan.subject],
        estimatedTime: plan.hours * 60, // Convert hours to minutes
        difficulty: 'medium',
        resources: [`${plan.subject} Materials`, 'Practice Tests']
      })
    })
  }

  // Specific topic recommendations
  if (mlData.recommendations && mlData.recommendations.length > 0) {
    mlData.recommendations.slice(0, 3).forEach((rec: any, index: number) => {
      recommendations.push({
        id: `ml-topic-${rec.subject}-${index}`,
        type: 'review',
        title: `${rec.subject}: ${rec.topic}`,
        description: rec.action || `Focus on ${rec.topic} in ${rec.subject}`,
        priority: rec.priority === 'high' ? 'high' : 'medium',
        subjects: [rec.subject],
        estimatedTime: 45,
        difficulty: 'medium',
        resources: [`${rec.topic} Study Materials`]
      })
    })
  }

  // Today's focus
  if (mlData.todayFocus && mlData.todayFocus.length > 0) {
    recommendations.push({
      id: 'ml-today-focus',
      type: 'practice',
      title: "Today's Focus Areas",
      description: `Prioritize these topics today: ${mlData.todayFocus.join(', ')}`,
      priority: 'high',
      subjects: mlData.todayFocus,
      estimatedTime: 90,
      difficulty: 'medium',
      resources: ['Today\'s Study Plan', 'Targeted Practice']
    })
  }

  // Strengths (long-term tab)
  if (mlData.strengths && mlData.strengths.length > 0) {
    mlData.strengths.forEach((subject: string, index: number) => {
      const subjectScore = mlSubjectScores[subject]?.percentage || 0
      recommendations.push({
        id: `ml-strength-${subject}-${index}`,
        type: 'strength',
        title: `Maintain Excellence in ${subject}`,
        description: `Great job! You're performing at ${Math.round(subjectScore)}% in ${subject}. Continue maintaining this strength with regular review.`,
        priority: 'low',
        subjects: [subject],
        estimatedTime: 20,
        difficulty: 'easy',
        resources: ['Advanced Topics', 'Case Studies']
      })
    })
  }

  // Sort by priority and return
  return recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    .slice(0, 8)
}

function analyzeSubjectPerformance(testAttempts: any[]) {
  const subjectStats: Record<string, { correct: number, total: number, recentCorrect: number, recentTotal: number }> = {}
  
  testAttempts.forEach(attempt => {
    if (attempt.subjectScores) {
      const scores = JSON.parse(attempt.subjectScores)
      Object.entries(scores).forEach(([subject, score]: [string, any]) => {
        if (!subjectStats[subject]) {
          subjectStats[subject] = { correct: 0, total: 0, recentCorrect: 0, recentTotal: 0 }
        }
        subjectStats[subject].correct += score.correct
        subjectStats[subject].total += score.total
        
        // Recent performance (last 3 tests)
        if (testAttempts.indexOf(attempt) < 3) {
          subjectStats[subject].recentCorrect += score.correct
          subjectStats[subject].recentTotal += score.total
        }
      })
    }
  })
  
  return subjectStats
}

function analyzeDifficultyPerformance(testAttempts: any[]) {
  const difficultyStats: Record<string, { correct: number, total: number }> = {}
  
  testAttempts.forEach(attempt => {
    attempt.questionAttempts.forEach((qa: any) => {
      const difficulty = qa.question.difficulty
      if (!difficultyStats[difficulty]) {
        difficultyStats[difficulty] = { correct: 0, total: 0 }
      }
      difficultyStats[difficulty].total++
      if (qa.isCorrect) {
        difficultyStats[difficulty].correct++
      }
    })
  })
  
  return difficultyStats
}

function identifyRecentWeaknesses(testAttempts: any[]) {
  const recentAttempts = testAttempts.slice(0, 3)
  const weaknessMap: Record<string, number> = {}
  
  recentAttempts.forEach(attempt => {
    attempt.questionAttempts.forEach((qa: any) => {
      if (!qa.isCorrect) {
        const subject = qa.question.subject
        weaknessMap[subject] = (weaknessMap[subject] || 0) + 1
      }
    })
  })
  
  return Object.entries(weaknessMap)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([subject]) => subject)
}

function generateWeaknessRecommendations(subjectAnalysis: any, recentWeaknesses: string[]): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = []
  
  // Find subjects with low performance
  Object.entries(subjectAnalysis).forEach(([subject, stats]: [string, any]) => {
    const overallPercentage = (stats.correct / stats.total) * 100
    const recentPercentage = stats.recentTotal > 0 ? (stats.recentCorrect / stats.recentTotal) * 100 : overallPercentage
    
    if (overallPercentage < 60 || recentPercentage < 50) {
      const priority = recentWeaknesses.includes(subject) ? 'high' : 'medium'
      
      recommendations.push({
        id: `weakness-${subject}`,
        type: 'weakness',
        title: `Focus on ${subject}`,
        description: `Your performance in ${subject} is ${Math.round(overallPercentage)}%. Focus on fundamental concepts and practice more questions.`,
        priority,
        subjects: [subject],
        estimatedTime: 45,
        difficulty: 'medium',
        resources: [`${subject} Study Guide`, 'Practice Questions', 'Concept Review']
      })
    }
  })
  
  return recommendations
}

function generateStrengthRecommendations(subjectAnalysis: any): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = []
  
  // Find subjects with high performance
  Object.entries(subjectAnalysis).forEach(([subject, stats]: [string, any]) => {
    const percentage = (stats.correct / stats.total) * 100
    
    if (percentage >= 80 && stats.total >= 5) {
      recommendations.push({
        id: `strength-${subject}`,
        type: 'strength',
        title: `Maintain ${subject} Excellence`,
        description: `Great job! You're performing at ${Math.round(percentage)}% in ${subject}. Keep up the good work with regular review.`,
        priority: 'low',
        subjects: [subject],
        estimatedTime: 20,
        difficulty: 'easy',
        resources: ['Advanced Topics', 'Case Studies']
      })
    }
  })
  
  return recommendations
}

function generateReviewRecommendations(testAttempts: any[]): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = []
  
  // Recommend review of recent tests
  if (testAttempts.length > 0) {
    const recentTest = testAttempts[0]
    const score = (recentTest.score / recentTest.totalQuestions) * 100
    
    if (score < 70) {
      recommendations.push({
        id: 'review-recent',
        type: 'review',
        title: 'Review Recent Test Performance',
        description: `Your recent test score was ${Math.round(score)}%. Review the questions you missed and understand the concepts better.`,
        priority: 'high',
        subjects: JSON.parse(recentTest.subjects || '[]'),
        estimatedTime: 30,
        difficulty: 'medium',
        resources: ['Test Review', 'Question Explanations']
      })
    }
  }
  
  return recommendations
}

function generatePracticeRecommendations(difficultyAnalysis: any): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = []
  
  // Recommend practice based on difficulty performance
  Object.entries(difficultyAnalysis).forEach(([difficulty, stats]: [string, any]) => {
    const percentage = (stats.correct / stats.total) * 100
    
    if (percentage < 60 && stats.total >= 3) {
      recommendations.push({
        id: `practice-${difficulty}`,
        type: 'practice',
        title: `Practice ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Questions`,
        description: `You're struggling with ${difficulty} questions (${Math.round(percentage)}% correct). Focus on understanding the concepts better.`,
        priority: 'medium',
        subjects: ['All Subjects'],
        estimatedTime: 40,
        difficulty: difficulty as any,
        resources: [`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Practice Set`]
      })
    }
  })
  
  return recommendations
}

function getDefaultRecommendations(): StudyRecommendation[] {
  return [
    {
      id: 'default-1',
      type: 'review',
      title: 'Start Your Learning Journey',
      description: 'Begin by taking your first pre-test to identify areas for improvement.',
      priority: 'high',
      subjects: ['All Subjects'],
      estimatedTime: 30,
      difficulty: 'medium',
      resources: ['Pre-Test', 'Study Guide']
    },
    {
      id: 'default-2',
      type: 'practice',
      title: 'Review ICOPSYCH Schedule',
      description: 'Familiarize yourself with the 18-week schedule and upcoming activities.',
      priority: 'medium',
      subjects: ['Schedule'],
      estimatedTime: 15,
      difficulty: 'easy',
      resources: ['Calendar', 'Schedule Overview']
    }
  ]
}


