'use client'

import { useState, useEffect } from 'react'
import { Brain, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface FeatureData {
  status: 'calculated' | 'cold_start'
  message: string
  features: Record<string, number | string | null>
}

export default function FeatureDisplay() {
  const [featureData, setFeatureData] = useState<FeatureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadFeatures()
  }, [])

  const loadFeatures = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/features')
      if (response.ok) {
        const data = await response.json()
        setFeatureData(data)
      }
    } catch (error) {
      console.error('Error loading features:', error)
    } finally {
      setLoading(false)
    }
  }

  const featureCategories = {
    'Subject Scores': [
      'abnormal_psych_score',
      'developmental_psych_score',
      'industrial_psych_score',
      'psychological_assessment_score'
    ],
    'Performance Metrics': [
      'overall_avg_score',
      'score_consistency',
      'improvement_rate'
    ],
    'Test Patterns': [
      'total_tests_taken',
      'avg_tests_per_subject',
      'test_type'
    ],
    'Study Habits': [
      'study_hours_per_week',
      'habitActiveTechniques',
      'habitQuietEnv'
    ],
    'Derived Features': [
      'risk_level',
      'performance_tier',
      'weakest_subject',
      'strongest_subject',
      'score_range',
      'subject_balance'
    ]
  }

  const getFeatureLabel = (key: string): string => {
    const labels: Record<string, string> = {
      abnormal_psych_score: 'Abnormal Psychology Score',
      developmental_psych_score: 'Developmental Psychology Score',
      industrial_psych_score: 'Industrial Psychology Score',
      psychological_assessment_score: 'Psychological Assessment Score',
      overall_avg_score: 'Overall Average Score',
      score_consistency: 'Score Consistency (CV)',
      improvement_rate: 'Improvement Rate',
      total_tests_taken: 'Total Tests Taken',
      avg_tests_per_subject: 'Average Tests per Subject',
      test_type: 'Test Type',
      study_hours_per_week: 'Study Hours per Week',
      habitActiveTechniques: 'Active Learning Techniques',
      habitQuietEnv: 'Quiet Environment Preference',
      risk_level: 'Risk Level (0=Low, 1=Medium, 2=High)',
      performance_tier: 'Performance Tier',
      weakest_subject: 'Weakest Subject',
      strongest_subject: 'Strongest Subject',
      score_range: 'Score Range',
      subject_balance: 'Subject Balance'
    }
    return labels[key] || key
  }

  const getFeatureDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      abnormal_psych_score: 'Average score across all Abnormal Psychology tests (0-30 scale)',
      developmental_psych_score: 'Average score across all Developmental Psychology tests (0-30 scale)',
      industrial_psych_score: 'Average score across all Industrial Psychology tests (0-30 scale)',
      psychological_assessment_score: 'Average score across all Psychological Assessment tests (0-30 scale)',
      overall_avg_score: 'Mean of all subject-specific scores',
      score_consistency: 'Coefficient of variation: std_dev / mean (lower = more consistent)',
      improvement_rate: 'Percentage improvement from pre-test to post-test',
      total_tests_taken: 'Total number of tests completed',
      avg_tests_per_subject: 'Average number of tests per subject',
      test_type: '0 = pre-test, 1 = post-test',
      study_hours_per_week: 'User\'s weekly study goal in hours',
      habitActiveTechniques: 'Preference for active learning (0-1 scale)',
      habitQuietEnv: 'Preference for quiet environment (0-1 scale)',
      risk_level: 'ML-derived risk classification',
      performance_tier: 'Performance category (0-3 scale)',
      weakest_subject: 'Subject with lowest average score',
      strongest_subject: 'Subject with highest average score',
      score_range: 'Difference between highest and lowest subject scores',
      subject_balance: 'Measure of score balance across subjects'
    }
    return descriptions[key] || 'Feature used in ML model prediction'
  }

  const formatFeatureValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A'
    
    if (key.includes('score') && typeof value === 'number') {
      return `${value.toFixed(1)} (${((value / 30) * 100).toFixed(1)}%)`
    }
    
    if (key === 'score_consistency' || key === 'improvement_rate' || key === 'subject_balance') {
      return typeof value === 'number' ? value.toFixed(3) : String(value)
    }
    
    if (key === 'habitActiveTechniques' || key === 'habitQuietEnv') {
      return typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : String(value)
    }
    
    if (key === 'risk_level') {
      const levels = ['Low', 'Medium', 'High']
      return typeof value === 'number' ? `${value} (${levels[value] || 'Unknown'})` : String(value)
    }
    
    if (key === 'performance_tier') {
      const tiers = ['Needs Help', 'Moderate', 'Good', 'Excellent']
      return typeof value === 'number' ? `${value} (${tiers[value] || 'Unknown'})` : String(value)
    }
    
    return String(value)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <Brain className="h-6 w-6 text-gray-400 animate-pulse" />
          <span className="ml-2 text-gray-600">Loading feature data...</span>
        </div>
      </div>
    )
  }

  if (!featureData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-4">
          <p className="text-gray-600">Unable to load feature data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Brain className="h-6 w-6 text-indigo-600 mr-2" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Feature Vector (20 Features)</h3>
            <p className="text-sm text-gray-600">
              {featureData.status === 'cold_start' 
                ? 'Cold-start: Using default values (no test history)'
                : 'Calculated from test performance and preferences'}
            </p>
          </div>
        </div>
        <button
          onClick={loadFeatures}
          className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {featureData.status === 'cold_start' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <Info className="h-4 w-4 inline mr-1" />
            Complete your first test to see calculated feature values based on your performance.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(featureCategories).map(([category, features]) => (
          <div key={category} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">{category}</h4>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{features.length} features</span>
                {expandedCategory === category ? (
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedCategory === category && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="space-y-3">
                  {features.map((featureKey) => {
                    const value = featureData.features[featureKey]
                    return (
                      <div key={featureKey} className="p-3 bg-white rounded border border-gray-200">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {getFeatureLabel(featureKey)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {getFeatureDescription(featureKey)}
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="font-semibold text-indigo-600">
                              {formatFeatureValue(featureKey, value)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-indigo-600 mr-2 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <p className="font-medium mb-1">About Feature Engineering</p>
            <p>
              These 20 features are calculated from your test scores, preferences, and performance patterns. 
              They are sent to the ML model (Random Forest) to generate risk level predictions and personalized recommendations. 
              This aligns with Chapter 4 Section 4.1 of the thesis.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


