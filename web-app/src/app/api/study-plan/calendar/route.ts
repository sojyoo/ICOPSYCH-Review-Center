import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentWeek, ICOPSYCH_SCHEDULE } from "@/lib/schedule"

export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 })
    }

    const events = await getCalendarEvents(session.user.id, startDate, endDate)
    
    return NextResponse.json({ events })

  } catch (error) {
    console.error("Error fetching calendar events:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, startTime, endTime, type, subject, topic, description, priority } = body

    if (!title || !startTime || !endTime || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create calendar event
    const event = await prisma.calendarEvent.create({
      data: {
        userId: session.user.id,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type,
        subjects: subject ? JSON.stringify([subject]) : null,
        description: description || null
      }
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error("Error creating calendar event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getCalendarEvents(userId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Get scheduled study plan events
  const weeklyPlanResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/study-plan/weekly?week=${getCurrentWeek()}`)
  if (weeklyPlanResponse.ok) {
    const planData = await weeklyPlanResponse.json()
    const plan = planData.plan

    if (plan && plan.dailyPlan) {
      plan.dailyPlan.forEach((day: any) => {
        const dayDate = new Date(day.date)
        if (dayDate >= start && dayDate <= end) {
          day.timeSlots.forEach((slot: any) => {
            const startDateTime = new Date(dayDate)
            const [startHour, startMin] = slot.startTime.split(':').map(Number)
            startDateTime.setHours(startHour, startMin, 0, 0)

            const endDateTime = new Date(dayDate)
            const [endHour, endMin] = slot.endTime.split(':').map(Number)
            endDateTime.setHours(endHour, endMin, 0, 0)

            if (startDateTime >= start && endDateTime <= end) {
              events.push({
                id: `study-${day.date}-${slot.startTime}`,
                title: slot.topic,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                type: slot.type === 'prep' ? 'test' : 'study',
                subject: slot.subject,
                topic: slot.topic,
                description: slot.description,
                priority: slot.priority,
                weekNumber: plan.week
              })
            }
          })
        }
      })
    }
  }

  // Get ICOPSYCH schedule events
  ICOPSYCH_SCHEDULE.forEach(week => {
    const weekStart = getWeekStartDate(week.week)
    week.activities.forEach(activity => {
      const activityDate = new Date(weekStart)
      // Pre-test on Monday, post-test on Friday, discussion on Wednesday
      if (activity.type === 'pre-test') {
        activityDate.setDate(activityDate.getDate() + 0)
      } else if (activity.type === 'post-test') {
        activityDate.setDate(activityDate.getDate() + 4)
      } else if (activity.type === 'discussion') {
        activityDate.setDate(activityDate.getDate() + 2)
      } else {
        activityDate.setDate(activityDate.getDate() + 0)
      }

      if (activityDate >= start && activityDate <= end) {
        const [timeStart, timeEnd] = activity.time.split(' - ')
        const startDateTime = new Date(activityDate)
        const [startHour, startMin, period] = parseTime(timeStart)
        startDateTime.setHours(startHour + (period === 'PM' && startHour !== 12 ? 12 : 0), startMin, 0, 0)

        const endDateTime = new Date(activityDate)
        const [endHour, endMin, endPeriod] = parseTime(timeEnd)
        endDateTime.setHours(endHour + (endPeriod === 'PM' && endHour !== 12 ? 12 : 0), endMin, 0, 0)

        events.push({
          id: `schedule-${week.week}-${activity.type}`,
          title: activity.title,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          type: activity.type === 'mock-exam' ? 'mock-exam' : activity.type === 'discussion' ? 'discussion' : 'test',
          subject: activity.subjects[0],
          description: `${activity.type} for ${activity.subjects.join(', ')}`,
          weekNumber: week.week
        })
      }
    })
  })

  // Get user's test attempts
  const testAttempts = await prisma.testAttempt.findMany({
    where: {
      userId,
      completedAt: {
        gte: start,
        lte: end
      }
    },
    orderBy: { completedAt: 'desc' }
  })

  testAttempts.forEach(attempt => {
    if (attempt.completedAt) {
      events.push({
        id: `test-${attempt.id}`,
        title: `${attempt.testType} - Completed`,
        startTime: attempt.completedAt.toISOString(),
        endTime: new Date(attempt.completedAt.getTime() + (attempt.timeSpent * 1000)).toISOString(),
        type: 'test',
        subject: attempt.subjects ? JSON.parse(attempt.subjects)[0] : undefined,
        description: `Score: ${Math.round((attempt.score / attempt.totalQuestions) * 100)}%`
      })
    }
  })

  // Get user's custom calendar events
  const customEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      startTime: {
        gte: start,
        lte: end
      }
    }
  })

  customEvents.forEach(event => {
    events.push({
      id: event.id,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      type: event.type as any,
      subject: event.subjects ? JSON.parse(event.subjects)[0] : undefined,
      description: event.description || undefined
    })
  })

  return events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

function getWeekStartDate(weekNumber: number): Date {
  const PROGRAM_START_DATE = new Date('2025-03-01T00:00:00')
  const weekStart = new Date(PROGRAM_START_DATE)
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7)
  return weekStart
}

function parseTime(timeStr: string): [number, number, string] {
  const [time, period] = timeStr.split(' ')
  const [hour, min] = time.split(':').map(Number)
  return [hour, min, period || 'AM']
}




