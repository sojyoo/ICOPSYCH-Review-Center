import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

/**
 * ML Prediction Endpoint
 * Calls the ML API to get risk level predictions based on user's feature vector
 * This aligns with Chapter 4 Section 4.6.2.A
 * 
 * Note: Feature vector contains only numeric values (no string fields)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's test attempts to calculate features
    const testAttempts = await prisma.testAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: 'desc' },
      take: 20
    })

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id }
    })

    // Calculate feature vector (20 features as described in Chapter 4)
    const featureVector = await calculateFeatureVector(testAttempts, preferences)

    // Call ML API (Chapter 4 Section 4.6.2.A)
    // Base URL: https://ml-recommendations-api.onrender.com
    // Endpoint: /api/predict (defined in ml_recommendations_api.py)
    const mlApiBaseUrl = process.env.ML_API_BASE_URL || 'https://ml-recommendations-api.onrender.com'
    const mlApiEndpoint = process.env.ML_API_ENDPOINT || '/api/predict'
    const mlApiUrl = `${mlApiBaseUrl}${mlApiEndpoint}`
    const timeoutDuration = Number(process.env.ML_API_TIMEOUT_MS ?? 5000)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

    let mlPrediction: any = null
    let mlStatus = 'unavailable'

    try {
      const response = await fetch(mlApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          features: featureVector
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        mlPrediction = await response.json()
        mlStatus = 'available'
      } else {
        mlStatus = 'error'
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        mlStatus = 'timeout'
      } else {
        mlStatus = 'error'
      }
    }

    // Fallback to rule-based risk level if ML unavailable
    if (!mlPrediction) {
      const riskLevel = calculateRuleBasedRiskLevel(featureVector)
      mlPrediction = {
        riskLevel,
        riskProbabilities: {
          high: riskLevel === 'high' ? 0.7 : riskLevel === 'medium' ? 0.2 : 0.1,
          medium: riskLevel === 'medium' ? 0.7 : riskLevel === 'high' ? 0.2 : 0.1,
          low: riskLevel === 'low' ? 0.7 : riskLevel === 'medium' ? 0.2 : 0.1
        },
        subjectRecommendations: [],
        topicPriorities: []
      }
    }

    return NextResponse.json({
      riskLevel: mlPrediction.riskLevel || 'medium',
      riskProbabilities: mlPrediction.riskProbabilities || {},
      subjectRecommendations: mlPrediction.subjectRecommendations || [],
      topicPriorities: mlPrediction.topicPriorities || [],
      mlStatus,
      featureVector,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error getting ML prediction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

async function calculateFeatureVector(testAttempts: any[], preferences: any) {
  const features: Record<string, number> = {}

  if (testAttempts.length === 0) {
    // Cold-start: return default values
    return {
      abnormal_psych_score: 24.0,
      developmental_psych_score: 24.0,
      industrial_psych_score: 24.0,
      psychological_assessment_score: 24.0,
      overall_avg_score: 24.0,
      score_consistency: 0.08,
      improvement_rate: 0.0,
      total_tests_taken: 0,
      avg_tests_per_subject: 0.0,
      test_type: 0,
      study_hours_per_week: preferences?.weeklyStudyGoal || 10.0,
      // Study Habit Composite Scores (Chapter 4 Section 4.1.3)
      active_learning_score: preferences?.habitActiveLearning ?? 
                             preferences?.habitActiveTechniques ?? 0.5,
      planning_score: preferences?.habitPlanning ?? 0.5,
      discipline_score: preferences?.habitDiscipline ?? 0.5,
      confidence_score: preferences?.habitConfidence ?? 0.5,
      // Legacy fields (for backward compatibility)
      habitActiveTechniques: preferences?.habitActiveTechniques ?? 
                              preferences?.habitActiveLearning ?? 0.5,
      habitQuietEnv: preferences?.habitQuietEnv ?? 0.5,
      risk_level: 1,
      performance_tier: 2,
      score_range: 0.0,
      subject_balance: 0.0
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

  // Score consistency
  const mean = features.overall_avg_score
  const variance = allSubjectAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allSubjectAverages.length
  const stdDev = Math.sqrt(variance)
  features.score_consistency = mean > 0 ? stdDev / mean : 0

  // Improvement rate
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

  // Risk level
  const score = features.overall_avg_score
  if (score < 20) features.risk_level = 2
  else if (score < 26) features.risk_level = 1
  else features.risk_level = 0

  // Performance tier
  const percentage = (score / 30) * 100
  if (percentage >= 85) features.performance_tier = 3
  else if (percentage >= 75) features.performance_tier = 2
  else if (percentage >= 60) features.performance_tier = 1
  else features.performance_tier = 0

  const subjectAverages = [
    { name: 'Abnormal Psychology', score: features.abnormal_psych_score },
    { name: 'Developmental Psychology', score: features.developmental_psych_score },
    { name: 'Industrial Psychology', score: features.industrial_psych_score },
    { name: 'Psychological Assessment', score: features.psychological_assessment_score }
  ]

  if (subjectAverages.length > 0) {
    const sorted = [...subjectAverages].sort((a, b) => a.score - b.score)
    // Note: weakest_subject and strongest_subject are not included in the feature vector
    // as they are strings, not numeric features. The ML model only uses numeric features.
    // Only numeric features are included in the feature vector for the ML API.
    features.score_range = sorted[sorted.length - 1].score - sorted[0].score
  }

  const balance = allSubjectAverages.reduce((sum, val) => sum + Math.abs(val - mean), 0) / allSubjectAverages.length
  features.subject_balance = balance

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

