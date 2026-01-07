'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Brain, 
  Target, 
  Clock, 
  BookOpen, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Star,
  Calendar,
  Play,
  Filter,
  Search,
  Plus
} from 'lucide-react'
import WeeklyStudyPlanComponent from '@/components/WeeklyStudyPlan'

interface StudyRecommendation {
  id: string
  type: 'weakness' | 'strength' | 'review' | 'practice'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  subjects: string[]
  estimatedTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  resources?: string[]
}

export default function StudyPlanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'weakness' | 'strength' | 'review' | 'practice'>('all')
  const [activeTab, setActiveTab] = useState<'weekly' | 'recommendations'>('weekly')
  const [sessionStats, setSessionStats] = useState<{totalHours: number, todayHours: number, totalSessions: number, streak: number} | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedRecommendation, setSelectedRecommendation] = useState<StudyRecommendation | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    loadRecommendations()
    loadSessionStats()
  }, [session, status])

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations')
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      } else {
        console.error('Failed to load recommendations')
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionStats = async () => {
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)

      const response = await fetch(
        `/api/study-sessions?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      )
      if (response.ok) {
        const data = await response.json()
        setSessionStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error loading session stats:', error)
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
        setSelectedRecommendation(null)
        loadSessionStats()
      } else {
        alert('Failed to log session')
      }
    } catch (error) {
      console.error('Error logging session:', error)
      alert('Error logging session')
    }
  }

  const handleLogFromRecommendation = (recommendation: StudyRecommendation) => {
    setSelectedRecommendation(recommendation)
    setShowLogModal(true)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weakness': return 'text-red-600 bg-red-50 border-red-200'
      case 'strength': return 'text-green-600 bg-green-50 border-green-200'
      case 'review': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'practice': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weakness': return <AlertCircle className="h-5 w-5" />
      case 'strength': return <CheckCircle className="h-5 w-5" />
      case 'review': return <BookOpen className="h-5 w-5" />
      case 'practice': return <Target className="h-5 w-5" />
      default: return <Brain className="h-5 w-5" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'hard': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const filteredRecommendations = recommendations.filter(rec => {
    const priorityMatch = filter === 'all' || rec.priority === filter
    const typeMatch = typeFilter === 'all' || rec.type === typeFilter
    return priorityMatch && typeMatch
  })

  const handleStartRecommendation = (recommendation: StudyRecommendation) => {
    // Navigate to appropriate page based on recommendation type
    if (recommendation.type === 'practice' && recommendation.subjects.includes('All Subjects')) {
      router.push('/test?type=mock-exam')
    } else if (recommendation.subjects.length === 1 && recommendation.subjects[0] !== 'All Subjects') {
      // Navigate to specific subject test
      const subject = recommendation.subjects[0]
      router.push(`/test?subjects=${subject}&type=pre-test`)
    } else {
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating personalized study recommendations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Personalized Study Plan</h1>
                <p className="text-sm text-gray-600">Personalized recommendations based on your recent performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Study Session Stats */}
        {sessionStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-indigo-600">{sessionStats.totalHours.toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-green-600">{sessionStats.todayHours.toFixed(1)}h</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-blue-600">{sessionStats.totalSessions}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Study Streak</p>
                  <p className="text-2xl font-bold text-orange-600">{sessionStats.streak} days</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('weekly')}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'weekly'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Weekly Plan
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'recommendations'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Brain className="h-5 w-5 mr-2" />
                Recommendations
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'weekly' ? (
          <WeeklyStudyPlanComponent />
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            {/* Priority Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Priority:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All</option>
                <option value="weakness">Weaknesses</option>
                <option value="strength">Strengths</option>
                <option value="review">Review</option>
                <option value="practice">Practice</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-6">
          {filteredRecommendations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations found</h3>
              <p className="text-gray-600">Try adjusting your filters or take some tests to generate personalized recommendations.</p>
            </div>
          ) : (
            filteredRecommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className={`bg-white rounded-lg shadow p-6 border-2 ${getTypeColor(recommendation.type)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(recommendation.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
                          {recommendation.priority} priority
                        </span>
                        <span className={`text-xs font-medium ${getDifficultyColor(recommendation.difficulty)}`}>
                          {recommendation.difficulty} difficulty
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleLogFromRecommendation(recommendation)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                      title="Log study session for this activity"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Log Session
                    </button>
                    <button
                      onClick={() => handleStartRecommendation(recommendation)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{recommendation.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {recommendation.estimatedTime} min
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {recommendation.subjects.join(', ')}
                    </div>
                  </div>
                  
                  {recommendation.resources && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Resources:</span>
                      <div className="flex space-x-1">
                        {recommendation.resources.slice(0, 2).map((resource, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {resource}
                          </span>
                        ))}
                        {recommendation.resources.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            +{recommendation.resources.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Plan Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">
                {recommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">
                {recommendations.filter(r => r.priority === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">Medium Priority</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {recommendations.filter(r => r.priority === 'low').length}
              </div>
              <div className="text-sm text-gray-600">Low Priority</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(recommendations.reduce((sum, r) => sum + r.estimatedTime, 0) / 60)}h
              </div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Log Session Modal */}
        {showLogModal && (
          <LogSessionModal
            onClose={() => {
              setShowLogModal(false)
              setSelectedRecommendation(null)
            }}
            onSave={handleLogSession}
            recommendation={selectedRecommendation}
          />
        )}
      </div>
    </div>
  )
}

// Log Session Modal Component
function LogSessionModal({ 
  onClose, 
  onSave, 
  recommendation 
}: { 
  onClose: () => void
  onSave: (data: any) => void
  recommendation: StudyRecommendation | null
}) {
  const [formData, setFormData] = useState({
    title: recommendation?.title || '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + (recommendation?.estimatedTime || 60) * 60 * 1000).toISOString().slice(0, 16),
    subject: recommendation?.subjects[0] || '',
    description: recommendation?.description || ''
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








