'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Brain, RefreshCw } from 'lucide-react'

interface RiskLevelData {
  riskLevel: 'high' | 'medium' | 'low'
  riskProbabilities: {
    high: number
    medium: number
    low: number
  }
  mlStatus: 'available' | 'unavailable' | 'error' | 'timeout'
  timestamp: string
}

export default function RiskLevelCard() {
  const [riskData, setRiskData] = useState<RiskLevelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [previousRiskLevel, setPreviousRiskLevel] = useState<string | null>(null)

  useEffect(() => {
    loadRiskLevel()
    // Refresh every 30 seconds
    const interval = setInterval(loadRiskLevel, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadRiskLevel = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ml/predict')
      if (response.ok) {
        const data = await response.json()
        // Store previous risk level for comparison
        if (riskData) {
          setPreviousRiskLevel(riskData.riskLevel)
        }
        setRiskData(data)
      }
    } catch (error) {
      console.error('Error loading risk level:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800'
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'low': return 'bg-green-100 border-green-300 text-green-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-8 w-8" />
      case 'medium': return <AlertTriangle className="h-8 w-8" />
      case 'low': return <TrendingUp className="h-8 w-8" />
      default: return <Brain className="h-8 w-8" />
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

  const getChangeIndicator = () => {
    if (!previousRiskLevel || !riskData) return null
    
    const riskOrder = { low: 0, medium: 1, high: 2 }
    const currentOrder = riskOrder[riskData.riskLevel]
    const previousOrder = riskOrder[previousRiskLevel as keyof typeof riskOrder]
    
    if (currentOrder < previousOrder) {
      return (
        <div className="flex items-center text-green-600 text-sm mt-2">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span>Improved from {previousRiskLevel} risk</span>
        </div>
      )
    } else if (currentOrder > previousOrder) {
      return (
        <div className="flex items-center text-red-600 text-sm mt-2">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>Changed from {previousRiskLevel} risk</span>
        </div>
      )
    }
    return null
  }

  if (loading && !riskData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">Loading risk assessment...</span>
        </div>
      </div>
    )
  }

  if (!riskData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-4">
          <p className="text-gray-600">Complete a test to see your risk level assessment</p>
        </div>
      </div>
    )
  }

  const highestProbability = Math.max(
    riskData.riskProbabilities.high,
    riskData.riskProbabilities.medium,
    riskData.riskProbabilities.low
  )

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 ${getRiskColor(riskData.riskLevel)} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="mr-3">
            {getRiskIcon(riskData.riskLevel)}
          </div>
          <div>
            <h3 className="text-lg font-semibold">ML Risk Assessment</h3>
            <p className="text-sm opacity-75">Machine Learning Prediction</p>
          </div>
        </div>
        <button
          onClick={loadRiskLevel}
          disabled={loading}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          title="Refresh risk assessment"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="text-center mb-4">
        <div className="text-4xl font-bold mb-2">{getRiskLabel(riskData.riskLevel)}</div>
        <div className="text-sm opacity-75">
          Confidence: {Math.round(highestProbability * 100)}%
        </div>
        {getChangeIndicator()}
      </div>

      {/* Risk Probabilities */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span>High Risk:</span>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${riskData.riskProbabilities.high * 100}%` }}
              ></div>
            </div>
            <span className="font-medium w-12 text-right">
              {Math.round(riskData.riskProbabilities.high * 100)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Medium Risk:</span>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${riskData.riskProbabilities.medium * 100}%` }}
              ></div>
            </div>
            <span className="font-medium w-12 text-right">
              {Math.round(riskData.riskProbabilities.medium * 100)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Low Risk:</span>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${riskData.riskProbabilities.low * 100}%` }}
              ></div>
            </div>
            <span className="font-medium w-12 text-right">
              {Math.round(riskData.riskProbabilities.low * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ML Status Indicator */}
      <div className="flex items-center justify-between text-xs pt-4 border-t border-current/20">
        <div className="flex items-center">
          <Brain className="h-4 w-4 mr-1" />
          <span>
            {riskData.mlStatus === 'available' ? (
              <span className="text-green-600 font-medium">ML-Powered</span>
            ) : riskData.mlStatus === 'error' ? (
              <span className="text-orange-600" title="ML API returned an error (404 or other). Using rule-based fallback.">
                Rule-Based Fallback (ML API Error)
              </span>
            ) : riskData.mlStatus === 'timeout' ? (
              <span className="text-orange-600" title="ML API request timed out. Using rule-based fallback.">
                Rule-Based Fallback (Timeout)
              </span>
            ) : (
              <span className="text-orange-600" title="ML API is unavailable. Using rule-based fallback.">
                Rule-Based Fallback
              </span>
            )}
          </span>
        </div>
        <span className="opacity-75">
          Updated: {new Date(riskData.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}


