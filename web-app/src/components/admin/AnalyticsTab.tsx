'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface Analytics {
  overall: {
    totalUsers: number
    activeUsers: number
    totalTests: number
    overallAverageScore: number
    recentActivity: number
  }
  cohortPerformance: Array<{
    name: string
    totalUsers: number
    totalTests: number
    averageScore: number
    completionRate: number
  }>
  questionStats: Array<{
    id: string
    subject: string
    difficulty: string
    totalAttempts: number
    correctAttempts: number
    successRate: number
  }>
  testTypeBreakdown: {
    'pre-test': number
    'post-test': number
    'mock-exam': number
  }
  subjectPerformance: Array<{
    subject: string
    averageScore: number
    totalQuestions: number
    correctAnswers: number
  }>
}

export default function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!analytics) return

    // Create CSV content
    let csv = 'Analytics Report\n\n'
    csv += 'Overall Statistics\n'
    csv += `Total Users,${analytics.overall.totalUsers}\n`
    csv += `Active Users,${analytics.overall.activeUsers}\n`
    csv += `Total Tests,${analytics.overall.totalTests}\n`
    csv += `Average Score,${analytics.overall.overallAverageScore}%\n`
    csv += `Recent Activity (30 days),${analytics.overall.recentActivity}\n\n`

    csv += 'Cohort Performance\n'
    csv += 'Cohort,Total Users,Total Tests,Average Score,Completion Rate\n'
    analytics.cohortPerformance.forEach(c => {
      csv += `${c.name},${c.totalUsers},${c.totalTests},${c.averageScore}%,${c.completionRate}%\n`
    })
    csv += '\n'

    csv += 'Subject Performance\n'
    csv += 'Subject,Average Score,Total Questions,Correct Answers\n'
    analytics.subjectPerformance.forEach(s => {
      csv += `${s.subject},${s.averageScore}%,${s.totalQuestions},${s.correctAnswers}\n`
    })

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{analytics.overall.totalUsers}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{analytics.overall.activeUsers}</div>
          <div className="text-sm text-gray-600">Active Users</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{analytics.overall.totalTests}</div>
          <div className="text-sm text-gray-600">Total Tests</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{analytics.overall.overallAverageScore}%</div>
          <div className="text-sm text-gray-600">Avg Score</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-indigo-600">{analytics.overall.recentActivity}</div>
          <div className="text-sm text-gray-600">Recent Activity</div>
        </div>
      </div>

      {/* Cohort Performance */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cohort Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.cohortPerformance.map((cohort, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cohort.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cohort.totalUsers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cohort.totalTests}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cohort.averageScore}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cohort.completionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Questions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.subjectPerformance.map((subject, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subject.averageScore}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subject.totalQuestions}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subject.correctAnswers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Type Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Type Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.testTypeBreakdown['pre-test']}</div>
            <div className="text-sm text-gray-600">Pre-Tests</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.testTypeBreakdown['post-test']}</div>
            <div className="text-sm text-gray-600">Post-Tests</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{analytics.testTypeBreakdown['mock-exam']}</div>
            <div className="text-sm text-gray-600">Mock Exams</div>
          </div>
        </div>
      </div>
    </div>
  )
}





