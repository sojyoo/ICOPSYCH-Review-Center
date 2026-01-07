import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        testAttempts: {
          orderBy: { completedAt: 'desc' },
          take: 20
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate stats
    const totalTests = user.testAttempts.length
    const averageScore = totalTests > 0
      ? user.testAttempts.reduce((sum, t) => sum + (t.score / t.totalQuestions) * 100, 0) / totalTests
      : 0

    let riskLevel = 'low'
    if (averageScore < 60) riskLevel = 'high'
    else if (averageScore < 75) riskLevel = 'medium'

    return NextResponse.json({
      user: {
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
          riskLevel
        },
        testHistory: user.testAttempts.map(t => ({
          id: t.id,
          testType: t.testType,
          weekNumber: t.weekNumber,
          score: Math.round((t.score / t.totalQuestions) * 100),
          totalQuestions: t.totalQuestions,
          completedAt: t.completedAt
        }))
      }
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, name, studentNumber, cohort, role } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check email uniqueness if changing email
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })
      if (emailExists) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 })
      }
    }

    // Check student number uniqueness if changing
    if (studentNumber && studentNumber !== existingUser.studentNumber) {
      const studentNumberExists = await prisma.user.findUnique({
        where: { studentNumber }
      })
      if (studentNumberExists) {
        return NextResponse.json({ error: "Student number already in use" }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (email !== undefined) updateData.email = email
    if (name !== undefined) updateData.name = name
    if (studentNumber !== undefined) updateData.studentNumber = studentNumber
    if (cohort !== undefined) updateData.cohort = cohort
    if (role !== undefined) updateData.role = role

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





