'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Play,
  FileText,
  ArrowLeft
} from 'lucide-react'
import { ICOPSYCH_SCHEDULE, getCurrentWeek, getWeekByNumber } from '@/lib/schedule'

interface UserStats {
  weekProgress?: Array<{
    week: number
    preCompleted: boolean
    postCompleted: boolean
  }>
  nextAvailableWeek?: number
}

interface TestAttempt {
  id: string
  testType: string
  weekNumber: number
  lecture: number
  subjects: string[]
  score: number
  completedAt: string
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    loadCalendarData()
  }, [session, status, router])

  const loadCalendarData = async () => {
    if (!session) return
    
    try {
      setLoading(true)
      // Load user stats
      const statsResponse = await fetch('/api/user/stats')
      if (statsResponse.ok) {
        const stats = await statsResponse.json()
        setUserStats(stats)
        if (stats.nextAvailableWeek) {
          setSelectedWeek(Math.min(stats.nextAvailableWeek, getCurrentWeek()))
        }
      }

      // Load test attempts
      const attemptsResponse = await fetch('/api/user/test-attempts')
      if (attemptsResponse.ok) {
        const attempts = await attemptsResponse.json()
        setTestAttempts(attempts.attempts || [])
      }
    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeekStatus = (week: number) => {
    if (!userStats?.weekProgress) return 'locked'
    const weekData = userStats.weekProgress.find(w => w.week === week)
    if (!weekData) return 'locked'
    if (weekData.preCompleted && weekData.postCompleted) return 'completed'
    if (weekData.preCompleted || weekData.postCompleted) return 'in-progress'
    return 'available'
  }

  const getWeekAttempts = (week: number) => {
    return testAttempts.filter(attempt => attempt.weekNumber === week)
  }

  const getActivityStatus = (week: number, activityType: string) => {
    const attempts = getWeekAttempts(week)
    return attempts.find(a => a.testType === activityType)
  }

  const handleActivityClick = (week: number, activity: any) => {
    const weekData = getWeekByNumber(week)
    const lecture = weekData ? 1 : 1 // Default to lecture 1, can be enhanced later
    
    if (activity.type === 'pre-test' || activity.type === 'post-test') {
      const attempt = getActivityStatus(week, activity.type)
      if (attempt) {
        router.push(`/test/results?attemptId=${attempt.id}`)
      } else {
        router.push(`/test?week=${week}&lecture=${lecture}&subjects=${activity.subjects.join(',')}&type=${activity.type}`)
      }
    } else if (activity.type === 'discussion') {
      const preTestAttempt = getActivityStatus(week, 'pre-test')
      if (preTestAttempt) {
        router.push(`/discussion?week=${week}&lecture=${lecture}&subjects=${activity.subjects.join(',')}&attemptId=${preTestAttempt.id}`)
      } else {
        router.push(`/discussion?week=${week}&lecture=${lecture}&subjects=${activity.subjects.join(',')}`)
      }
    } else if (activity.type === 'mock-exam') {
      const attempt = getActivityStatus(week, 'mock-exam')
      if (attempt) {
        router.push(`/test/results?attemptId=${attempt.id}`)
      } else {
        router.push(`/test?week=${week}&subjects=${activity.subjects.join(',')}&type=mock-exam`)
      }
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1)
    } else if (direction === 'next' && selectedWeek < 18) {
      setSelectedWeek(selectedWeek + 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-3 sm:mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
                  <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mr-2 sm:mr-3 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">Study Calendar</span>
                </h1>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">View your ICOPSYCH schedule and track your progress</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg touch-manipulation ${
                  viewMode === 'week' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg touch-manipulation ${
                  viewMode === 'month' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWeek('prev')}
              disabled={selectedWeek === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Week {selectedWeek}: {getWeekByNumber(selectedWeek)?.title || 'Unknown'}
              </h2>
              <p className="text-sm text-gray-600">{getWeekByNumber(selectedWeek)?.date || ''}</p>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              disabled={selectedWeek === 18}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        {viewMode === 'week' ? (
          <WeekView 
            week={selectedWeek}
            weekData={getWeekByNumber(selectedWeek)}
            weekStatus={getWeekStatus(selectedWeek)}
            attempts={getWeekAttempts(selectedWeek)}
            onActivityClick={handleActivityClick}
            getActivityStatus={getActivityStatus}
          />
        ) : (
          <MonthView 
            selectedWeek={selectedWeek}
            onWeekSelect={setSelectedWeek}
            userStats={userStats}
            testAttempts={testAttempts}
            getWeekStatus={getWeekStatus}
            getWeekAttempts={getWeekAttempts}
          />
        )}
      </div>
    </div>
  )
}

function WeekView({ 
  week, 
  weekData, 
  weekStatus, 
  attempts, 
  onActivityClick,
  getActivityStatus 
}: {
  week: number
  weekData?: any
  weekStatus: string
  attempts: TestAttempt[]
  onActivityClick: (week: number, activity: any) => void
  getActivityStatus: (week: number, activityType: string) => TestAttempt | undefined
}) {
  if (!weekData) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No schedule data available for this week.</p>
      </div>
    )
  }

  const getStatusIcon = (activityType: string) => {
    const attempt = getActivityStatus(week, activityType)
    if (attempt) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    if (weekStatus === 'locked') {
      return <Lock className="h-5 w-5 text-gray-400" />
    }
    return <Play className="h-5 w-5 text-indigo-600" />
  }

  const getStatusColor = (activityType: string) => {
    const attempt = getActivityStatus(week, activityType)
    if (attempt) {
      return 'bg-green-50 border-green-200'
    }
    if (weekStatus === 'locked') {
      return 'bg-gray-50 border-gray-200'
    }
    return 'bg-blue-50 border-blue-200'
  }

  return (
    <div className="space-y-4">
      {/* Week Status Banner */}
      <div className={`rounded-lg p-4 ${
        weekStatus === 'completed' ? 'bg-green-50 border border-green-200' :
        weekStatus === 'in-progress' ? 'bg-blue-50 border border-blue-200' :
        weekStatus === 'locked' ? 'bg-gray-50 border border-gray-200' :
        'bg-indigo-50 border border-indigo-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {weekStatus === 'completed' ? 'Week Completed ✓' :
               weekStatus === 'in-progress' ? 'Week In Progress' :
               weekStatus === 'locked' ? 'Week Locked' :
               'Week Available'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {weekStatus === 'completed' ? 'You have completed all activities for this week.' :
               weekStatus === 'in-progress' ? 'Continue with the remaining activities.' :
               weekStatus === 'locked' ? 'Complete previous weeks to unlock this week.' :
               'Start with the pre-test to begin this week.'}
            </p>
          </div>
          {attempts.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">Test Attempts</p>
              <p className="text-2xl font-bold text-indigo-600">{attempts.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Activities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {weekData.activities.map((activity: any, index: number) => {
          const attempt = getActivityStatus(week, activity.type)
          const isLocked = weekStatus === 'locked'
          
          return (
            <div
              key={index}
              className={`rounded-lg border-2 p-4 sm:p-6 cursor-pointer transition-all hover:shadow-md touch-manipulation ${
                isLocked ? 'cursor-not-allowed opacity-60' : ''
              } ${getStatusColor(activity.type)}`}
              onClick={() => !isLocked && onActivityClick(week, activity)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {activity.type === 'pre-test' || activity.type === 'post-test' ? (
                    <FileText className="h-6 w-6 text-indigo-600" />
                  ) : activity.type === 'discussion' ? (
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  ) : (
                    <CalendarIcon className="h-6 w-6 text-red-600" />
                  )}
                  <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                </div>
                {getStatusIcon(activity.type)}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  {activity.time}
                </div>
                <div className="flex flex-wrap gap-1">
                  {activity.subjects.map((subject: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
                {attempt && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700">
                      Score: <span className="text-indigo-600">{attempt.score}%</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Completed: {new Date(attempt.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthView({
  selectedWeek,
  onWeekSelect,
  userStats,
  testAttempts,
  getWeekStatus,
  getWeekAttempts
}: {
  selectedWeek: number
  onWeekSelect: (week: number) => void
  userStats: UserStats | null
  testAttempts: TestAttempt[]
  getWeekStatus: (week: number) => string
  getWeekAttempts: (week: number) => TestAttempt[]
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ICOPSYCH_SCHEDULE.map((weekData) => {
        const status = getWeekStatus(weekData.week)
        const attempts = getWeekAttempts(weekData.week)
        const isSelected = weekData.week === selectedWeek
        
        return (
          <div
            key={weekData.week}
            onClick={() => onWeekSelect(weekData.week)}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'border-indigo-600 bg-indigo-50' :
              status === 'completed' ? 'border-green-300 bg-green-50' :
              status === 'in-progress' ? 'border-blue-300 bg-blue-50' :
              status === 'locked' ? 'border-gray-300 bg-gray-50 opacity-60' :
              'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Week {weekData.week}</h3>
              {status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {status === 'in-progress' && <Clock className="h-5 w-5 text-blue-600" />}
              {status === 'locked' && <Lock className="h-5 w-5 text-gray-400" />}
            </div>
            <p className="text-sm text-gray-600 mb-2">{weekData.title}</p>
            <p className="text-xs text-gray-500 mb-3">{weekData.date}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                {weekData.activities.length} activities
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

