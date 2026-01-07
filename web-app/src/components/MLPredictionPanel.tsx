'use client'

import { useState, useEffect } from 'react'
import { Brain, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, CheckCircle } from 'lucide-react'

interface MLPrediction {
  riskLevel: 'high' | 'medium' | 'low'
  riskProbabilities: {
    high: number
    medium: number
    low: number
  }
  subjectRecommendations: Array<{
    subject: string
    priority: 'high' | 'medium' | 'low'
    recommendedHours: number
  }>
  mlStatus: 'available' | 'unavailable' | 'error' | 'timeout'
  timestamp: string
}

interface MLPredictionPanelProps {
  testScore: number
  totalQuestions: number
  testType: string
  weekNumber: number
}

export default function MLPredictionPanel({ testScore, totalQuestions, testType, weekNumber }: MLPredictionPanelProps) {
  const [prediction, setPrediction] = useState<MLPrediction | null>(null)
  const [previousPrediction, setPreviousPrediction] = useState<MLPrediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPredictions()
  }, [testScore, totalQuestions])

  const loadPredictions = async () => {
    try {
      setLoading(true)
      // Get current prediction
      const currentResponse = await fetch('/api/ml/predict')
      if (currentResponse.ok) {
        const current = await currentResponse.json()
        setPrediction(current)
      }

      // Try to get previous prediction from localStorage (before this test)
      const previousData = localStorage.getItem('previousMLPrediction')
      if (previousData) {
        setPreviousPrediction(JSON.parse(previousData))
      }
    } catch (error) {
      console.error('Error loading ML predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Store current prediction as previous for next test
  useEffect(() => {
    if (prediction) {
      localStorage.setItem('previousMLPrediction', JSON.stringify(prediction))
    }
  }, [prediction])

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'low': return 'bg-green-50 border-green-200 text-green-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high': return 'High Risk'
      case 'medium': return 'Medium Risk'
      case 'low': return 'Low Risk'
      default: return 'Unknown'
    }
  }

  const getRiskChange = () => {
    if (!previousPrediction || !prediction) return null

    const riskOrder = { low: 0, medium: 1, high: 2 }
    const currentOrder = riskOrder[prediction.riskLevel]
    const previousOrder = riskOrder[previousPrediction.riskLevel as keyof typeof riskOrder]

    if (currentOrder < previousOrder) {
      return {
        type: 'improved',
        message: `Risk level improved from ${previousPrediction.riskLevel} to ${prediction.riskLevel}`,
        icon: TrendingDown
      }
    } else if (currentOrder > previousOrder) {
      return {
        type: 'worsened',
        message: `Risk level changed from ${previousPrediction.riskLevel} to ${prediction.riskLevel}`,
        icon: TrendingUp
      }
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 p-6 mb-8">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mr-3" />
          <span className="text-indigo-700 font-medium">Analyzing performance with ML model...</span>
        </div>
      </div>
    )
  }

  if (!prediction) {
    return null
  }

  const riskChange = getRiskChange()
  const percentage = Math.round((testScore / totalQuestions) * 100)

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 p-6 mb-8">
      <div className="flex items-center mb-4">
        <Brain className="h-6 w-6 text-indigo-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">ML Model Analysis</h3>
        {prediction.mlStatus === 'available' && (
          <span className="ml-auto px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
            ML-Powered
          </span>
        )}
      </div>

      {/* Before/After Comparison */}
      {previousPrediction && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(previousPrediction.riskLevel)}`}>
            <div className="text-sm font-medium mb-2 opacity-75">Before This Test</div>
            <div className="text-2xl font-bold">{getRiskLabel(previousPrediction.riskLevel)}</div>
            <div className="text-xs mt-1 opacity-75">
              Confidence: {Math.round(Math.max(...Object.values(previousPrediction.riskProbabilities)) * 100)}%
            </div>
          </div>
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(prediction.riskLevel)}`}>
            <div className="text-sm font-medium mb-2 opacity-75">After This Test</div>
            <div className="text-2xl font-bold">{getRiskLabel(prediction.riskLevel)}</div>
            <div className="text-xs mt-1 opacity-75">
              Confidence: {Math.round(Math.max(...Object.values(prediction.riskProbabilities)) * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Risk Change Indicator */}
      {riskChange && (
        <div className={`p-4 rounded-lg mb-4 ${
          riskChange.type === 'improved' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        } border-2`}>
          <div className="flex items-center">
            <riskChange.icon className={`h-5 w-5 mr-2 ${
              riskChange.type === 'improved' ? 'text-green-600' : 'text-yellow-600'
            }`} />
            <div>
              <div className={`font-medium ${
                riskChange.type === 'improved' ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {riskChange.type === 'improved' ? 'Improvement Detected!' : 'Risk Level Changed'}
              </div>
              <div className={`text-sm ${
                riskChange.type === 'improved' ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {riskChange.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Risk Level */}
      {!previousPrediction && (
        <div className={`p-4 rounded-lg border-2 mb-4 ${getRiskColor(prediction.riskLevel)}`}>
          <div className="text-sm font-medium mb-2 opacity-75">Current Risk Assessment</div>
          <div className="text-2xl font-bold mb-2">{getRiskLabel(prediction.riskLevel)}</div>
          <div className="text-sm opacity-75">
            Based on your test score of {percentage}% and performance patterns
          </div>
        </div>
      )}

      {/* Risk Probabilities */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Risk Level Probabilities</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">High Risk:</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${prediction.riskProbabilities.high * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium w-12 text-right">
                {Math.round(prediction.riskProbabilities.high * 100)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Medium Risk:</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${prediction.riskProbabilities.medium * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium w-12 text-right">
                {Math.round(prediction.riskProbabilities.medium * 100)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Low Risk:</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${prediction.riskProbabilities.low * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium w-12 text-right">
                {Math.round(prediction.riskProbabilities.low * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Recommendations */}
      {prediction.subjectRecommendations && prediction.subjectRecommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-indigo-200">
          <div className="text-sm font-medium text-gray-700 mb-2">ML Subject Recommendations</div>
          <div className="space-y-2">
            {prediction.subjectRecommendations.map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-sm text-gray-700">{rec.subject}</span>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rec.priority} priority
                  </span>
                  <span className="text-xs text-gray-600">{rec.recommendedHours}h/week</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ML Status Footer */}
      <div className="mt-4 pt-4 border-t border-indigo-200 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center">
          <Brain className="h-4 w-4 mr-1" />
          <span>
            {prediction.mlStatus === 'available' 
              ? 'Powered by Random Forest ML Model' 
              : 'Using rule-based fallback'}
          </span>
        </div>
        <span>Updated: {new Date(prediction.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}


