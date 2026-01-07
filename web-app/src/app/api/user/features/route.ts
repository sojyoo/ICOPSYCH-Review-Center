import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

/**
 * Feature validation endpoint - shows calculated feature vector for debugging
 * This endpoint calculates all 20 features as described in Chapter 4
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const features = await calculateFeatureVector(session.user.id)
    
    return NextResponse.json({ 
      features,
      timestamp: new Date().toISOString(),
      note: "This endpoint shows the calculated feature vector used for ML predictions"
    })

  } catch (error) {
    console.error("Error calculating features:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

async function calculateFeatureVector(userId: string) {
  // Get user's test attempts
  const testAttempts = await prisma.testAttempt.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    take: 50
  })

  // Get user preferences
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId }
  })

  // Initialize feature object
  const features: Record<string, number | null> = {}

  if (testAttempts.length === 0) {
    // Cold-start: return default/median values
    return {
      status: 'cold_start',
      message: 'No test history available. Using default values.',
      features: {
        // Subject-specific scores (default to median: ~24 points = 80%)
        abnormal_psych_score: 24.0,
        developmental_psych_score: 24.0,
        industrial_psych_score: 24.0,
        psychological_assessment_score: 24.0,
        // Overall metrics
        overall_avg_score: 24.0,
        score_consistency: 0.08, // Median CV
        improvement_rate: 0.0,
        // Test patterns
        total_tests_taken: 0,
        avg_tests_per_subject: 0.0,
        test_type: 0,
        // Study habits (from preferences or defaults) - Chapter 4 Section 4.1.3
        study_hours_per_week: preferences?.weeklyStudyGoal || 10.0,
        active_learning_score: preferences?.habitActiveLearning ?? 
                               preferences?.habitActiveTechniques ?? 0.5,
        planning_score: preferences?.habitPlanning ?? 0.5,
        discipline_score: preferences?.habitDiscipline ?? 0.5,
        confidence_score: preferences?.habitConfidence ?? 0.5,
        // Legacy fields (for backward compatibility)
        habitActiveTechniques: preferences?.habitActiveTechniques ?? 
                               preferences?.habitActiveLearning ?? 0.5,
        habitQuietEnv: preferences?.habitQuietEnv ?? 0.5,
        // Derived features (defaults)
        risk_level: 1, // medium risk
        performance_tier: 2, // good
        weakest_subject: null,
        strongest_subject: null,
        score_range: 0.0,
        subject_balance: 0.0
      }
    }
  }

  // Calculate subject-specific scores
  const subjectScores: Record<string, number[]> = {}
  testAttempts.forEach(attempt => {
    if (attempt.subjectScores) {
      const scores = JSON.parse(attempt.subjectScores)
      Object.entries(scores).forEach(([subject, data]: [string, any]) => {
        if (!subjectScores[subject]) subjectScores[subject] = []
        if (data.total > 0) {
          const percentage = (data.correct / data.total) * 100
          const points = (percentage / 100) * 30 // Convert to 30-point scale
          subjectScores[subject].push(points)
        }
      })
    }
  })

  // Calculate averages per subject
  features.abnormal_psych_score = calculateAverage(subjectScores['Abnormal Psychology'] || [])
  features.developmental_psych_score = calculateAverage(subjectScores['Developmental Psychology'] || [])
  features.industrial_psych_score = calculateAverage(subjectScores['Industrial Psychology'] || [])
  features.psychological_assessment_score = calculateAverage(subjectScores['Psychological Assessment'] || [])

  // Overall average
  const allSubjectAverages = [
    features.abnormal_psych_score,
    features.developmental_psych_score,
    features.industrial_psych_score,
    features.psychological_assessment_score
  ].filter(v => v !== null) as number[]

  features.overall_avg_score = allSubjectAverages.length > 0
    ? allSubjectAverages.reduce((a, b) => a + b, 0) / allSubjectAverages.length
    : null

  // Score consistency (coefficient of variation)
  if (allSubjectAverages.length > 1 && features.overall_avg_score) {
    const mean = features.overall_avg_score
    const variance = allSubjectAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allSubjectAverages.length
    const stdDev = Math.sqrt(variance)
    features.score_consistency = mean > 0 ? stdDev / mean : 0
  } else {
    features.score_consistency = 0
  }

  // Improvement rate (compare pre-test vs post-test)
  const preTests = testAttempts.filter(t => t.testType === 'pre-test')
  const postTests = testAttempts.filter(t => t.testType === 'post-test')
  if (preTests.length > 0 && postTests.length > 0) {
    const preAvg = preTests.reduce((sum, t) => sum + (t.score / t.totalQuestions * 30), 0) / preTests.length
    const postAvg = postTests.reduce((sum, t) => sum + (t.score / t.totalQuestions * 30), 0) / postTests.length
    features.improvement_rate = preAvg > 0 ? (postAvg - preAvg) / preAvg : 0
  } else {
    features.improvement_rate = 0
  }

  // Test patterns
  features.total_tests_taken = testAttempts.length
  const subjectsWithTests = Object.keys(subjectScores).length
  features.avg_tests_per_subject = subjectsWithTests > 0 ? testAttempts.length / subjectsWithTests : 0
  features.test_type = testAttempts[0]?.testType === 'pre-test' ? 0 : 1

  // Study Habit Composite Scores (Chapter 4 Section 4.1.3)
  features.study_hours_per_week = preferences?.weeklyStudyGoal || 10.0
  features.active_learning_score = preferences?.habitActiveLearning ?? 
                                    preferences?.habitActiveTechniques ?? 0.5
  features.planning_score = preferences?.habitPlanning ?? 0.5
  features.discipline_score = preferences?.habitDiscipline ?? 0.5
  features.confidence_score = preferences?.habitConfidence ?? 0.5
  // Legacy fields (for backward compatibility)
  features.habitActiveTechniques = preferences?.habitActiveTechniques ?? 
                                    preferences?.habitActiveLearning ?? 0.5
  features.habitQuietEnv = preferences?.habitQuietEnv ?? 0.5

  // Derived features
  if (features.overall_avg_score) {
    // Risk level (based on quantiles: <33% = high, 33-66% = medium, >66% = low)
    const score = features.overall_avg_score
    if (score < 20) features.risk_level = 2 // high risk
    else if (score < 26) features.risk_level = 1 // medium risk
    else features.risk_level = 0 // low risk

    // Performance tier
    const percentage = (score / 30) * 100
    if (percentage >= 85) features.performance_tier = 3 // excellent
    else if (percentage >= 75) features.performance_tier = 2 // good
    else if (percentage >= 60) features.performance_tier = 1 // moderate
    else features.performance_tier = 0 // needs help
  }

  // Weakest/strongest subject
  const subjectAverages = [
    { name: 'Abnormal Psychology', score: features.abnormal_psych_score },
    { name: 'Developmental Psychology', score: features.developmental_psych_score },
    { name: 'Industrial Psychology', score: features.industrial_psych_score },
    { name: 'Psychological Assessment', score: features.psychological_assessment_score }
  ].filter(s => s.score !== null) as Array<{ name: string, score: number }>

  if (subjectAverages.length > 0) {
    const sorted = [...subjectAverages].sort((a, b) => a.score - b.score)
    features.weakest_subject = sorted[0].name
    features.strongest_subject = sorted[sorted.length - 1].name
    features.score_range = sorted[sorted.length - 1].score - sorted[0].score
  }

  // Subject balance (lower is more balanced)
  if (allSubjectAverages.length > 1) {
    const mean = features.overall_avg_score!
    const balance = allSubjectAverages.reduce((sum, val) => sum + Math.abs(val - mean), 0) / allSubjectAverages.length
    features.subject_balance = balance
  }

  return {
    status: 'calculated',
    message: `Features calculated from ${testAttempts.length} test attempts`,
    features
  }
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

