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
    
    // Log feature vector for debugging
    console.log('📊 Feature vector calculated:', {
      overall_avg_score: featureVector.overall_avg_score,
      subject_scores: {
        abnormal: featureVector.abnormal_psych_score,
        developmental: featureVector.developmental_psych_score,
        industrial: featureVector.industrial_psych_score,
        assessment: featureVector.psychological_assessment_score
      },
      total_tests: featureVector.total_tests_taken,
      test_attempts_count: testAttempts.length
    })

    // Call ML API (Chapter 4 Section 4.6.2.A)
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
    // Render free tier can take 50+ seconds to wake up from cold start
    // Use longer timeout for first request, shorter for retries
    const timeoutDuration = Number(process.env.ML_API_TIMEOUT_MS ?? 60000) // 60 seconds for cold start
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)

    let mlPrediction: any = null
    let mlStatus = 'unavailable'

    try {
      console.log(`🔗 Calling ML API at: ${mlApiUrl} (timeout: ${timeoutDuration}ms)`)
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
        console.log('✅ ML API response successful:', mlPrediction)
        console.log('📊 ML Prediction details:', {
          riskLevel: mlPrediction.riskLevel,
          riskProbabilities: mlPrediction.riskProbabilities,
          featureVector_overall_score: featureVector.overall_avg_score
        })
      } else {
        let errorText: string
        try {
          const errorJson = await response.json()
          errorText = JSON.stringify(errorJson)
        } catch {
          errorText = await response.text()
        }
        console.error(`❌ ML API error (${response.status}):`, errorText)
        console.error(`❌ Full error details:`, {
          status: response.status,
          statusText: response.statusText,
          url: mlApiUrl,
          headers: Object.fromEntries(response.headers.entries()),
          errorText: errorText.substring(0, 1000) // Limit error text length
        })
        
        // If it's a 503, the model might not be loaded
        if (response.status === 503) {
          console.error('❌ Model not loaded on Render. Check Render logs for model loading errors.')
        }
        // If it's a 404, the endpoint might be wrong
        if (response.status === 404) {
          console.error('❌ Endpoint not found. Check if /api/predict exists on Render.')
        }
        
        mlStatus = 'error'
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏱️ ML API timeout after ${timeoutDuration}ms`)
        console.error(`⏱️ This might be a Render cold start. Try again in a few seconds.`)
        mlStatus = 'timeout'
      } else {
        console.error('❌ ML API request failed:', error)
        if (error instanceof Error) {
          console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.substring(0, 500)
          })
        }
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

    // Override ML prediction for new users (no test attempts) to medium risk
    // The ML model may predict high risk for users with 0 tests, but we should default to medium
    // since we don't have enough data to assess risk accurately
    if (testAttempts.length === 0 && mlPrediction.riskLevel === 'high') {
      console.log('⚠️ New user detected with high risk prediction. Overriding to medium risk.')
      mlPrediction = {
        ...mlPrediction,
        riskLevel: 'medium',
        riskProbabilities: {
          high: 0.2,
          medium: 0.7,
          low: 0.1
        }
      }
    }

    // CRITICAL: Test scores are the PRIMARY risk indicator
    // The ML model was trained with improvement_rate feature to recognize improvement trends
    // We trust the ML model's prediction, but apply minimal safety overrides for extreme cases
    
    const overallScore = featureVector.overall_avg_score
    const improvementRate = featureVector.improvement_rate || 0
    
    console.log(`📊 Risk Assessment:`, {
      overall_avg_score: overallScore.toFixed(2),
      improvement_rate: (improvementRate * 100).toFixed(1) + '%',
      ml_prediction: mlPrediction.riskLevel,
      ml_probabilities: mlPrediction.riskProbabilities
    })
    
    // Minimal safety overrides - only for extreme cases
    // The ML model should handle most cases through its training on improvement_rate
    if (overallScore < 10) {
      // Extreme case: Very low overall score (< 10/30 = < 33%) = HIGH RISK
      // This is a safety override to ensure critical cases are flagged
      console.log(`🚨 Safety override: Overall score is ${overallScore.toFixed(2)} (< 10). Ensuring HIGH risk.`)
      if (mlPrediction.riskLevel !== 'high') {
        mlPrediction = {
          ...mlPrediction,
          riskLevel: 'high',
          riskProbabilities: {
            high: 0.9,
            medium: 0.08,
            low: 0.02
          }
        }
      }
    } else if (overallScore >= 26 && mlPrediction.riskLevel === 'high') {
      // Safety override: High score (>= 26/30 = >= 87%) should not be high risk
      // This prevents model errors from flagging high performers as high risk
      console.log(`✅ Safety override: Overall score is ${overallScore.toFixed(2)} (>= 26). Reducing HIGH risk.`)
      mlPrediction = {
        ...mlPrediction,
        riskLevel: improvementRate > 0.1 ? 'low' : 'medium',
        riskProbabilities: {
          high: 0.1,
          medium: improvementRate > 0.1 ? 0.3 : 0.6,
          low: improvementRate > 0.1 ? 0.6 : 0.3
        }
      }
    }
    
    // Note: The ML model's improvement_rate feature should naturally recognize improvements
    // If the model isn't responding to improvements, it may need retraining with better data
    // or the improvement_rate calculation may need adjustment

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
    // Cold-start: return neutral default values (medium risk, not high)
    // Use 25.0 (out of 30) = 83.3% which represents "unknown/new user" state
    return {
      abnormal_psych_score: 25.0,
      developmental_psych_score: 25.0,
      industrial_psych_score: 25.0,
      psychological_assessment_score: 25.0,
      overall_avg_score: 25.0,
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

  // Calculate subject scores - get actual averages
  const abnormalAvg = calculateAverage(subjectScores['Abnormal Psychology'] || [])
  const developmentalAvg = calculateAverage(subjectScores['Developmental Psychology'] || [])
  const industrialAvg = calculateAverage(subjectScores['Industrial Psychology'] || [])
  const assessmentAvg = calculateAverage(subjectScores['Psychological Assessment'] || [])

  // CRITICAL: Calculate overall_avg_score ONLY from subjects with actual test data
  // This prevents default values (24.0) from masking poor performance
  // If a student gets 10% in one subject, that should be reflected, not averaged with 24.0 defaults
  const testedSubjects: number[] = []
  if (abnormalAvg !== null) testedSubjects.push(abnormalAvg)
  if (developmentalAvg !== null) testedSubjects.push(developmentalAvg)
  if (industrialAvg !== null) testedSubjects.push(industrialAvg)
  if (assessmentAvg !== null) testedSubjects.push(assessmentAvg)

  if (testedSubjects.length > 0) {
    // Use ONLY tested subjects for overall average - this is the PRIMARY risk indicator
    features.overall_avg_score = testedSubjects.reduce((a, b) => a + b, 0) / testedSubjects.length
    console.log(`📊 Overall score calculated from ${testedSubjects.length} tested subjects: ${features.overall_avg_score.toFixed(2)} (subjects: ${testedSubjects.map(s => s.toFixed(2)).join(', ')})`)
  } else {
    // No test data - use neutral default
    features.overall_avg_score = 25.0
  }

  // For ML model, still send all subject scores (use defaults for untested subjects)
  // But risk determination will prioritize overall_avg_score from tested subjects only
  features.abnormal_psych_score = abnormalAvg ?? 25.0
  features.developmental_psych_score = developmentalAvg ?? 25.0
  features.industrial_psych_score = industrialAvg ?? 25.0
  features.psychological_assessment_score = assessmentAvg ?? 25.0

  const allSubjectAverages = [
    features.abnormal_psych_score,
    features.developmental_psych_score,
    features.industrial_psych_score,
    features.psychological_assessment_score
  ]

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
  // Use 25.0 as default (medium risk) instead of 24.0 (high risk) for new users
  const score = features.overall_avg_score ?? 25.0
  if (score < 20) return 'high'
  if (score < 26) return 'medium'
  return 'low'
}

