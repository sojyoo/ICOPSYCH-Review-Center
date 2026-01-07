import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - List all users with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohort = searchParams.get('cohort')
    const role = searchParams.get('role')
    const riskLevel = searchParams.get('riskLevel')
    const search = searchParams.get('search')

    const where: any = {}

    if (cohort) where.cohort = cohort
    if (role) where.role = role
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { studentNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Note: Risk level filtering happens after fetching (calculated from scores)

    const users = await prisma.user.findMany({
      where,
      include: {
        testAttempts: {
          orderBy: { completedAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            testAttempts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate risk level and stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const testAttempts = await prisma.testAttempt.findMany({
        where: { userId: user.id },
        orderBy: { completedAt: 'desc' },
        take: 10
      })

      const totalTests = testAttempts.length
      const averageScore = totalTests > 0
        ? testAttempts.reduce((sum, t) => sum + (t.score / t.totalQuestions) * 100, 0) / totalTests
        : 0

      // Determine risk level based on average score
      let userRiskLevel = 'low'
      if (averageScore < 60) userRiskLevel = 'high'
      else if (averageScore < 75) userRiskLevel = 'medium'

      // Filter by risk level if requested
      if (riskLevel && userRiskLevel !== riskLevel) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        studentNumber: user.studentNumber,
        role: user.role,
        cohort: user.cohort,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stats: {
          totalTests,
          averageScore: Math.round(averageScore * 100) / 100,
          riskLevel: userRiskLevel
        },
        recentTests: testAttempts.slice(0, 5).map(t => ({
          id: t.id,
          testType: t.testType,
          score: Math.round((t.score / t.totalQuestions) * 100),
          completedAt: t.completedAt
        }))
      }
    }))

    // Filter out nulls if risk level filter was applied
    const filteredUsers = usersWithStats.filter(u => u !== null)

    return NextResponse.json({ users: filteredUsers })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

