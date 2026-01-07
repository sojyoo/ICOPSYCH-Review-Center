import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - List all questions with filters and search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const difficulty = searchParams.get('difficulty')
    const lecture = searchParams.get('lecture')
    const week = searchParams.get('week')
    const search = searchParams.get('search')

    const where: any = {}

    if (subject) where.subject = subject
    if (difficulty) where.difficulty = difficulty
    if (lecture) where.lecture = parseInt(lecture)
    if (week) where.week = parseInt(week)
    if (search) {
      where.question = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        questionConcepts: {
          include: {
            concept: true
          }
        },
        _count: {
          select: {
            attempts: true
          }
        }
      }
    })

    // Get usage stats for each question
    const questionsWithStats = await Promise.all(questions.map(async (q) => {
      const attempts = await prisma.questionAttempt.findMany({
        where: { questionId: q.id }
      })
      
      const totalAttempts = attempts.length
      const correctAttempts = attempts.filter(a => a.isCorrect).length
      const successRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0

      return {
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
        correctIndex: q.correctIndex,
        subject: q.subject,
        difficulty: q.difficulty,
        lecture: q.lecture,
        week: q.week,
        explanation: q.explanation,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        concepts: q.questionConcepts.map(qc => ({
          id: qc.concept.id,
          name: qc.concept.name,
          subject: qc.concept.subject
        })),
        usageStats: {
          totalAttempts,
          correctAttempts,
          successRate: Math.round(successRate * 100) / 100
        }
      }
    }))

    return NextResponse.json({ questions: questionsWithStats })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new question
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { question, options, correctIndex, subject, difficulty, lecture, week, explanation, conceptIds } = body

    if (!question || !options || correctIndex === undefined || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate options is array
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: "Options must be an array with at least 2 items" }, { status: 400 })
    }

    // Validate correctIndex
    if (correctIndex < 0 || correctIndex >= options.length) {
      return NextResponse.json({ error: "Invalid correctIndex" }, { status: 400 })
    }

    const newQuestion = await prisma.question.create({
      data: {
        question,
        options: JSON.stringify(options),
        correctIndex: parseInt(correctIndex),
        subject,
        difficulty: difficulty || 'medium',
        lecture: lecture ? parseInt(lecture) : 1,
        week: week ? parseInt(week) : 1,
        explanation: explanation || null
      }
    })

    // Link concepts if provided
    if (conceptIds && Array.isArray(conceptIds) && conceptIds.length > 0) {
      await Promise.all(conceptIds.map((conceptId: string) =>
        prisma.questionConcept.create({
          data: {
            questionId: newQuestion.id,
            conceptId: conceptId
          }
        })
      ))
    }

    return NextResponse.json({ question: newQuestion }, { status: 201 })
  } catch (error) {
    console.error("Error creating question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





