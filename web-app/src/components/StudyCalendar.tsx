'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, Plus, BookOpen, Target, AlertCircle } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  type: 'study' | 'test' | 'discussion' | 'mock-exam'
  subject?: string
  topic?: string
  description?: string
  priority?: 'high' | 'medium' | 'low'
  weekNumber?: number
}

export default function StudyCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [currentDate, viewMode])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const start = new Date(currentDate)
      const end = new Date(currentDate)

      if (viewMode === 'week') {
        start.setDate(start.getDate() - start.getDay())
        end.setDate(end.getDate() + (6 - end.getDay()))
      } else {
        start.setDate(1)
        end.setMonth(end.getMonth() + 1)
        end.setDate(0)
      }

      const response = await fetch(
        `/api/study-plan/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventColor = (type: string, priority?: string) => {
    if (type === 'test' || type === 'mock-exam') return 'bg-red-100 border-red-300 text-red-800'
    if (type === 'discussion') return 'bg-purple-100 border-purple-300 text-purple-800'
    if (priority === 'high') return 'bg-orange-100 border-orange-300 text-orange-800'
    if (priority === 'medium') return 'bg-yellow-100 border-yellow-300 text-yellow-800'
    return 'bg-blue-100 border-blue-300 text-blue-800'
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'test':
      case 'mock-exam':
        return <Target className="h-4 w-4" />
      case 'discussion':
        return <BookOpen className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const getWeekDays = () => {
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay())
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(e => {
      const eventDate = new Date(e.startTime).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    )
  }

  if (viewMode === 'week') {
    const weekDays = getWeekDays()

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                newDate.setDate(newDate.getDate() - 7)
                setCurrentDate(newDate)
              }}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ← Previous Week
            </button>
            <h3 className="text-lg font-semibold">
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                newDate.setDate(newDate.getDate() + 7)
                setCurrentDate(newDate)
              }}
              className="p-2 hover:bg-gray-100 rounded"
            >
              Next Week →
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('month')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Month View
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dayEvents = getEventsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()

            return (
              <div
                key={idx}
                className={`border rounded-lg p-2 min-h-[200px] ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-xs text-gray-500">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-2 rounded border text-xs ${getEventColor(event.type, event.priority)}`}
                    >
                      <div className="flex items-center space-x-1 mb-1">
                        {getEventIcon(event.type)}
                        <span className="font-medium truncate">{event.title}</span>
                      </div>
                      <div className="text-xs opacity-75">
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </div>
                      {event.subject && (
                        <div className="text-xs opacity-75 mt-1">{event.subject}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Month view
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days = []
  const current = new Date(startDate)
  while (current <= monthEnd || current.getDay() !== 0) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() - 1)
              setCurrentDate(newDate)
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ← Previous
          </button>
          <h3 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() + 1)
              setCurrentDate(newDate)
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            Next →
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('week')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Week View
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-700 p-2">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day)
          const isToday = day.toDateString() === new Date().toDateString()
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()

          return (
            <div
              key={idx}
              className={`border rounded p-1 min-h-[100px] ${
                isToday ? 'bg-blue-50 border-blue-300' : isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className={`text-xs mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`p-1 rounded text-xs truncate ${getEventColor(event.type, event.priority)}`}
                    title={event.title}
                  >
                    {formatTime(event.startTime)} {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}




