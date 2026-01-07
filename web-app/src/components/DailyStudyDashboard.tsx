'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, Target, CheckCircle, AlertCircle, TrendingUp, BookOpen, Play, Pause, Square, ChevronRight, ChevronLeft } from 'lucide-react'

interface TodayTask {
  id: string
  title: string
  time: string
  duration: number
  subject: string
  topic: string
  type: 'review' | 'practice' | 'lecture' | 'prep'
  priority: 'high' | 'medium' | 'low'
  description: string
  completed: boolean
  startTime?: Date
  endTime?: Date
}

interface DailyStats {
  todayHours: number
  todayTarget: number
  weekHours: number
  weekTarget: number
  completedTasks: number
  totalTasks: number
  streak: number
}

export default function DailyStudyDashboard() {
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([])
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionActive, setSessionActive] = useState(false)
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadTodayPlan()
    loadStats()
  }, [])

  useEffect(() => {
    if (sessionActive && !paused) {
      intervalRef.current = setInterval(() => {
        if (sessionStartTime) {
          const elapsed = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
          setElapsedTime(elapsed)
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [sessionActive, paused, sessionStartTime])

  const loadTodayPlan = async () => {
    try {
      setLoading(true)
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      // Get weekly plan
      const weekResponse = await fetch(`/api/study-plan/weekly?week=${getCurrentWeek()}`)
      if (weekResponse.ok) {
        const planData = await weekResponse.json()
        const plan = planData.plan

        // Find today's tasks
        const todayPlan = plan.dailyPlan.find((d: any) => d.date === todayStr)

        if (todayPlan) {
          const tasks: TodayTask[] = todayPlan.timeSlots.map((slot: any, idx: number) => ({
            id: `task-${todayStr}-${idx}`,
            title: slot.topic,
            time: `${slot.startTime} - ${slot.endTime}`,
            duration: slot.duration,
            subject: slot.subject,
            topic: slot.topic,
            type: slot.type,
            priority: slot.priority,
            description: slot.description,
            completed: false
          }))
          setTodayTasks(tasks)
        }
      }
    } catch (error) {
      console.error('Error loading today plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
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
        const sessions = data.sessions || []
        const statsData = data.stats || { totalHours: 0, todayHours: 0, totalSessions: 0, streak: 0 }

        // Calculate today's completed tasks from sessions
        const todayStr = today.toISOString().split('T')[0]
        const todaySessions = sessions.filter((s: any) => {
          const sessionDate = new Date(s.startTime).toISOString().split('T')[0]
          return sessionDate === todayStr
        })

        const todayHours = statsData.todayHours || 0
        const weekHours = statsData.totalHours || 0

        // Get weekly plan for target
        const weekResponse = await fetch(`/api/study-plan/weekly?week=${getCurrentWeek()}`)
        let weekTarget = 10
        if (weekResponse.ok) {
          const planData = await weekResponse.json()
          weekTarget = planData.plan.recommendedHours || 10
        }

        const todayTarget = todayTasks.reduce((sum, t) => sum + t.duration, 0) / 60
        const completedTasks = todayTasks.filter(t => t.completed).length

        setStats({
          todayHours,
          todayTarget: todayTarget || 2.5,
          weekHours,
          weekTarget,
          completedTasks,
          totalTasks: todayTasks.length,
          streak: statsData.streak || 0
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleStartSession = () => {
    setSessionActive(true)
    setSessionStartTime(new Date())
    setElapsedTime(0)
    setPaused(false)
    setCurrentTaskIndex(0)
  }

  const handlePauseResume = () => {
    setPaused(!paused)
  }

  const handleEndSession = async () => {
    if (!sessionStartTime) return

    const endTime = new Date()
    const totalMinutes = Math.floor(elapsedTime / 60)
    
    if (totalMinutes > 0) {
      // Log the study session
      try {
        const completedTasks = todayTasks.filter(t => t.completed)
        const subjects = [...new Set(completedTasks.map(t => t.subject))]
        const description = `Completed ${completedTasks.length} tasks: ${completedTasks.map(t => t.topic).join(', ')}`

        await fetch('/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Study Session - ${completedTasks.length} tasks completed`,
            startTime: sessionStartTime.toISOString(),
            endTime: endTime.toISOString(),
            subject: subjects[0] || 'General',
            description: description
          })
        })

        // Reload stats
        await loadStats()
      } catch (error) {
        console.error('Error logging session:', error)
      }
    }

    setSessionActive(false)
    setSessionStartTime(null)
    setElapsedTime(0)
    setPaused(false)
  }

  const handleTaskComplete = async (taskId: string) => {
    const updatedTasks = todayTasks.map(t => {
      if (t.id === taskId) {
        const now = new Date()
        return {
          ...t,
          completed: !t.completed,
          startTime: !t.completed ? now : undefined,
          endTime: !t.completed ? undefined : new Date(now.getTime() + t.duration * 60 * 1000)
        }
      }
      return t
    })
    setTodayTasks(updatedTasks)

    // Update stats
    const completedTasks = updatedTasks.filter(t => t.completed).length
    const todayHours = updatedTasks.reduce((sum, t) => sum + (t.completed ? t.duration : 0), 0) / 60
    if (stats) {
      setStats({
        ...stats,
        completedTasks,
        todayHours
      })
    }

    // Auto-advance to next incomplete task
    if (sessionActive) {
      const nextIncompleteIndex = updatedTasks.findIndex((t, idx) => idx > currentTaskIndex && !t.completed)
      if (nextIncompleteIndex !== -1) {
        setCurrentTaskIndex(nextIncompleteIndex)
      }
    }
  }

  const handleNextTask = () => {
    const nextIndex = todayTasks.findIndex((t, idx) => idx > currentTaskIndex && !t.completed)
    if (nextIndex !== -1) {
      setCurrentTaskIndex(nextIndex)
    }
  }

  const handlePreviousTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1)
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50'
      case 'medium': return 'border-yellow-300 bg-yellow-50'
      case 'low': return 'border-green-300 bg-green-50'
      default: return 'border-gray-300 bg-gray-50'
    }
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
        <p className="text-gray-600">Loading today's study plan...</p>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const currentTask = todayTasks[currentTaskIndex]
  const completedCount = todayTasks.filter(t => t.completed).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Today's Study Plan</h2>
            <p className="text-indigo-100">{today}</p>
          </div>
          {!sessionActive && todayTasks.length > 0 && (
            <button
              onClick={handleStartSession}
              className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 flex items-center transition-colors"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Study Session
            </button>
          )}
        </div>
      </div>

      {/* Session Timer (when active) */}
      {sessionActive && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Study Session Active</h3>
              <p className="text-sm text-gray-600">
                Task {currentTaskIndex + 1} of {todayTasks.length} • {completedCount} completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{formatTime(elapsedTime)}</div>
              <div className="text-sm text-gray-500">Elapsed Time</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePauseResume}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center"
            >
              {paused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              End Session
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.todayHours.toFixed(1)}h / {stats.todayTarget.toFixed(1)}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (stats.todayHours / stats.todayTarget) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Week Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.weekHours.toFixed(1)}h / {stats.weekTarget}h
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (stats.weekHours / stats.weekTarget) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completedTasks} / {stats.totalTasks}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Study Streak</p>
                <p className="text-2xl font-bold text-gray-900">{stats.streak} days</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Today's Study Tasks</h3>
            {sessionActive && todayTasks.length > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousTask}
                  disabled={currentTaskIndex === 0}
                  className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {currentTaskIndex + 1} / {todayTasks.length}
                </span>
                <button
                  onClick={handleNextTask}
                  disabled={currentTaskIndex === todayTasks.length - 1}
                  className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-6">
          {todayTasks.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No study tasks scheduled for today</p>
              <p className="text-sm text-gray-500 mt-2">Check your weekly plan for upcoming tasks</p>
            </div>
          ) : sessionActive && currentTask ? (
            // Focused view during active session
            <div className="space-y-4">
              <div className={`p-6 rounded-lg border-2 ${getPriorityColor(currentTask.priority)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getTypeIcon(currentTask.type)}</span>
                      <h4 className="text-xl font-semibold text-gray-900">{currentTask.title}</h4>
                    </div>
                    <p className="text-gray-700 mb-4">{currentTask.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {currentTask.time} ({currentTask.duration} min)
                      </span>
                      <span>{currentTask.subject}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        currentTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                        currentTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {currentTask.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => handleTaskComplete(currentTask.id)}
                    className={`px-8 py-4 rounded-lg font-semibold text-lg flex items-center ${
                      currentTask.completed
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {currentTask.completed ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Task Completed
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{completedCount} / {todayTasks.length} tasks completed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all"
                    style={{ width: `${(completedCount / todayTasks.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            // List view when session not active
            <div className="space-y-4">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border-2 ${
                    task.completed ? 'opacity-60' : ''
                  } ${getPriorityColor(task.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <button
                        onClick={() => handleTaskComplete(task.id)}
                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          task.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {task.completed && <CheckCircle className="h-4 w-4 text-white" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{getTypeIcon(task.type)}</span>
                          <h4 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {task.time} ({task.duration} min)
                          </span>
                          <span>{task.subject}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority} priority
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {!sessionActive && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <Target className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">Take Practice Test</p>
              <p className="text-sm text-gray-600">Assess your knowledge</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <BookOpen className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">Review Weak Topics</p>
              <p className="text-sm text-gray-600">Focus on areas needing improvement</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <TrendingUp className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">View Progress</p>
              <p className="text-sm text-gray-600">See your study statistics</p>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function getCurrentWeek(): number {
  const PROGRAM_START_DATE = new Date('2025-03-01T00:00:00')
  const now = new Date()
  const diffMs = now.getTime() - PROGRAM_START_DATE.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, Math.min(18, diffWeeks + 1))
}
