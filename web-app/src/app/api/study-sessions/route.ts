import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Get study sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { userId: session.user.id }
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // For now, we'll use calendar events as study sessions
    // In the future, we can create a dedicated StudySession model
    const sessions = await prisma.calendarEvent.findMany({
      where: {
        ...where,
        type: 'study'
      },
      orderBy: {
        startTime: 'desc'
      }
    })

    // Calculate stats
    const totalHours = sessions.reduce((sum, s) => {
      const duration = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60)
      return sum + duration
    }, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime)
      sessionDate.setHours(0, 0, 0, 0)
      return sessionDate.getTime() === today.getTime()
    })
    const todayHours = todaySessions.reduce((sum, s) => {
      const duration = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60)
      return sum + duration
    }, 0)

    // Calculate streak
    const streak = calculateStreak(sessions)

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subjects ? JSON.parse(s.subjects)[0] : null,
        description: s.description
      })),
      stats: {
        totalHours: Math.round(totalHours * 100) / 100,
        todayHours: Math.round(todayHours * 100) / 100,
        totalSessions: sessions.length,
        streak
      }
    })
  } catch (error) {
    console.error("Error fetching study sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Log a study session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, startTime, endTime, subject, topic, description } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create study session as calendar event
    const studySession = await prisma.calendarEvent.create({
      data: {
        userId: session.user.id,
        title: title || 'Study Session',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type: 'study',
        subjects: subject ? JSON.stringify([subject]) : null,
        description: description || null
      }
    })

    return NextResponse.json({ session: studySession }, { status: 201 })
  } catch (error) {
    console.error("Error creating study session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateStreak(sessions: any[]): number {
  if (sessions.length === 0) return 0

  // Sort by date descending
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // Check if there's a session today
  const todaySession = sortedSessions.find(s => {
    const sessionDate = new Date(s.startTime)
    sessionDate.setHours(0, 0, 0, 0)
    return sessionDate.getTime() === currentDate.getTime()
  })

  if (!todaySession) {
    // If no session today, check yesterday
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Count consecutive days with sessions
  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const hasSession = sortedSessions.some(s => {
      const sessionDate = new Date(s.startTime)
      sessionDate.setHours(0, 0, 0, 0)
      return sessionDate.toISOString().split('T')[0] === dateStr
    })

    if (hasSession) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}




