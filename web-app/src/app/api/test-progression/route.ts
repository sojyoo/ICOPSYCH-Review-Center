import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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

    // Get user's test attempts from database
    const userAttempts = await prisma.testAttempt.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        completedAt: 'asc'
      }
    })

    await prisma.$disconnect()

    // Check if user has already taken this specific test
    const existingAttempt = userAttempts.find(attempt => 
      attempt.weekNumber === week && 
      attempt.lecture === lecture && 
      attempt.testType === type
    )

    // Allow retaking pre-test 1 for testing purposes
    if (existingAttempt && !(week === 1 && lecture === 1 && type === 'pre-test')) {
      return {
        canTake: false,
        reason: 'already_completed',
        message: `You have already taken this ${type.replace('-', ' ')}. Please proceed to the next step.`
      }
    }

    const hasCompletedWeek = (weekNumber: number) =>
      userAttempts.some(
        attempt =>
          attempt.weekNumber === weekNumber &&
          attempt.testType === 'post-test'
      )

    // Check sequential progression rules
    if (type === 'pre-test') {
      // Temporarily restrict to week 1 only
      if (week > 1) {
        return {
          canTake: false,
          reason: 'week_locked',
          message: 'Weeks 2-18 are currently locked. Please complete Week 1 first.'
        }
      }
      
      if (week === 1) {
        return { canTake: true, reason: 'allowed', message: 'You can take this test.' }
      }

      return { canTake: false, reason: 'unknown', message: 'Invalid week number.' }
    }

    if (type === 'post-test') {
      // Temporarily restrict to week 1 only
      if (week > 1) {
        return {
          canTake: false,
          reason: 'week_locked',
          message: 'Weeks 2-18 are currently locked. Please complete Week 1 first.'
        }
      }
      
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

      return { canTake: true, reason: 'allowed', message: 'You can take this test.' }
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

      return { canTake: true, reason: 'allowed', message: 'You can take this test.' }
    }

    return { canTake: false, reason: 'unknown', message: 'Unknown test type.' }

  } catch (error) {
    console.error('Error checking test access:', error)
    return { canTake: false, reason: 'error', message: 'Error checking test access.' }
  }
}

