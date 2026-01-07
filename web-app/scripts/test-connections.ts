#!/usr/bin/env ts-node
/**
 * Test script to verify connections before deployment
 * Tests:
 * 1. Database connection (Neon PostgreSQL)
 * 2. ML API connection (Render)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection (Neon PostgreSQL)...\n')
  
  try {
    // Test 1: Basic connection
    await prisma.$connect()
    console.log('✅ Database connection: SUCCESS')
    
    // Test 2: Query database
    const userCount = await prisma.user.count()
    console.log(`✅ Database query: SUCCESS (Found ${userCount} users)`)
    
    // Test 3: Check if new columns exist (for study habits)
    const preferences = await prisma.userPreferences.findFirst()
    if (preferences) {
      const hasNewFields = 
        preferences.habitActiveLearning !== null ||
        preferences.habitPlanning !== null ||
        preferences.habitDiscipline !== null ||
        preferences.habitConfidence !== null
      
      if (hasNewFields) {
        console.log('✅ New study habit fields: PRESENT')
      } else {
        console.log('⚠️  New study habit fields: NOT FOUND (may need migration)')
      }
    } else {
      console.log('ℹ️  No preferences found (this is OK for empty database)')
    }
    
    // Test 4: Database info
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl) {
      if (dbUrl.includes('neon')) {
        console.log('✅ Database provider: Neon PostgreSQL')
      } else if (dbUrl.includes('file:')) {
        console.log('⚠️  Database provider: SQLite (local dev)')
      } else {
        console.log(`ℹ️  Database provider: ${dbUrl.includes('postgres') ? 'PostgreSQL' : 'Unknown'}`)
      }
    }
    
    return true
  } catch (error: any) {
    console.error('❌ Database connection: FAILED')
    console.error(`   Error: ${error.message}`)
    if (error.code === 'P1001') {
      console.error('   → Cannot reach database server. Check DATABASE_URL.')
    } else if (error.code === 'P1000') {
      console.error('   → Authentication failed. Check database credentials.')
    } else if (error.code === 'P2022') {
      console.error('   → Column does not exist. Run migrations: npx prisma migrate deploy')
    }
    return false
  } finally {
    await prisma.$disconnect()
  }
}

async function testMLAPIConnection() {
  console.log('\n🔍 Testing ML API Connection (Render)...\n')
  
  const mlApiUrl = process.env.ML_API_URL || 'https://ml-recommendations-api.onrender.com/api/predict'
  
  try {
    // Test 1: Health check (if available)
    const healthUrl = mlApiUrl.replace('/api/predict', '/health')
    try {
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        console.log('✅ ML API health check: SUCCESS')
        console.log(`   Model loaded: ${healthData.model_loaded ? 'Yes' : 'No'}`)
      } else {
        console.log('⚠️  ML API health check: Endpoint not available')
      }
    } catch (error) {
      console.log('⚠️  ML API health check: Not available (this is OK)')
    }
    
    // Test 2: Test /api/predict endpoint with dummy data
    const testFeatures = {
      userId: 'test-user',
      features: {
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
        study_hours_per_week: 10.0,
        active_learning_score: 0.5,
        planning_score: 0.5,
        discipline_score: 0.5,
        confidence_score: 0.5,
        risk_level: 1,
        performance_tier: 2,
        weakest_subject: null,
        strongest_subject: null,
        score_range: 0.0,
        subject_balance: 0.0
      }
    }
    
    const response = await fetch(mlApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFeatures),
      signal: AbortSignal.timeout(10000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ ML API /api/predict: SUCCESS')
      console.log(`   Risk Level: ${data.riskLevel || 'N/A'}`)
      console.log(`   Status: ${data.mlStatus || 'N/A'}`)
      return true
    } else if (response.status === 404) {
      console.error('❌ ML API /api/predict: NOT FOUND (404)')
      console.error('   → The /api/predict endpoint does not exist yet.')
      console.error('   → Make sure you\'ve deployed the updated ml_recommendations_api.py')
      return false
    } else {
      console.error(`❌ ML API /api/predict: FAILED (${response.status})`)
      const errorText = await response.text()
      console.error(`   Error: ${errorText.substring(0, 200)}`)
      return false
    }
  } catch (error: any) {
    console.error('❌ ML API connection: FAILED')
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.error('   → Request timed out. ML API may be sleeping (free tier).')
    } else if (error.message.includes('fetch')) {
      console.error('   → Cannot reach ML API. Check ML_API_URL and network.')
    } else {
      console.error(`   Error: ${error.message}`)
    }
    return false
  }
}

async function main() {
  console.log('🚀 Connection Test Suite\n')
  console.log('=' .repeat(50))
  
  const dbSuccess = await testDatabaseConnection()
  const mlSuccess = await testMLAPIConnection()
  
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Test Results Summary:\n')
  console.log(`   Database (Neon):     ${dbSuccess ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   ML API (Render):     ${mlSuccess ? '✅ PASS' : '❌ FAIL'}`)
  
  if (dbSuccess && mlSuccess) {
    console.log('\n✅ All connections verified! Ready to deploy.')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some connections failed. Fix issues before deploying.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

