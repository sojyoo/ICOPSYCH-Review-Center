'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Target,
  Brain
} from 'lucide-react'

interface Question {
  id: string
  question: string
  options: string[]
  correctIndex: number
  subject: string
  difficulty: string
  explanation?: string
}

interface TestState {
  questions: Question[]
  currentPage: number
  answers: Record<string, number>
  timeRemaining: number
  testType: string
  weekNumber: number
  lecture: number
  subjects: string[]
  totalQuestions: number
}

const getTestDuration = (testType: string) => {
  // 10 minutes (600s) for regular tests, 2 hours (7200s) for mock exam
  return testType === 'mock-exam' ? 7200 : 600
}

export default function TestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [testState, setTestState] = useState<TestState>({
    questions: [],
    currentPage: 0,
    answers: {},
    timeRemaining: 600, // default 10 minutes
    testType: '',
    weekNumber: 0,
    lecture: 0,
    subjects: [],
    totalQuestions: 0
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessMessage, setAccessMessage] = useState<string>('')
  const [testStartTime, setTestStartTime] = useState<Date | null>(null)
  const [testDuration, setTestDuration] = useState<number>(600) // Store the total duration

  useEffect(() => {
    console.log('🔍 Test page - Session status:', { status, hasSession: !!session, userId: session?.user?.id })
    
    if (status === 'loading') return
    if (!session) {
      console.log('❌ No session, redirecting to login')
      router.push('/login')
      return
    }
    
    console.log('✅ Session found, loading questions...')
    loadQuestions()
  }, [session, status])

  useEffect(() => {
    // Load timer state from localStorage if available
    // Only restore timer if it's for the same test type and hasn't expired
    const savedStartTime = localStorage.getItem('test-start-time')
    const savedDuration = localStorage.getItem('test-duration')
    const testType = searchParams.get('type')
    
    if (savedStartTime && savedDuration && testType) {
      const startTime = new Date(parseInt(savedStartTime))
      const duration = parseInt(savedDuration)
      const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
      const remaining = Math.max(0, duration - elapsed)
      
      // Only restore if time hasn't expired (to prevent immediate auto-submit)
      if (remaining > 0) {
        setTestStartTime(startTime)
        setTestDuration(duration)
        setTestState(prev => ({ ...prev, timeRemaining: remaining }))
      } else {
        // Clear expired timer
        localStorage.removeItem('test-start-time')
        localStorage.removeItem('test-duration')
      }
    }
  }, [searchParams])

  useEffect(() => {
    // Timer countdown - calculate based on elapsed time from start
    if (!testStartTime) {
      return
    }

    const updateTimer = () => {
      const elapsed = Math.floor((new Date().getTime() - testStartTime.getTime()) / 1000)
      const remaining = Math.max(0, testDuration - elapsed)
      
      setTestState(prev => {
        if (prev.timeRemaining !== remaining) {
          return { ...prev, timeRemaining: remaining }
        }
        return prev
      })
    }

    // Update immediately
    updateTimer()

    // Then update every second
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [testStartTime, testDuration])

  // Auto-submit when time runs out (only if questions are loaded)
  useEffect(() => {
    if (testState.timeRemaining === 0 && testStartTime && !submitting && testState.questions.length > 0) {
      handleSubmit()
    }
  }, [testState.timeRemaining, testState.questions.length, testStartTime, submitting])

  const loadQuestions = async () => {
    try {
      const week = searchParams.get('week')
      const lecture = searchParams.get('lecture')
      const subjects = searchParams.get('subjects')
      const type = searchParams.get('type')

      if (!week || !lecture || !subjects || !type) {
        router.push('/dashboard')
        return
      }

      console.log('🔍 Loading questions with params:', { week, lecture, subjects, type })
      console.log('👤 Session available:', !!session?.user?.id)

      setTestState(prev => ({
        ...prev,
        weekNumber: parseInt(week),
        lecture: parseInt(lecture),
        subjects: subjects.split(','),
        testType: type
      }))

      // Check if user can take this test
      if (session?.user?.id) {
        const response = await fetch(`/api/test-progression?week=${week}&lecture=${lecture}&subjects=${subjects}&type=${type}`)
        
        if (response.ok) {
          const accessResult = await response.json()
          
          if (!accessResult.canTake) {
            setAccessDenied(true)
            setAccessMessage(accessResult.message || 'You cannot take this test yet.')
            setLoading(false)
            return
          }
        } else {
          console.error('Failed to check test access')
        }
      }

      // Load questions with proper headers
      const questionsResponse = await fetch(`/api/questions?week=${week}&lecture=${lecture}&subjects=${subjects}&type=${type}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('📡 Questions API Response Status:', questionsResponse.status)
      
      if (questionsResponse.ok) {
        const data = await questionsResponse.json()
        const questions = data.questions || []
        
        console.log(`📝 Loaded ${questions.length} questions for ${type}`)
        console.log('🔍 Question data:', data)
        
        if (questions.length === 0) {
          console.warn('⚠️ No questions returned from API')
        }
        
        const duration = getTestDuration(type)
        const startTime = new Date()
        
        // Clear any old timer data first
        localStorage.removeItem('test-start-time')
        localStorage.removeItem('test-duration')
        
        setTestState(prev => ({
          ...prev,
          questions,
          totalQuestions: questions.length,
          timeRemaining: duration
        }))
        
        // Set test start time for accurate time tracking
        setTestStartTime(startTime)
        setTestDuration(duration)
        
        // Save to localStorage for persistence across tab switches
        localStorage.setItem('test-start-time', startTime.getTime().toString())
        localStorage.setItem('test-duration', duration.toString())
      } else {
        console.error('Failed to load questions:', questionsResponse.status, questionsResponse.statusText)
        const errorText = await questionsResponse.text()
        console.error('Error response:', errorText)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setTestState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: optionIndex
      }
    }))
  }

  const handlePageChange = (newPage: number) => {
    setTestState(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    
    // Prevent submission if no questions are loaded
    if (testState.questions.length === 0) {
      console.warn('⚠️ Cannot submit: No questions loaded')
      return
    }
    
    setSubmitting(true)
    
    try {
      // Calculate scores
      let totalScore = 0
      const subjectScores: Record<string, { correct: number, total: number }> = {}
      
      testState.questions.forEach(question => {
        const userAnswer = testState.answers[question.id]
        const isCorrect = userAnswer === question.correctIndex
        
        if (isCorrect) {
          totalScore++
        }
        
        if (!subjectScores[question.subject]) {
          subjectScores[question.subject] = { correct: 0, total: 0 }
        }
        
        subjectScores[question.subject].total++
        if (isCorrect) {
          subjectScores[question.subject].correct++
        }
      })

      // Calculate actual time spent
      const actualTimeSpent = testStartTime 
        ? Math.floor((new Date().getTime() - testStartTime.getTime()) / 1000)
        : getTestDuration(testState.testType) - testState.timeRemaining

        console.log('⏱️ Time calculation:', {
        testStartTime: testStartTime?.toISOString(),
        currentTime: new Date().toISOString(),
        actualTimeSpent,
        timeRemaining: testState.timeRemaining,
        calculatedTime: getTestDuration(testState.testType) - testState.timeRemaining
      })

      // Submit test results
      console.log('📤 Submitting test with data:', {
        questionsCount: testState.questions.length,
        answersCount: Object.keys(testState.answers).length,
        testType: testState.testType,
        weekNumber: testState.weekNumber,
        lecture: testState.lecture,
        subjects: testState.subjects,
        totalScore,
        totalQuestions: testState.totalQuestions,
        actualTimeSpent
      })
      
      const response = await fetch('/api/test/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: testState.questions,
          answers: testState.answers,
          subjectScores,
          testType: testState.testType,
          timeSpent: actualTimeSpent,
          totalScore,
          totalQuestions: testState.totalQuestions,
          weekNumber: testState.weekNumber,
          lecture: testState.lecture,
          subjects: testState.subjects
        })
      })

      console.log('📡 Submit response status:', response.status)
      
      if (response.ok) {
        // Clear timer from localStorage
        localStorage.removeItem('test-timer')
        localStorage.removeItem('test-start-time')
        localStorage.removeItem('test-duration')
        
        const result = await response.json()
        console.log('✅ Test submitted successfully:', result)

        // Always redirect to results page first, regardless of test type
        router.push(`/test/results?attemptId=${result.attemptId}`)
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to submit test:', response.status, errorText)
        alert('Failed to submit test. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting test:', error)
      alert('Error submitting test. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentPageQuestions = () => {
    const startIndex = testState.currentPage * 10
    return testState.questions.slice(startIndex, startIndex + 10)
  }

  const getTotalPages = () => {
    return Math.ceil(testState.questions.length / 10)
  }

  const getAnsweredCount = () => {
    return Object.keys(testState.answers).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            {accessMessage}
          </p>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            <p><strong>Week:</strong> {testState.weekNumber}</p>
            <p><strong>Lecture:</strong> {testState.lecture}</p>
            <p><strong>Subjects:</strong> {testState.subjects.join(', ')}</p>
            <p><strong>Test Type:</strong> {testState.testType}</p>
          </div>
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

  const currentQuestions = getCurrentPageQuestions()
  const totalPages = getTotalPages()
  const answeredCount = getAnsweredCount()
  const progressPercentage = testState.totalQuestions > 0
    ? Math.round((answeredCount / testState.totalQuestions) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-2 sm:mr-3 p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {testState.testType === 'mock-exam' ? 'Mock Exam' : 
                   testState.testType === 'pre-test' ? 'Pre-Test' : 'Post-Test'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  Week {testState.weekNumber} • Lecture {testState.lecture} • {testState.subjects.join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className={`font-mono ${testState.timeRemaining < 300 ? 'text-red-600' : ''}`}>
                  {formatTime(testState.timeRemaining)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {testState.totalQuestions} Q
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>
                Answered {answeredCount} of {testState.totalQuestions} questions
              </span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          {currentQuestions.map((question, index) => (
            <div key={`${question.id}-${testState.currentPage}-${index}`} className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-medium px-2 sm:px-2.5 py-0.5 rounded">
                    Q{testState.currentPage * 10 + index + 1}
                  </span>
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                    {question.subject}
                  </span>
                </div>
              </div>
              
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 leading-relaxed">
                {question.question}
              </h3>
              
              <div className="space-y-2 sm:space-y-3">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={`flex items-start p-3 sm:p-3 rounded-lg border cursor-pointer transition-colors touch-manipulation ${
                      testState.answers[question.id] === optionIndex
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={optionIndex}
                      checked={testState.answers[question.id] === optionIndex}
                      onChange={() => handleAnswerSelect(question.id, optionIndex)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      testState.answers[question.id] === optionIndex
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                    }`}>
                      {testState.answers[question.id] === optionIndex && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-sm sm:text-base text-gray-900 leading-relaxed">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 gap-4">
          <button
            onClick={() => handlePageChange(testState.currentPage - 1)}
            disabled={testState.currentPage === 0}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto max-w-full px-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i)}
                className={`min-w-[2.5rem] h-10 sm:w-8 sm:h-8 text-sm font-medium rounded touch-manipulation ${
                  i === testState.currentPage
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(testState.currentPage + 1)}
            disabled={testState.currentPage === totalPages - 1}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>

        {/* Submit Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Submit Test
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
