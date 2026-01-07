import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Get single question
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        questionConcepts: {
          include: {
            concept: true
          }
        }
      }
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    return NextResponse.json({
      question: {
        ...question,
        options: JSON.parse(question.options),
        concepts: question.questionConcepts.map(qc => ({
          id: qc.concept.id,
          name: qc.concept.name,
          subject: qc.concept.subject
        }))
      }
    })
  } catch (error) {
    console.error("Error fetching question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update question
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
    const { question, options, correctIndex, subject, difficulty, lecture, week, explanation, conceptIds } = body

    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Validate if provided
    if (options && (!Array.isArray(options) || options.length < 2)) {
      return NextResponse.json({ error: "Options must be an array with at least 2 items" }, { status: 400 })
    }

    if (correctIndex !== undefined && options && (correctIndex < 0 || correctIndex >= options.length)) {
      return NextResponse.json({ error: "Invalid correctIndex" }, { status: 400 })
    }

    // Update question
    const updateData: any = {}
    if (question !== undefined) updateData.question = question
    if (options !== undefined) updateData.options = JSON.stringify(options)
    if (correctIndex !== undefined) updateData.correctIndex = parseInt(correctIndex)
    if (subject !== undefined) updateData.subject = subject
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (lecture !== undefined) updateData.lecture = parseInt(lecture)
    if (week !== undefined) updateData.week = parseInt(week)
    if (explanation !== undefined) updateData.explanation = explanation || null

    const updatedQuestion = await prisma.question.update({
      where: { id: params.id },
      data: updateData
    })

    // Update concept links if provided
    if (conceptIds !== undefined) {
      // Delete existing links
      await prisma.questionConcept.deleteMany({
        where: { questionId: params.id }
      })

      // Create new links
      if (Array.isArray(conceptIds) && conceptIds.length > 0) {
        await Promise.all(conceptIds.map((conceptId: string) =>
          prisma.questionConcept.create({
            data: {
              questionId: params.id,
              conceptId: conceptId
            }
          })
        ))
      }
    }

    return NextResponse.json({ question: updatedQuestion })
  } catch (error) {
    console.error("Error updating question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: params.id }
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Delete question (cascade will handle related records)
    await prisma.question.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Question deleted successfully" })
  } catch (error) {
    console.error("Error deleting question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





