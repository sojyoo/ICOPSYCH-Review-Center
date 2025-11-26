import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { prisma } = await import('@/lib/prisma')

    // Get user's test attempts
    const testAttempts = await prisma.testAttempt.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        completedAt: 'desc'
      },
      select: {
        id: true,
        testType: true,
        weekNumber: true,
        lecture: true,
        subjects: true,
        score: true,
        totalQuestions: true,
        completedAt: true
      }
    })

    // Format attempts for the calendar
    const formattedAttempts = testAttempts.map(attempt => ({
      id: attempt.id,
      testType: attempt.testType,
      weekNumber: attempt.weekNumber,
      lecture: attempt.lecture,
      subjects: attempt.subjects ? JSON.parse(attempt.subjects) : [],
      score: attempt.totalQuestions > 0 
        ? Math.round((attempt.score / attempt.totalQuestions) * 100)
        : 0,
      completedAt: attempt.completedAt.toISOString()
    }))

    return NextResponse.json({ 
      attempts: formattedAttempts 
    })
  } catch (error) {
    console.error("Error fetching test attempts:", error)
    return NextResponse.json(
      { error: "Failed to fetch test attempts" },
      { status: 500 }
    )
  }
}

