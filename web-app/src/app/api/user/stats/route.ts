import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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
      }
    })

    // Calculate stats
    const totalTests = testAttempts.length
    const averageScore = totalTests > 0 
      ? Math.round(testAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.totalQuestions) * 100, 0) / totalTests)
      : 0

    // Get completed weeks (weeks with post-test completed)
    const completedWeeks = new Set(
      testAttempts
        .filter(attempt => attempt.testType === 'post-test')
        .map(attempt => attempt.weekNumber)
    ).size

    // Calculate subject performance
    const subjectPerformance: Record<string, { correct: number, total: number, testsCompleted: number }> = {}
    
    testAttempts.forEach(attempt => {
      if (attempt.subjectScores) {
        const scores = JSON.parse(attempt.subjectScores)
        Object.entries(scores).forEach(([subject, score]: [string, any]) => {
          if (!subjectPerformance[subject]) {
            subjectPerformance[subject] = { correct: 0, total: 0, testsCompleted: 0 }
          }
          subjectPerformance[subject].correct += score.correct
          subjectPerformance[subject].total += score.total
          subjectPerformance[subject].testsCompleted += 1
        })
      }
    })

    const subjectPerformanceArray = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      percentage: Math.round((data.correct / data.total) * 100),
      testsCompleted: data.testsCompleted
    }))

    // Get recent activity (include attemptId so user can review tests)
    const recentActivity = testAttempts.slice(0, 5).map(attempt => ({
      attemptId: attempt.id,
      type: attempt.testType,
      title: `Week ${attempt.weekNumber} ${attempt.testType.replace('-', ' ')}`,
      date: attempt.completedAt?.toISOString().split('T')[0] || '',
      score: Math.round((attempt.score / attempt.totalQuestions) * 100)
    }))

    // Determine current progression
    const weekProgress = Array.from({ length: 18 }, () => ({ pre: false, post: false }))
    testAttempts.forEach(attempt => {
      if (!attempt.weekNumber) return
      const index = attempt.weekNumber - 1
      if (index < 0 || index >= weekProgress.length) return

      if (attempt.testType === 'pre-test') {
        weekProgress[index].pre = true
      } else if (attempt.testType === 'post-test') {
        weekProgress[index].post = true
      }
    })

    let nextAvailableWeek = 1  // Temporarily limit to week 1 only
    let currentStage: 'pre-test' | 'post-test' | 'mock-exam' = 'pre-test'

    // Only allow access to week 1 for now
    const week1Progress = weekProgress[0]
    if (!week1Progress.pre) {
      nextAvailableWeek = 1
      currentStage = 'pre-test'
    } else if (!week1Progress.post) {
      nextAvailableWeek = 1
      currentStage = 'post-test'
    } else {
      // Week 1 completed, but don't allow week 2 yet
      nextAvailableWeek = 1
      currentStage = 'pre-test'
    }

    await prisma.$disconnect()

    const stats = {
      totalTests,
      averageScore,
      completedWeeks,
      totalWeeks: 18,
      subjectPerformance: subjectPerformanceArray,
      recentActivity,
      nextAvailableWeek,
      currentStage,
      weekProgress: weekProgress.map((progress, index) => ({
        week: index + 1,
        preCompleted: progress.pre,
        postCompleted: progress.post
      }))
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
