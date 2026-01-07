import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - List all cohorts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cohorts = await prisma.cohort.findMany({
      include: {
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const cohortsWithStats = await Promise.all(cohorts.map(async (cohort) => {
      const users = await prisma.user.findMany({
        where: { cohortId: cohort.id },
        include: {
          testAttempts: true
        }
      })

      const totalUsers = users.length
      const usersWithTests = users.filter(u => u.testAttempts.length > 0).length
      
      // Calculate average score for cohort
      const allAttempts = users.flatMap(u => u.testAttempts)
      const averageScore = allAttempts.length > 0
        ? allAttempts.reduce((sum, t) => sum + (t.score / t.totalQuestions) * 100, 0) / allAttempts.length
        : 0

      return {
        id: cohort.id,
        name: cohort.name,
        description: cohort.description,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        createdAt: cohort.createdAt,
        updatedAt: cohort.updatedAt,
        stats: {
          totalUsers,
          usersWithTests,
          averageScore: Math.round(averageScore * 100) / 100
        }
      }
    }))

    return NextResponse.json({ cohorts: cohortsWithStats })
  } catch (error) {
    console.error("Error fetching cohorts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new cohort
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, startDate, endDate } = body

    if (!name) {
      return NextResponse.json({ error: "Cohort name is required" }, { status: 400 })
    }

    // Check if cohort name already exists
    const existingCohort = await prisma.cohort.findUnique({
      where: { name }
    })

    if (existingCohort) {
      return NextResponse.json({ error: "Cohort name already exists" }, { status: 400 })
    }

    const newCohort = await prisma.cohort.create({
      data: {
        name,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    })

    return NextResponse.json({ cohort: newCohort }, { status: 201 })
  } catch (error) {
    console.error("Error creating cohort:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





