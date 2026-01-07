import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users
    const users = await prisma.user.findMany({
      include: {
        testAttempts: true
      }
    })

    // Get all cohorts
    const cohorts = await prisma.cohort.findMany({
      include: {
        users: {
          include: {
            testAttempts: true
          }
        }
      }
    })

    // Get all questions
    const questions = await prisma.question.findMany({
      include: {
        attempts: true
      }
    })

    // Get all test attempts
    const allAttempts = await prisma.testAttempt.findMany({
      orderBy: { completedAt: 'desc' }
    })

    // Cohort performance
    const cohortPerformance = cohorts.map(cohort => {
      const cohortAttempts = cohort.users.flatMap(u => u.testAttempts)
      const averageScore = cohortAttempts.length > 0
        ? cohortAttempts.reduce((sum, t) => sum + (t.score / t.totalQuestions) * 100, 0) / cohortAttempts.length
        : 0
      
      return {
        name: cohort.name,
        totalUsers: cohort.users.length,
        totalTests: cohortAttempts.length,
        averageScore: Math.round(averageScore * 100) / 100,
        completionRate: cohort.users.length > 0
          ? (cohort.users.filter(u => u.testAttempts.length > 0).length / cohort.users.length) * 100
          : 0
      }
    })

    // Question statistics
    const questionStats = questions.map(q => {
      const attempts = q.attempts
      const totalAttempts = attempts.length
      const correctAttempts = attempts.filter(a => a.isCorrect).length
      const successRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0

      return {
        id: q.id,
        subject: q.subject,
        difficulty: q.difficulty,
        totalAttempts,
        correctAttempts,
        successRate: Math.round(successRate * 100) / 100
      }
    })

    // User activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentAttempts = allAttempts.filter(a => 
      a.completedAt && a.completedAt >= thirtyDaysAgo
    )

    // Overall statistics
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.testAttempts.length > 0).length
    const totalTests = allAttempts.length
    const overallAverageScore = allAttempts.length > 0
      ? allAttempts.reduce((sum, t) => sum + (t.score / t.totalQuestions) * 100, 0) / allAttempts.length
      : 0

    // Test type breakdown
    const testTypeBreakdown = {
      'pre-test': allAttempts.filter(t => t.testType === 'pre-test').length,
      'post-test': allAttempts.filter(t => t.testType === 'post-test').length,
      'mock-exam': allAttempts.filter(t => t.testType === 'mock-exam').length
    }

    // Subject performance
    const subjectPerformance: Record<string, { total: number, correct: number }> = {}
    allAttempts.forEach(attempt => {
      if (attempt.subjectScores) {
        try {
          const scores = JSON.parse(attempt.subjectScores)
          Object.entries(scores).forEach(([subject, score]: [string, any]) => {
            if (!subjectPerformance[subject]) {
              subjectPerformance[subject] = { total: 0, correct: 0 }
            }
            subjectPerformance[subject].total += score.total || 0
            subjectPerformance[subject].correct += score.correct || 0
          })
        } catch (e) {
          // Skip invalid JSON
        }
      }
    })

    const subjectPerformanceArray = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      averageScore: data.total > 0 ? Math.round((data.correct / data.total) * 100 * 100) / 100 : 0,
      totalQuestions: data.total,
      correctAnswers: data.correct
    }))

    return NextResponse.json({
      overall: {
        totalUsers,
        activeUsers,
        totalTests,
        overallAverageScore: Math.round(overallAverageScore * 100) / 100,
        recentActivity: recentAttempts.length
      },
      cohortPerformance,
      questionStats: questionStats.slice(0, 50), // Top 50 questions
      testTypeBreakdown,
      subjectPerformance: subjectPerformanceArray
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





