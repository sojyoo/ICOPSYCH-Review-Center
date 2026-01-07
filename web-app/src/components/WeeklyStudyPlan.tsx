'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, Target, AlertCircle, CheckCircle, TrendingUp, ChevronLeft, ChevronRight, Brain, Plus } from 'lucide-react'

interface StudyTask {
  day: string
  date: string
  timeSlots: Array<{
    startTime: string
    endTime: string
    duration: number
    topic: string
    subject: string
    type: 'review' | 'practice' | 'lecture' | 'prep'
    description: string
    priority: 'high' | 'medium' | 'low'
  }>
  totalHours: number
}

interface WeeklyStudyPlan {
  week: number
  weekTitle: string
  weekDate: string
  currentWeekTopic: string
  recommendedHours: number
  recommendationIntensity?: string
  mlRiskLevel?: string | null
  mlStatus?: string
  mlRecommendations?: any
  totalAvailableHours?: number
  weeklyStudyGoal?: number
  userPerformance: {
    currentWeekSubject: {
      subject: string
      score: number
      status: 'strong' | 'moderate' | 'weak'
    }
    weakSubjects: Array<{
      subject: string
      score: number
      priority: 'high' | 'medium'
    }>
  }
  dailyPlan: StudyTask[]
  upcomingTests: Array<{
    type: string
    date: string
    subjects: string[]
  }>
  progress: {
    completedHours: number
    totalHours: number
    completionRate: number
  }
}

