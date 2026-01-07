'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react'

interface ReviewConcept {
  id: string
  conceptId: string
  conceptName: string
  subject: string
  topic: string | null
  masteryLevel: number
  attempts: number
  correctAttempts: number
  lastReviewed: string | null
  nextReviewDate: string | null
  isOverdue: boolean
  daysUntilReview: number | null
}

interface ReviewStats {
  due: number
  upcoming: number
  total: number
}

export default function ConceptReviewQueue() {
  const [concepts, setConcepts] = useState<ReviewConcept[]>([])
  const [stats, setStats] = useState<ReviewStats>({ due: 0, upcoming: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'due' | 'upcoming' | 'all'>('due')
  const [currentConcept, setCurrentConcept] = useState<ReviewConcept | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<'correct' | 'incorrect' | 'partial' | null>(null)

  useEffect(() => {
    loadReviewQueue()
  }, [filter])

  const loadReviewQueue = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/concept-mastery/review-queue?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setConcepts(data.concepts)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading review queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const startReview = (concept: ReviewConcept) => {
    setCurrentConcept(concept)
    setReviewing(true)
    setReviewResult(null)
  }

  const submitReview = async (performance: 'correct' | 'incorrect' | 'partial') => {
    if (!currentConcept) return

    try {
      const response = await fetch('/api/concept-mastery/review-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptMasteryId: currentConcept.id,
          performance
        })
      })

      if (response.ok) {
        setReviewResult(performance)
        // Reload queue after a moment
        setTimeout(() => {
          loadReviewQueue()
          setReviewing(false)
          setCurrentConcept(null)
          setReviewResult(null)
        }, 1500)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const getMasteryColor = (level: number) => {
    if (level >= 0.8) return 'text-green-600 bg-green-50'
    if (level >= 0.5) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getMasteryLabel = (level: number) => {
    if (level >= 0.8) return 'Mastered'
    if (level >= 0.5) return 'Learning'
    return 'Needs Work'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading review queue...</p>
      </div>
    )
  }

  // Review Mode
  if (reviewing && currentConcept) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Review Concept</h2>
          <p className="text-indigo-100">Test your knowledge</p>
        </div>

        {!reviewResult ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center mb-8">
              <BookOpen className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentConcept.conceptName}</h3>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <span>{currentConcept.subject}</span>
                {currentConcept.topic && (
                  <>
                    <span>•</span>
                    <span>{currentConcept.topic}</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <p className="text-center text-gray-700 mb-4">
                How well do you know this concept?
              </p>
              <p className="text-center text-sm text-gray-500">
                Think about: Can you explain it? Can you apply it? Can you solve problems with it?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => submitReview('incorrect')}
                className="p-6 border-2 border-red-300 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-1">Don't Know</h4>
                <p className="text-sm text-gray-600">Need to study more</p>
              </button>

              <button
                onClick={() => submitReview('partial')}
                className="p-6 border-2 border-yellow-300 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-1">Partially Know</h4>
                <p className="text-sm text-gray-600">Somewhat familiar</p>
              </button>

              <button
                onClick={() => submitReview('correct')}
                className="p-6 border-2 border-green-300 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-1">Know Well</h4>
                <p className="text-sm text-gray-600">Confident understanding</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            {reviewResult === 'correct' ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Great Job!</h3>
                <p className="text-gray-600">Your mastery level has increased. Keep it up!</p>
              </>
            ) : reviewResult === 'partial' ? (
              <>
                <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Keep Practicing</h3>
                <p className="text-gray-600">You're making progress. Review again soon!</p>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Keep Studying</h3>
                <p className="text-gray-600">This concept will be scheduled for review again.</p>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Concept Review Queue</h2>
            <p className="text-indigo-100">Review concepts using spaced repetition</p>
          </div>
          <button
            onClick={loadReviewQueue}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Due Now</p>
              <p className="text-2xl font-bold text-red-600">{stats.due}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.upcoming}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total in Queue</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
            </div>
            <BookOpen className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-2">
          {(['due', 'upcoming', 'all'] as const).map((f) => (
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

      {/* Concepts List */}
      <div className="bg-white rounded-lg shadow">
        {concepts.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No concepts in review queue</p>
            <p className="text-sm text-gray-500 mt-2">
              Concepts will appear here as you take tests and answer questions
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {concept.conceptName}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getMasteryColor(concept.masteryLevel)}`}>
                        {getMasteryLabel(concept.masteryLevel)}
                      </span>
                      {concept.isOverdue && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <span>{concept.subject}</span>
                      {concept.topic && (
                        <>
                          <span>•</span>
                          <span>{concept.topic}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{concept.attempts} attempts</span>
                      <span>•</span>
                      <span>{Math.round(concept.masteryLevel * 100)}% mastery</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {concept.nextReviewDate && (
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {concept.isOverdue 
                            ? `Overdue by ${Math.abs(concept.daysUntilReview || 0)} days`
                            : concept.daysUntilReview === 0
                            ? 'Due today'
                            : `Due in ${concept.daysUntilReview} days`
                          }
                        </span>
                      )}
                      {concept.lastReviewed && (
                        <span>
                          Last reviewed: {new Date(concept.lastReviewed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => startReview(concept)}
                    className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




