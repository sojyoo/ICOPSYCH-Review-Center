import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to diagnose ML API connection issues
 */
export async function GET(request: NextRequest) {
  try {
    // Construct ML API URL (same logic as predict route)
    let mlApiUrl: string
    if (process.env.ML_API_URL) {
      const baseUrl = process.env.ML_API_URL.replace(/\/recommendations$/, '').replace(/\/$/, '')
      mlApiUrl = `${baseUrl}/api/predict`
    } else {
      const mlApiBaseUrl = process.env.ML_API_BASE_URL || 'https://ml-recommendations-api.onrender.com'
      const mlApiEndpoint = process.env.ML_API_ENDPOINT || '/api/predict'
      mlApiUrl = `${mlApiBaseUrl}${mlApiEndpoint}`
    }

    const results: any = {
      mlApiUrl,
      timestamp: new Date().toISOString(),
      tests: []
    }

    // Test 1: Health check
    try {
      const healthUrl = mlApiUrl.replace('/api/predict', '/health')
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      })
      const healthData = await healthResponse.json()
      results.tests.push({
        test: 'Health Check',
        url: healthUrl,
        status: healthResponse.status,
        success: healthResponse.ok,
        data: healthData
      })
    } catch (error: any) {
      results.tests.push({
        test: 'Health Check',
        error: error.message,
        success: false
      })
    }

    // Test 2: /api/predict endpoint
    try {
      const testFeatures = {
        abnormal_psych_score: 24.0,
        developmental_psych_score: 24.0,
        industrial_psych_score: 24.0,
        psychological_assessment_score: 24.0,
        overall_avg_score: 24.0,
        score_consistency: 0.08,
        improvement_rate: 0.0,
        total_tests_taken: 5,
        avg_tests_per_subject: 1.25,
        test_type: 0,
        study_hours_per_week: 10.0,
        active_learning_score: 0.5,
        planning_score: 0.5,
        discipline_score: 0.5,
        confidence_score: 0.5,
        habitActiveTechniques: 0.5,
        habitQuietEnv: 0.5,
        risk_level: 1,
        performance_tier: 2,
        score_range: 0.0,
        subject_balance: 0.0
      }

      const predictResponse = await fetch(mlApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user',
          features: testFeatures
        }),
        signal: AbortSignal.timeout(60000)
      })

      let responseData: any = null
      try {
        responseData = await predictResponse.json()
      } catch {
        responseData = await predictResponse.text()
      }

      results.tests.push({
        test: '/api/predict',
        url: mlApiUrl,
        status: predictResponse.status,
        statusText: predictResponse.statusText,
        success: predictResponse.ok,
        data: responseData
      })
    } catch (error: any) {
      results.tests.push({
        test: '/api/predict',
        error: error.message,
        errorName: error.name,
        success: false
      })
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

