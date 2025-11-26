'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
  BookOpen, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  Users,
  Award,
  CheckCircle,
  Play,
  Lock,
  Brain,
  FileText,
  Settings,
  HelpCircle,
  UserPlus
} from 'lucide-react'
import { ICOPSYCH_SCHEDULE, getCurrentWeek, getWeekByNumber } from '@/lib/schedule'

interface UserStats {
  totalTests: number
  averageScore: number
  completedWeeks: number
  totalWeeks: number
  subjectPerformance: Array<{
    subject: string
    percentage: number
    testsCompleted: number
  }>
  recentActivity: Array<{
    attemptId: string
    type: string
    title: string
    date: string
    score?: number
  }>
  nextAvailableWeek?: number
  currentStage?: string
  weekProgress?: Array<{
    week: number
    preCompleted: boolean
    postCompleted: boolean
  }>
}

interface Recommendation {
  type: 'study' | 'test' | 'review'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  subjects: string[]
  estimatedTime: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) redirect('/login')
    
    // Load user stats and recommendations
    loadDashboardData()
  }, [session, status])

  const loadDashboardData = async () => {
    try {
      // Load user stats
      const statsResponse = await fetch('/api/user/stats')
      if (statsResponse.ok) {
        const stats = await statsResponse.json()
        setUserStats(stats)
        if (stats.nextAvailableWeek) {
          setCurrentWeek(stats.nextAvailableWeek)
        } else {
          setCurrentWeek(getCurrentWeek())
        }
      }

      // Load recommendations
      const recResponse = await fetch('/api/recommendations')
      if (recResponse.ok) {
        const recs = await recResponse.json()
        setRecommendations(recs.recommendations || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "tests", label: "Tests", icon: Target },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "study-plan", label: "Study Plan", icon: BookOpen },
    { id: "calendar", label: "Calendar", icon: Clock },
    ...(session?.user?.role === 'admin' ? [
      { id: "admin", label: "Admin", icon: Settings },
      { id: "users", label: "Users", icon: Users }
    ] : []),
    { id: "help", label: "Help", icon: HelpCircle }
  ]

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden mr-3 p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">ICOPSYCH Review Center</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <div className="hidden sm:block text-sm text-gray-600">
                Welcome, <span className="font-medium text-gray-900">{session.user?.name}</span>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {session.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 sm:px-0"
              >
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={`lg:w-64 flex-shrink-0 ${
            mobileMenuOpen 
              ? 'fixed left-0 top-16 bottom-0 bg-white z-50 w-64 shadow-lg p-4 overflow-y-auto lg:static lg:shadow-none lg:p-0' 
              : 'hidden lg:block'
          }`}>
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-3 sm:py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === item.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && (
              <DashboardContent 
                userStats={userStats} 
                recommendations={recommendations}
                currentWeek={currentWeek}
                session={session}
              />
            )}
            {activeTab === 'schedule' && <ScheduleContent currentWeek={currentWeek} userStats={userStats} />}
            {activeTab === 'tests' && <TestsContent currentWeek={currentWeek} />}
            {activeTab === 'progress' && <ProgressContent userStats={userStats} />}
            {activeTab === 'study-plan' && <StudyPlanContent recommendations={recommendations} />}
            {activeTab === 'calendar' && <CalendarContent currentWeek={currentWeek} />}
            {activeTab === 'admin' && session.user?.role === 'admin' && <AdminContent />}
            {activeTab === 'users' && session.user?.role === 'admin' && <UsersContent />}
            {activeTab === 'help' && <HelpContent />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Dashboard Content Component
function DashboardContent({ userStats, recommendations, currentWeek, session }: {
  userStats: UserStats | null
  recommendations: Recommendation[]
  currentWeek: number
  session: any
}) {
  const router = useRouter()

  const handleStartTest = (weekNumber: number, testType: string, subjects: string[]) => {
    router.push(`/test?week=${weekNumber}&lecture=${getLectureForWeek(weekNumber)}&subjects=${subjects.join(',')}&type=${testType}`)
  }

  const handleStartDiscussion = (weekNumber: number, subjects: string[]) => {
    router.push(`/discussion?week=${weekNumber}&lecture=${getLectureForWeek(weekNumber)}&subjects=${subjects.join(',')}`)
  }

  const getLectureForWeek = (week: number) => {
    // Map weeks to lectures based on actual subjects available
    if (week >= 1 && week <= 2) return 1 // Abnormal Psychology, Industrial Psychology
    if (week >= 3 && week <= 4) return 1 // Combined topics, Developmental Psychology  
    if (week >= 5 && week <= 6) return 1 // Psychological Assessment, Combined topics
    if (week >= 7 && week <= 12) return 2 // Advanced topics
    if (week >= 13 && week <= 18) return 3 // Review and mock exams
    return 1
  }

  const getCurrentWeekData = () => {
    return getWeekByNumber(currentWeek)
  }

  const getAllowedWeek = () => userStats?.nextAvailableWeek || currentWeek

  const getWeekStatus = (weekNumber: number) => {
    // Temporarily lock weeks 2-18
    if (weekNumber > 1) return 'locked'
    
    const allowedWeek = getAllowedWeek()
    const progress = userStats?.weekProgress?.find(w => w.week === weekNumber)

    if (progress?.postCompleted) return 'completed'
    if (weekNumber < allowedWeek) return 'completed'
    if (weekNumber === allowedWeek) return 'current'
    return 'locked'
  }

  const isActivityDisabled = (activityType: string) => {
    const currentStage = userStats?.currentStage || 'pre-test'
    const progress = userStats?.weekProgress?.find(w => w.week === currentWeek)

    if (activityType === 'pre-test') {
      return currentStage !== 'pre-test'
    }
    if (activityType === 'discussion') {
      return !progress?.preCompleted
    }
    if (activityType === 'post-test') {
      return currentStage !== 'post-test' || !progress?.preCompleted
    }
    if (activityType === 'mock-exam') {
      return currentStage !== 'mock-exam'
    }
    return true
  }

  const isActivityCompleted = (activityType: string) => {
    const progress = userStats?.weekProgress?.find(w => w.week === currentWeek)
    if (activityType === 'pre-test') return !!progress?.preCompleted
    if (activityType === 'post-test') return !!progress?.postCompleted
    if (activityType === 'discussion') return !!progress?.postCompleted
    if (activityType === 'mock-exam') return userStats?.currentStage !== 'mock-exam' && currentWeek < (userStats?.nextAvailableWeek || currentWeek)
    return false
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          Welcome back, {session.user?.name}!
        </h2>
        <p className="text-indigo-100">
          Continue your psychology review journey. You're currently on Week {currentWeek}.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tests Completed</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.totalTests || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.averageScore || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weeks Completed</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.completedWeeks || 0}/18</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Award className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cohort</p>
              <p className="text-lg font-bold text-gray-900">ICOPSYCH-2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Week Activities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Week {currentWeek}: {getCurrentWeekData()?.title || 'Current Week'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {getCurrentWeekData()?.date || 'Current Date'}
        </p>
        <div className="space-y-4">
          {getCurrentWeekData()?.activities.map((activity, index) => {
            const isLocked = getWeekStatus(currentWeek) === 'locked' || isActivityDisabled(activity.type)
            const isCompleted = isActivityCompleted(activity.type)
            
            return (
              <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                activity.type === 'pre-test' ? 'bg-blue-50' :
                activity.type === 'discussion' ? 'bg-purple-50' :
                activity.type === 'post-test' ? 'bg-green-50' :
                'bg-orange-50'
              }`}>
                <div className="flex items-center">
                  {activity.type === 'pre-test' && <Target className="h-5 w-5 text-blue-600 mr-3" />}
                  {activity.type === 'discussion' && <BookOpen className="h-5 w-5 text-purple-600 mr-3" />}
                  {activity.type === 'post-test' && <CheckCircle className="h-5 w-5 text-green-600 mr-3" />}
                  {activity.type === 'mock-exam' && <Brain className="h-5 w-5 text-orange-600 mr-3" />}
                  <div>
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">
                      {activity.subjects.join(', ')} • {activity.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isCompleted && (
                    <span className="text-sm text-green-600 font-medium">✓ Completed</span>
                  )}
                  <button
                    onClick={() => {
                      if (activity.type === 'discussion') {
                        handleStartDiscussion(currentWeek, activity.subjects)
                      } else {
                        handleStartTest(currentWeek, activity.type, activity.subjects)
                      }
                    }}
                    disabled={isLocked || isCompleted}
                    className={`px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activity.type === 'pre-test' ? 'bg-blue-600 hover:bg-blue-700' :
                      activity.type === 'discussion' ? 'bg-purple-600 hover:bg-purple-700' :
                      activity.type === 'post-test' ? 'bg-green-600 hover:bg-green-700' :
                      'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {isCompleted ? 'Completed' : 
                     activity.type === 'discussion' ? 'Join Discussion' : 'Start Test'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Recommendations</h3>
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((rec, index) => {
              // Format description with bold emphasis on important parts
              const formatDescription = (desc: string) => {
                // Bold percentages (e.g., "30%", "85%")
                let formatted = desc.replace(/(\d+%)/g, '<strong class="font-bold">$1</strong>')
                // Bold subject names (common psychology subjects)
                const subjects = ['Developmental Psychology', 'Abnormal Psychology', 'Industrial Psychology', 'Psychological Assessment']
                subjects.forEach(subject => {
                  formatted = formatted.replace(new RegExp(`(${subject})`, 'gi'), '<strong class="font-bold">$1</strong>')
                })
                // Bold action words (Focus, Review, Practice, etc.)
                formatted = formatted.replace(/\b(Focus|Review|Practice|Prioritize|Strengthen|Maintain)\b/gi, '<strong class="font-bold">$1</strong>')
                // Bold "ML model" references
                formatted = formatted.replace(/\b(ML model|model recommends)\b/gi, '<strong class="font-bold">$1</strong>')
                return formatted
              }

              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Brain className="h-5 w-5 text-indigo-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{rec.title}</p>
                      <p 
                        className="text-sm text-gray-600"
                        dangerouslySetInnerHTML={{ __html: formatDescription(rec.description) }}
                      />
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rec.priority} priority
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Tests / Review */}
      {userStats?.recentActivity && userStats.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tests</h3>
          </div>
          <div className="space-y-3">
            {userStats.recentActivity.map((activity) => (
              <div key={activity.attemptId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">
                    {activity.date} • {activity.type.replace('-', ' ')} • {activity.score}% score
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/test/results?attemptId=${activity.attemptId}`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Results
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Placeholder components for other tabs
function ScheduleContent({ currentWeek, userStats }: { currentWeek: number, userStats: UserStats | null }) {
  const router = useRouter()

  const handleStartTest = (weekNumber: number, testType: string, subjects: string[]) => {
    router.push(`/test?week=${weekNumber}&lecture=${getLectureForWeek(weekNumber)}&subjects=${subjects.join(',')}&type=${testType}`)
  }

  const handleStartDiscussion = (weekNumber: number, subjects: string[]) => {
    router.push(`/discussion?week=${weekNumber}&lecture=${getLectureForWeek(weekNumber)}&subjects=${subjects.join(',')}`)
  }

  const getLectureForWeek = (week: number) => {
    // Map weeks to lectures based on actual subjects available
    if (week >= 1 && week <= 2) return 1 // Abnormal Psychology, Industrial Psychology
    if (week >= 3 && week <= 4) return 1 // Combined topics, Developmental Psychology  
    if (week >= 5 && week <= 6) return 1 // Psychological Assessment, Combined topics
    if (week >= 7 && week <= 12) return 2 // Advanced topics
    if (week >= 13 && week <= 18) return 3 // Review and mock exams
    return 1
  }

  const allowedWeek = userStats?.nextAvailableWeek || currentWeek
  const currentStage = userStats?.currentStage || 'pre-test'
  const progressMap = new Map((userStats?.weekProgress || []).map(item => [item.week, item]))

  const getWeekStatus = (weekNumber: number) => {
    // Temporarily lock weeks 2-18
    if (weekNumber > 1) return 'locked'
    
    const progress = progressMap.get(weekNumber)
    if (progress?.postCompleted) return 'completed'
    if (weekNumber < allowedWeek) return 'completed'
    if (weekNumber === allowedWeek) return 'current'
    return 'locked'
  }

  const isActivityDisabled = (weekNumber: number, type: string) => {
    // Temporarily lock weeks 2-18
    if (weekNumber > 1) return true
    
    if (weekNumber < allowedWeek) return true
    if (weekNumber > allowedWeek) return true

    const progress = progressMap.get(weekNumber)

    if (type === 'pre-test') {
      return currentStage !== 'pre-test'
    }
    if (type === 'discussion') {
      return !progress?.preCompleted
    }
    if (type === 'post-test') {
      return currentStage !== 'post-test' || !progress?.preCompleted
    }
    if (type === 'mock-exam') {
      return currentStage !== 'mock-exam'
    }

    return true
  }

  const isActivityCompleted = (weekNumber: number, type: string) => {
    const progress = progressMap.get(weekNumber)
    if (type === 'pre-test') return !!progress?.preCompleted
    if (type === 'post-test') return !!progress?.postCompleted
    if (type === 'discussion') return !!progress?.postCompleted
    if (type === 'mock-exam') return progress?.postCompleted ?? false
    return false
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">18-Week ICOPSYCH Schedule</h2>
        <p className="text-gray-600 mb-6">
          Complete schedule from March 1 - June 28, 2025. Progress through each week sequentially.
        </p>
        
        <div className="space-y-4">
          {ICOPSYCH_SCHEDULE.map((week) => {
            const status = getWeekStatus(week.week)
            const isLocked = status === 'locked'
            
            return (
              <div key={week.week} className={`border rounded-lg p-4 ${
                status === 'completed' ? 'border-green-200 bg-green-50' :
                status === 'current' ? 'border-blue-200 bg-blue-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Week {week.week}: {week.title}
                    </h3>
                    <p className="text-sm text-gray-600">{week.date}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status === 'completed' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        ✓ Completed
                      </span>
                    )}
                    {status === 'current' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Current Week
                      </span>
                    )}
                    {status === 'locked' && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        <Lock className="h-3 w-3 inline mr-1" />
                        Locked
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {week.activities.map((activity, index) => {
                    const disabled = isActivityDisabled(week.week, activity.type)
                    const completed = isActivityCompleted(week.week, activity.type)
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                        <div className="flex items-center">
                          {activity.type === 'pre-test' && <Target className="h-4 w-4 text-blue-600 mr-2" />}
                          {activity.type === 'discussion' && <BookOpen className="h-4 w-4 text-purple-600 mr-2" />}
                          {activity.type === 'post-test' && <CheckCircle className="h-4 w-4 text-green-600 mr-2" />}
                          {activity.type === 'mock-exam' && <Brain className="h-4 w-4 text-orange-600 mr-2" />}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            <p className="text-xs text-gray-600">
                              {activity.subjects.join(', ')} • {activity.time}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (activity.type === 'discussion') {
                              handleStartDiscussion(week.week, activity.subjects)
                            } else {
                              handleStartTest(week.week, activity.type, activity.subjects)
                            }
                          }}
                          disabled={disabled}
                          className={`px-3 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            activity.type === 'pre-test' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                            activity.type === 'discussion' ? 'bg-purple-600 text-white hover:bg-purple-700' :
                            activity.type === 'post-test' ? 'bg-green-600 text-white hover:bg-green-700' :
                            'bg-orange-600 text-white hover:bg-orange-700'
                          }`}
                        >
                          {completed ? 'Completed' : activity.type === 'discussion' ? 'Join' : 'Start'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TestsContent({ currentWeek }: { currentWeek: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Center</h2>
      <p className="text-gray-600">Test management coming soon...</p>
    </div>
  )
}

function ProgressContent({ userStats }: { userStats: UserStats | null }) {
  const router = useRouter()
  
  if (!userStats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress Tracking</h2>
        <p className="text-gray-600">Loading progress data...</p>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getProgressPercentage = () => {
    return Math.round((userStats.completedWeeks / userStats.totalWeeks) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Overall Progress</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">{userStats.totalTests}</div>
            <div className="text-sm text-gray-600">Tests Completed</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">{userStats.averageScore}%</div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">{userStats.completedWeeks}/{userStats.totalWeeks}</div>
            <div className="text-sm text-gray-600">Weeks Completed</div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Course Progress</span>
            <span className="font-semibold">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      {userStats.subjectPerformance && userStats.subjectPerformance.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
          <div className="space-y-4">
            {userStats.subjectPerformance.map((subject) => (
              <div key={subject.subject} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(subject.percentage)}`}>
                    {subject.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      subject.percentage >= 80 ? 'bg-green-500' :
                      subject.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${subject.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  {subject.testsCompleted} test{subject.testsCompleted !== 1 ? 's' : ''} completed
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week-by-Week Progress */}
      {userStats.weekProgress && userStats.weekProgress.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Week-by-Week Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userStats.weekProgress.slice(0, 18).map((week) => {
              const isLocked = week.week > 1
              const isCompleted = week.preCompleted && week.postCompleted
              const isInProgress = week.preCompleted && !week.postCompleted
              
              return (
                <div 
                  key={week.week} 
                  className={`p-4 rounded-lg border-2 ${
                    isLocked ? 'border-gray-200 bg-gray-50 opacity-60' :
                    isCompleted ? 'border-green-200 bg-green-50' :
                    isInProgress ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Week {week.week}</h4>
                    {isLocked && (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                    {isCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {isInProgress && (
                      <Clock className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Pre-Test</span>
                      {week.preCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-gray-400">Not started</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Post-Test</span>
                      {week.postCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-gray-400">Not started</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {userStats.recentActivity && userStats.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Test History</h3>
          <div className="space-y-3">
            {userStats.recentActivity.map((activity) => (
              <div key={activity.attemptId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    activity.score >= 80 ? 'bg-green-100' :
                    activity.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      activity.score >= 80 ? 'text-green-600' :
                      activity.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {activity.score}%
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(activity.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })} • {activity.type.replace('-', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/test/results?attemptId=${activity.attemptId}`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {userStats.totalTests === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Progress Yet</h3>
          <p className="text-gray-600 mb-4">Start taking tests to track your progress here.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

function StudyPlanContent({ recommendations }: { recommendations: Recommendation[] }) {
  const router = useRouter()
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Study Plan</h2>
        <button
          onClick={() => router.push('/study-plan')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
        >
          <Brain className="h-4 w-4 mr-2" />
          View Full Plan
        </button>
      </div>
      <p className="text-gray-600 mb-4">Personalized study recommendations based on your test performance.</p>
      
      {recommendations.length > 0 ? (
        <div className="space-y-3">
          {recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rec.priority === 'high' ? 'text-red-600 bg-red-100' :
                  rec.priority === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                  'text-green-600 bg-green-100'
                }`}>
                  {rec.priority}
                </span>
              </div>
            </div>
          ))}
          {recommendations.length > 3 && (
            <p className="text-sm text-gray-500 text-center">
              +{recommendations.length - 3} more recommendations available
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="font-medium text-red-900 mb-2">Focus Areas</h3>
            <p className="text-red-700 text-sm">Subjects needing improvement</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Strengths</h3>
            <p className="text-green-700 text-sm">Areas of excellence to maintain</p>
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarContent({ currentWeek }: { currentWeek: number }) {
  const router = useRouter()
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Study Calendar</h2>
        <button
          onClick={() => router.push('/calendar')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
        >
          <Calendar className="h-4 w-4 mr-2" />
          View Full Calendar
        </button>
      </div>
        <p className="text-gray-600 mb-4">View your ICOPSYCH schedule and manage your study time.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Current Week</h3>
          <p className="text-blue-700 text-sm">Week {currentWeek} activities</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium text-green-900 mb-2">Upcoming Tests</h3>
          <p className="text-green-700 text-sm">Pre-tests, post-tests, and mock exams</p>
        </div>
      </div>
    </div>
  )
}

function AdminContent() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Panel</h2>
      <p className="text-gray-600">Admin features coming soon...</p>
    </div>
  )
}

function UsersContent() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
      <p className="text-gray-600">User management features coming soon...</p>
    </div>
  )
}

function HelpContent() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Help & Support</h2>
      <p className="text-gray-600">Help documentation coming soon...</p>
    </div>
  )
}
