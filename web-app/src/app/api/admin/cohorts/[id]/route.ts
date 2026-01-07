import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Get single cohort with users
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cohort = await prisma.cohort.findUnique({
      where: { id: params.id },
      include: {
        users: {
          include: {
            _count: {
              select: {
                testAttempts: true
              }
            }
          }
        }
      }
    })

    if (!cohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 })
    }

    return NextResponse.json({ cohort })
  } catch (error) {
    console.error("Error fetching cohort:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update cohort
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
    const { name, description, startDate, endDate, userIds } = body

    // Check if cohort exists
    const existingCohort = await prisma.cohort.findUnique({
      where: { id: params.id }
    })

    if (!existingCohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 })
    }

    // Check name uniqueness if changing
    if (name && name !== existingCohort.name) {
      const nameExists = await prisma.cohort.findUnique({
        where: { name }
      })
      if (nameExists) {
        return NextResponse.json({ error: "Cohort name already exists" }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null

    const updatedCohort = await prisma.cohort.update({
      where: { id: params.id },
      data: updateData
    })

    // Assign users to cohort if provided
    if (userIds && Array.isArray(userIds)) {
      await prisma.user.updateMany({
        where: {
          id: { in: userIds }
        },
        data: {
          cohortId: params.id,
          cohort: updatedCohort.name
        }
      })
    }

    return NextResponse.json({ cohort: updatedCohort })
  } catch (error) {
    console.error("Error updating cohort:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete cohort
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: params.id }
    })

    if (!cohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 })
    }

    // Remove cohort assignment from users
    await prisma.user.updateMany({
      where: { cohortId: params.id },
      data: {
        cohortId: null,
        cohort: null
      }
    })

    // Delete cohort
    await prisma.cohort.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Cohort deleted successfully" })
  } catch (error) {
    console.error("Error deleting cohort:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





