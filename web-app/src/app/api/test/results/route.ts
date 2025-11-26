import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('attemptId')

    if (!attemptId) {
      return NextResponse.json({ error: "Missing attemptId" }, { status: 400 })
    }

    // Get the test attempt
    const testAttempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        questionAttempts: {
          include: {
            question: true
          }
        }
      }
    })

    if (!testAttempt) {
      return NextResponse.json({ error: "Test attempt not found" }, { status: 404 })
    }

    // Verify the test belongs to the current user
    if (testAttempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Format the response
    const result = {
      id: testAttempt.id,
      testType: testAttempt.testType,
      weekNumber: testAttempt.weekNumber,
      lecture: testAttempt.lecture,
      subjects: JSON.parse(testAttempt.subjects || '[]'),
      score: testAttempt.score,
      totalQuestions: testAttempt.totalQuestions,
      timeSpent: testAttempt.timeSpent,
      subjectScores: JSON.parse(testAttempt.subjectScores || '{}'),
      completedAt: testAttempt.completedAt?.toISOString(),
      questions: testAttempt.questionAttempts.map(qa => ({
        id: qa.question.id,
        question: qa.question.question,
        options: JSON.parse(qa.question.options),
        correctIndex: qa.question.correctIndex,
        selectedOption: qa.selectedOption,
        isCorrect: qa.isCorrect,
        subject: qa.question.subject,
        explanation: qa.question.explanation
      }))
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error fetching test result:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}


