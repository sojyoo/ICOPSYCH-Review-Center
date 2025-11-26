'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  TrendingUp,
  Brain,
  ArrowRight,
  BookOpen,
  BarChart3,
  Award,
  RefreshCw
} from 'lucide-react'

interface TestResult {
  id: string
  testType: string
  weekNumber: number
  lecture: number
  subjects: string[]
  score: number
  totalQuestions: number
  timeSpent: number
  subjectScores: Record<string, { correct: number, total: number }>
  completedAt: string
  questions: Array<{
    id: string
    question: string
    options: string[]
    correctIndex: number
    selectedOption: number
    isCorrect: boolean
    subject: string
    explanation?: string
  }>
}

export default function TestResultsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    loadTestResult()
  }, [session, status])

  const loadTestResult = async () => {
    try {
      const attemptId = searchParams.get('attemptId')
      if (!attemptId) {
        router.push('/dashboard')
        return
      }

      console.log('📊 Loading test result for attempt:', attemptId)

      const response = await fetch(`/api/test/results?attemptId=${attemptId}`)
      
      if (!response.ok) {
        console.error('Failed to load test result:', response.status)
        router.push('/dashboard')
        return
      }

      const result = await response.json()
      console.log('✅ Test result loaded:', {
        id: result.id,
        score: result.score,
        totalQuestions: result.totalQuestions,
        timeSpent: result.timeSpent,
        questionsCount: result.questions?.length
      })

      setTestResult(result)
    } catch (error) {
      console.error('Error loading test result:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getScoreColor = (score: number, total: number) => {
    if (total === 0) return 'text-gray-600'
    const percentage = (score / total) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number, total: number) => {
    if (total === 0) return 'bg-gray-100'
    const percentage = (score / total) * 100
    if (percentage >= 80) return 'bg-green-100'
    if (percentage >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const handleNextStep = () => {
    if (testResult?.testType === 'pre-test') {
      const params = new URLSearchParams({
        week: testResult.weekNumber.toString(),
        lecture: testResult.lecture.toString(),
        subjects: testResult.subjects.join(','),
        attemptId: testResult.id
      })
      router.push(`/discussion?${params.toString()}`)
    } else if (testResult?.testType === 'post-test') {
      router.push('/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  const handleRetakeTest = () => {
    router.push(`/test?week=${testResult?.weekNumber}&lecture=${testResult?.lecture}&subjects=${testResult?.subjects.join(',')}&type=${testResult?.testType}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test results...</p>
        </div>
      </div>
    )
  }

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Results Not Found</h2>
          <p className="text-gray-600 mb-6">The test results you're looking for could not be found.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const percentage = testResult.totalQuestions > 0 
    ? Math.round((testResult.score / testResult.totalQuestions) * 100)
    : 0

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
                <h1 className="text-xl font-bold text-gray-900">Test Results</h1>
                <p className="text-sm text-gray-600">
                  Week {testResult.weekNumber} • {testResult.testType.replace('-', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(testResult.score, testResult.totalQuestions)} mb-4`}>
              <span className={`text-3xl font-bold ${getScoreColor(testResult.score, testResult.totalQuestions)}`}>
                {percentage}%
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {testResult.score} out of {testResult.totalQuestions} correct
            </h2>
            <p className="text-gray-600 mb-4">
              {testResult.subjects.join(', ')} • Completed in {formatTime(testResult.timeSpent)}
            </p>
            <div className="flex justify-center space-x-4">
              <div className="text-center">
                <div className="text-sm text-gray-500">Test Type</div>
                <div className="font-medium text-gray-900">{testResult.testType.replace('-', ' ').toUpperCase()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Week</div>
                <div className="font-medium text-gray-900">{testResult.weekNumber}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Lecture</div>
                <div className="font-medium text-gray-900">{testResult.lecture}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(testResult.subjectScores).map(([subject, scores]) => {
              const subjectPercentage = Math.round((scores.correct / scores.total) * 100)
              return (
                <div key={subject} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{subject}</h4>
                    <span className={`text-sm font-medium ${getScoreColor(scores.correct, scores.total)}`}>
                      {subjectPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        subjectPercentage >= 80 ? 'bg-green-500' :
                        subjectPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${subjectPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {scores.correct} out of {scores.total} questions correct
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'questions', label: 'Question Review', icon: BookOpen },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{testResult.score}</div>
                    <div className="text-sm text-gray-600">Correct Answers</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{testResult.totalQuestions - testResult.score}</div>
                    <div className="text-sm text-gray-600">Incorrect Answers</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-600">{formatTime(testResult.timeSpent)}</div>
                    <div className="text-sm text-gray-600">Time Spent</div>
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Performance Summary</h4>
                  <p className="text-gray-600">
                    {percentage >= 80 ? 
                      "Excellent work! You have a strong understanding of the material." :
                      percentage >= 60 ?
                      "Good job! Consider reviewing the areas where you struggled." :
                      "Keep studying! Focus on the fundamental concepts and practice more."
                    }
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Question Review</h4>
                  <span className="text-sm text-gray-500">
                    {testResult.questions.length} questions total
                  </span>
                </div>
                
                {testResult.questions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No questions available for review.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testResult.questions.map((question, index) => (
                      <div key={question.id} className={`p-6 rounded-lg border-2 ${
                        question.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                              Question {index + 1}
                            </span>
                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                              {question.subject}
                            </span>
                          </div>
                          <div className="flex items-center">
                            {question.isCorrect ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-1" />
                                <span className="text-sm font-medium">Correct</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-red-600">
                                <XCircle className="h-5 w-5 mr-1" />
                                <span className="text-sm font-medium">Incorrect</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <h5 className="font-medium text-gray-900 mb-4 text-lg">{question.question}</h5>
                        
                        <div className="space-y-3">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg border ${
                                optionIndex === question.correctIndex ? 'bg-green-100 border-green-300 text-green-800' :
                                optionIndex === question.selectedOption && !question.isCorrect ? 'bg-red-100 border-red-300 text-red-800' :
                                'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="font-medium mr-2">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>
                                <span>{option}</span>
                                {optionIndex === question.correctIndex && (
                                  <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                                )}
                                {optionIndex === question.selectedOption && !question.isCorrect && (
                                  <XCircle className="h-4 w-4 ml-2 text-red-600" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {question.explanation && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                              </div>
                              <div className="ml-3">
                                <h6 className="text-sm font-medium text-blue-800 mb-1">Explanation</h6>
                                <p className="text-sm text-blue-700">{question.explanation}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Analytics</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Time Analysis</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average time per question:</span>
                        <span className="text-sm font-medium">{Math.round(testResult.timeSpent / testResult.totalQuestions)} seconds</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total test duration:</span>
                        <span className="text-sm font-medium">{formatTime(testResult.timeSpent)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Accuracy by Subject</h5>
                    <div className="space-y-2">
                      {Object.entries(testResult.subjectScores).map(([subject, scores]) => {
                        const accuracy = Math.round((scores.correct / scores.total) * 100)
                        return (
                          <div key={subject} className="flex justify-between">
                            <span className="text-sm text-gray-600">{subject}:</span>
                            <span className={`text-sm font-medium ${getScoreColor(scores.correct, scores.total)}`}>
                              {accuracy}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetakeTest}
            className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Retake Test
          </button>
          <button
            onClick={handleNextStep}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
          >
            {testResult.testType === 'pre-test' ? 'Continue to Discussion' : 'Back to Dashboard'}
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  )
}
