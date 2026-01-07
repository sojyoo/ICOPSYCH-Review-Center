// Test script to check ML API connection
const ML_API_URL = process.env.ML_API_URL || 'https://ml-recommendations-api.onrender.com'

async function testMLAPI() {
  console.log('Testing ML API connection...')
  console.log('Base URL:', ML_API_URL)
  
  // Test health endpoint
  try {
    console.log('\n1. Testing /health endpoint...')
    const healthResponse = await fetch(`${ML_API_URL}/health`)
    const healthData = await healthResponse.json()
    console.log('✅ Health check:', healthData)
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
  }
  
  // Test /api/predict endpoint
  try {
    console.log('\n2. Testing /api/predict endpoint...')
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
    
    const predictResponse = await fetch(`${ML_API_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user',
        features: testFeatures
      })
    })
    
    if (predictResponse.ok) {
      const predictData = await predictResponse.json()
      console.log('✅ /api/predict response:', predictData)
    } else {
      const errorText = await predictResponse.text()
      console.error(`❌ /api/predict failed (${predictResponse.status}):`, errorText)
    }
  } catch (error) {
    console.error('❌ /api/predict request failed:', error.message)
  }
  
  // Test /recommendations endpoint
  try {
    console.log('\n3. Testing /recommendations endpoint...')
    const testSubjectScores = {
      'Abnormal Psychology': { percentage: 70 },
      'Developmental Psychology': { percentage: 65 },
      'Industrial Psychology': { percentage: 75 },
      'Psychological Assessment': { percentage: 68 }
    }
    
    const recResponse = await fetch(`${ML_API_URL}/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subjectScores: testSubjectScores,
        testType: 'pre-test'
      })
    })
    
    if (recResponse.ok) {
      const recData = await recResponse.json()
      console.log('✅ /recommendations response:', recData)
    } else {
      const errorText = await recResponse.text()
      console.error(`❌ /recommendations failed (${recResponse.status}):`, errorText)
    }
  } catch (error) {
    console.error('❌ /recommendations request failed:', error.message)
  }
}

testMLAPI().catch(console.error)

