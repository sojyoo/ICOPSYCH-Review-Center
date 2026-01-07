'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, TrendingDown, Clock, Target } from 'lucide-react'

interface AtRiskAlert {
  id: string
  riskLevel: string
  riskScore: number
  predictedScore: number | null
  weeksUntilExam: number | null
  reasons: string[]
  recommendations: string[]
  isResolved: boolean
  resolvedAt: string | null
  createdAt: string
}

interface AlertStats {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  unresolved: number
}

export default function AtRiskAlerts() {
  const [alerts, setAlerts] = useState<AtRiskAlert[]>([])
  const [stats, setStats] = useState<AlertStats>({ total: 0, critical: 0, high: 0, medium: 0, low: 0, unresolved: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')

  useEffect(() => {
    loadAlerts()
  }, [filter])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter === 'unresolved') {
        params.append('resolved', 'false')
      } else if (filter === 'resolved') {
        params.append('resolved', 'true')
      }

      const response = await fetch(`/api/at-risk-alerts?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/at-risk-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, isResolved: true })
      })

      if (response.ok) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-300'
      case 'high': return 'text-orange-800 bg-orange-100 border-orange-300'
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-300'
      case 'low': return 'text-blue-800 bg-blue-100 border-blue-300'
      default: return 'text-gray-800 bg-gray-100 border-gray-300'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-6 w-6" />
      default:
        return <TrendingDown className="h-6 w-6" />
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading alerts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">At-Risk Alerts</h2>
            <p className="text-red-100">Early intervention recommendations based on your performance</p>
          </div>
          <AlertTriangle className="h-12 w-12 text-white/80" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">High</p>
          <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Medium</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Low</p>
          <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unresolved</p>
          <p className="text-2xl font-bold text-gray-900">{stats.unresolved}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-2">
          {(['all', 'unresolved', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Alerts</h3>
            <p className="text-gray-600">
              {filter === 'unresolved' 
                ? "You're doing great! No active alerts at this time."
                : "No alerts found for this filter."}
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow border-2 ${getRiskColor(alert.riskLevel)}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className={`p-3 rounded-lg ${getRiskColor(alert.riskLevel)}`}>
                      {getRiskIcon(alert.riskLevel)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-bold">
                          {alert.riskLevel.charAt(0).toUpperCase() + alert.riskLevel.slice(1)} Risk Alert
                        </h3>
                        <span className="px-2 py-1 bg-white/50 rounded text-xs font-medium">
                          {Math.round(alert.riskScore * 100)}% risk
                        </span>
                      </div>
                      {alert.predictedScore !== null && (
                        <p className="text-sm text-gray-700">
                          Predicted Score: {Math.round(alert.predictedScore)}%
                        </p>
                      )}
                      {alert.weeksUntilExam !== null && (
                        <p className="text-sm text-gray-700 flex items-center mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {alert.weeksUntilExam} weeks until exam
                        </p>
                      )}
                    </div>
                  </div>
                  {!alert.isResolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-4 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>

                {alert.reasons.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <XCircle className="h-4 w-4 mr-2" />
                      Risk Factors:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {alert.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {alert.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Recommendations:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {alert.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {alert.isResolved && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Resolved on {new Date(alert.resolvedAt!).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}