export default function WeeklyStudyPlanComponent() {
  const [plan, setPlan] = useState<WeeklyStudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<{topic: string, subject: string, description: string, startTime: string, endTime: string, duration: number} | null>(null)

  useEffect(() => {
    loadPlan(currentWeek)
  }, [currentWeek])

  const loadPlan = async (week: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/study-plan/weekly?week=${week}`)
      if (response.ok) {
        const data = await response.json()
        setPlan(data.plan)
      }
    } catch (error) {
      console.error('Error loading study plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'strong': return 'text-green-600 bg-green-100'
      case 'moderate': return 'text-yellow-600 bg-yellow-100'
      case 'weak': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50'
      case 'medium': return 'border-yellow-300 bg-yellow-50'
      case 'low': return 'border-green-300 bg-green-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const handleLogSession = async (sessionData: any) => {
    try {
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })

      if (response.ok) {
        setShowLogModal(false)
        setSelectedActivity(null)
        // Refresh the page to update stats
        window.location.reload()
      } else {
        alert('Failed to log session')
      }
    } catch (error) {
      console.error('Error logging session:', error)
      alert('Error logging session')
    }
  }

  const handleLogFromActivity = (slot: any, day: StudyTask) => {
    // Calculate actual start/end times based on the day's date and slot times
    const dayDate = new Date(day.date)
    const [startHour, startMin] = slot.startTime.split(':').map(Number)
    const [endHour, endMin] = slot.endTime.split(':').map(Number)
    
    const startDateTime = new Date(dayDate)
    startDateTime.setHours(startHour, startMin, 0, 0)
    
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + slot.duration)
    
    setSelectedActivity({
      topic: slot.topic,
      subject: slot.subject,
      description: slot.description,
      startTime: startDateTime.toISOString().slice(0, 16),
      endTime: endDateTime.toISOString().slice(0, 16),
      duration: slot.duration
    })
    setShowLogModal(true)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return '📚'
      case 'practice': return '✏️'
      case 'review': return '📖'
      case 'prep': return '🎯'
      default: return '📝'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Generating your weekly study plan...</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Unable to load study plan</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Week {plan.week}: {plan.weekTitle}
            </h2>
            <p className="text-indigo-100">{plan.weekDate}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
              className="p-2 hover:bg-white/20 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-3 py-1 bg-white/20 rounded">Week {currentWeek}</span>
            <button
              onClick={() => setCurrentWeek(Math.min(18, currentWeek + 1))}
              className="p-2 hover:bg-white/20 rounded"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">{plan.recommendedHours}h</div>
            <div className="text-sm text-indigo-100">Recommended Study Time</div>
            {plan.recommendationIntensity && (
              <div className="text-xs text-indigo-200 mt-1">{plan.recommendationIntensity}</div>
            )}
            {plan.totalAvailableHours !== undefined && plan.weeklyStudyGoal !== undefined && (
              <div className="text-xs text-indigo-200 mt-2 pt-2 border-t border-white/20">
                Available: {plan.totalAvailableHours}h | Goal: {plan.weeklyStudyGoal}h
              </div>
            )}
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">{plan.progress.completionRate}%</div>
            <div className="text-sm text-indigo-100">Progress</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">{plan.upcomingTests.length}</div>
            <div className="text-sm text-indigo-100">Upcoming Tests</div>
          </div>
        </div>

        {/* ML Influence Indicator */}
        {plan.mlRiskLevel && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Brain className="h-4 w-4 mr-2" />
                <span className="text-sm text-indigo-100">
                  ML Risk Level: <span className="font-semibold capitalize">{plan.mlRiskLevel}</span>
                </span>
              </div>
              {plan.mlStatus === 'available' && (
                <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                  ML-Powered
                </span>
              )}
            </div>
            {plan.recommendationIntensity && (
              <div className="text-xs text-indigo-200 mt-2">
                Recommendation intensity based on ML prediction: {plan.recommendationIntensity}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Performance</h3>
        <div className="space-y-4">
          <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700">Current Week Topic: {plan.userPerformance.currentWeekSubject.subject}</span>
                        {plan.mlRiskLevel && plan.mlStatus === 'available' && (
                          <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full flex items-center">
                            <Brain className="h-3 w-3 mr-1" />
                            ML
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.userPerformance.currentWeekSubject.status)}`}>
                        {Math.round(plan.userPerformance.currentWeekSubject.score)}% - {plan.userPerformance.currentWeekSubject.status}
                      </span>
                    </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  plan.userPerformance.currentWeekSubject.score >= 80 ? 'bg-green-500' :
                  plan.userPerformance.currentWeekSubject.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, plan.userPerformance.currentWeekSubject.score)}%` }}
              ></div>
            </div>
          </div>

          {plan.userPerformance.weakSubjects.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Weak Subjects (Need Attention):</p>
              <div className="space-y-2">
                {plan.userPerformance.weakSubjects.map((ws, idx) => {
                  const isMLIdentified = plan.mlRecommendations?.weakSubjects?.includes(ws.subject) || 
                                        plan.mlRecommendations?.recommendations?.some((r: any) => r.subject === ws.subject && r.priority === 'high')
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">{ws.subject}</span>
                        {isMLIdentified && plan.mlStatus === 'available' && (
                          <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded flex items-center">
                            <Brain className="h-3 w-3 mr-1" />
                            ML
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        ws.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {Math.round(ws.score)}% - {ws.priority} priority
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Tests */}
      {plan.upcomingTests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="font-semibold text-yellow-900">Upcoming Tests</h3>
          </div>
          <div className="space-y-2">
            {plan.upcomingTests.map((test, idx) => (
              <div key={idx} className="text-sm text-yellow-800">
                <span className="font-medium">{test.type.replace('-', ' ').toUpperCase()}</span>
                {' '}on {new Date(test.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                {' '}({test.subjects.join(', ')})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Plan */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Daily Study Plan</h3>
        {plan.dailyPlan.map((day, dayIdx) => (
          <div key={dayIdx} className="bg-white rounded-lg shadow border-l-4 border-indigo-500">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{day.day}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {day.totalHours.toFixed(1)}h
                </div>
              </div>

              <div className="space-y-3">
                {day.timeSlots.map((slot, slotIdx) => (
                  <div
                    key={slotIdx}
                    className={`p-3 rounded-lg border-2 ${getPriorityColor(slot.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTypeIcon(slot.type)}</span>
                        <div>
                          <div className="font-medium text-gray-900">{slot.topic}</div>
                          <div className="text-sm text-gray-600">{slot.subject}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-xs text-gray-500">{slot.duration} min</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{slot.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          slot.priority === 'high' ? 'bg-red-100 text-red-800' :
                          slot.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {slot.priority} priority
                        </span>
                        {plan.mlStatus === 'available' && slot.priority === 'high' && (
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded flex items-center">
                            <Brain className="h-3 w-3 mr-1" />
                            ML-Driven
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleLogFromActivity(slot, day)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center"
                        title="Log study session for this activity"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Log Session
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Study Time</span>
              <span>{plan.progress.completedHours.toFixed(1)}h / {plan.progress.totalHours}h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-indigo-600 h-4 rounded-full transition-all"
                style={{ width: `${plan.progress.completionRate}%` }}
              ></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {plan.dailyPlan.filter(d => d.totalHours > 0).length}
              </div>
              <div className="text-sm text-gray-600">Study Days</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {plan.dailyPlan.reduce((sum, d) => sum + d.totalHours, 0).toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600">Total Planned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Session Modal */}
      {showLogModal && selectedActivity && (
        <LogSessionModal
          onClose={() => {
            setShowLogModal(false)
            setSelectedActivity(null)
          }}
          onSave={handleLogSession}
          activity={selectedActivity}
        />
      )}
    </div>
  )
}

// Log Session Modal Component
function LogSessionModal({ 
  onClose, 
  onSave, 
  activity 
}: { 
  onClose: () => void
  onSave: (data: any) => void
  activity: {topic: string, subject: string, description: string, startTime: string, endTime: string, duration: number}
}) {
  const [formData, setFormData] = useState({
    title: activity.topic,
    startTime: activity.startTime,
    endTime: activity.endTime,
    subject: activity.subject,
    description: activity.description
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString()
    })
  }

  const subjects = ['Abnormal Psychology', 'Developmental Psychology', 'Industrial Psychology', 'Psychological Assessment']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4">Log Study Session</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Reviewed DSM-5 Criteria"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="What did you study?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Log Session
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



