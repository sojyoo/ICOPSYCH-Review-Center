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

    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '0')
    const lecture = parseInt(searchParams.get('lecture') || '0')
    const subjects = searchParams.get('subjects')?.split(',') || []
    const type = searchParams.get('type') || ''

    // Check test access based on sequential progression
    const accessResult = await checkTestAccess(session.user.id, week, lecture, subjects, type)
    
    return NextResponse.json(accessResult)
  } catch (error) {
    console.error("Error checking test access:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function checkTestAccess(userId: string, week: number, lecture: number, subjects: string[], type: string) {
  try {
    const { prisma } = await import('@/lib/prisma')

    // Get test settings
    const testSettings = await prisma.testSettings.findUnique({
      where: { testType: type }
    })

    // Default settings if not found (all unlocked for demo)
    const settings = testSettings || {
      isLocked: false,
      requirePrerequisite: false,
      allowRetakes: true,
      lockedWeeks: null
    }

    let lockedWeeks: number[] = []
    try {
      if (settings.lockedWeeks) {
        lockedWeeks = JSON.parse(settings.lockedWeeks)
      }
    } catch (e) {
      // Ignore parse errors
    }

    // If test type is locked, check if this week is locked
    if (settings.isLocked && lockedWeeks.includes(week)) {
      return {
        canTake: false,
        reason: 'week_locked',
        message: `Week ${week} tests are currently locked by administrator.`
      }
    }

    // Get user's test attempts from database
    const userAttempts = await prisma.testAttempt.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        completedAt: 'asc'
      }
    })

    // Check if user has already taken this specific test
    const existingAttempt = userAttempts.find(attempt => 
      attempt.weekNumber === week && 
      attempt.lecture === lecture && 
      attempt.testType === type
    )

    // Check retake permission
    if (existingAttempt && !settings.allowRetakes) {
      return {
        canTake: false,
        reason: 'already_completed',
        message: `You have already taken this ${type.replace('-', ' ')}. Retakes are not allowed.`
      }
    }

    // Check prerequisite requirements (only if enabled)
    if (settings.requirePrerequisite) {
      if (type === 'post-test') {
        // Post-test: Must have completed pre-test for this week
        const preTestAttempt = userAttempts.find(attempt => 
          attempt.weekNumber === week && 
          attempt.lecture === lecture && 
          attempt.testType === 'pre-test'
        )

        if (!preTestAttempt) {
          return {
            canTake: false,
            reason: 'prerequisite_missing',
            message: 'You must complete the pre-test before taking the post-test.'
          }
        }
      }

      if (type === 'mock-exam') {
        // Mock exam: Must have completed all lectures (weeks 1-18)
        const completedWeeks = new Set(
          userAttempts
            .filter(attempt => attempt.testType === 'post-test')
            .map(attempt => attempt.weekNumber)
        )

        if (completedWeeks.size < 18) {
          return {
            canTake: false,
            reason: 'prerequisite_missing',
            message: 'You must complete all 18 weeks of lectures before taking the mock exam.'
          }
        }
      }
    }

    // All checks passed - allow test
    return { canTake: true, reason: 'allowed', message: 'You can take this test.' }

  } catch (error) {
    console.error('Error checking test access:', error)
    // On error, allow access for demo purposes
    return { canTake: true, reason: 'allowed', message: 'You can take this test.' }
  }
}

