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
  Search
} from 'lucide-react'

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

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    loadRecommendations()
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
                  <button
                    onClick={() => handleStartRecommendation(recommendation)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </button>
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
      </div>
    </div>
  )
}








