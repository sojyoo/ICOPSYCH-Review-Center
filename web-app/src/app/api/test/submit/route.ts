import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Test submission API called')
    
    const session = await getServerSession(authOptions)
    
    console.log('🔍 Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id
    })
    
    if (!session?.user?.id) {
      console.log('❌ Unauthorized: No session or user ID')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log('📋 Request body:', {
      questionsCount: body.questions?.length,
      answersCount: Object.keys(body.answers || {}).length,
      testType: body.testType,
      weekNumber: body.weekNumber,
      lecture: body.lecture,
      subjects: body.subjects,
      totalScore: body.totalScore,
      totalQuestions: body.totalQuestions
    })

    const {
      questions,
      answers,
      subjectScores,
      testType,
      timeSpent,
      totalScore,
      totalQuestions,
      weekNumber,
      lecture,
      subjects
    } = body

    console.log('📊 Extracted data:', {
      questionsCount: questions?.length,
      answersCount: Object.keys(answers || {}).length,
      testType,
      weekNumber,
      lecture,
      subjectsCount: subjects?.length
    })

    // Ensure questions exist in DB (for static sources)
    if (Array.isArray(questions) && questions.length > 0) {
      const questionIds = questions.map((question: any) => question.id)
      const existingQuestions = await prisma.question.findMany({
        where: {
          id: { in: questionIds }
        },
        select: { id: true }
      })
      const existingIds = new Set(existingQuestions.map((q) => q.id))

      const questionsToCreate = questions
        .filter((question: any) => !existingIds.has(question.id))
        .map((question: any) => ({
          id: question.id,
          question: question.question,
          options: JSON.stringify(question.options || []),
          correctIndex: typeof question.correctIndex === 'number' ? question.correctIndex : 0,
          subject: question.subject || 'General Psychology',
          difficulty: question.difficulty || 'medium',
          lecture: question.lecture || lecture || 1,
          week: question.week || weekNumber || 1,
          explanation: question.explanation || ''
        }))

      if (questionsToCreate.length > 0) {
        console.log(`🆕 Creating ${questionsToCreate.length} new question records`)
        await prisma.question.createMany({
          data: questionsToCreate
        })
      }
    }

    // Create test attempt record
    console.log('💾 Creating test attempt...')
    const testAttempt = await prisma.testAttempt.create({
      data: {
        userId: session.user.id,
        testType: testType,
        weekNumber: weekNumber,
        lecture: lecture,
        subjects: JSON.stringify(subjects),
        score: totalScore,
        totalQuestions: totalQuestions,
        timeSpent: timeSpent,
        subjectScores: JSON.stringify(subjectScores),
        completedAt: new Date()
      }
    })
    
    console.log('✅ Test attempt created:', testAttempt.id)

    // Create question attempt records
    console.log('💾 Creating question attempts...')
    const questionAttempts = questions.map((question: any) => {
      const hasAnswer = Object.prototype.hasOwnProperty.call(answers || {}, question.id)
      const selectedOption = hasAnswer ? answers[question.id] : -1

      return {
        testAttemptId: testAttempt.id,
        questionId: question.id,
        selectedOption,
        isCorrect: selectedOption === question.correctIndex,
        timeSpent: Math.floor(timeSpent / totalQuestions) // Estimate time per question
      }
    })

    console.log('📝 Question attempts to create:', questionAttempts.length)
    await prisma.questionAttempt.createMany({
      data: questionAttempts
    })
    
    console.log('✅ Question attempts created successfully')

    return NextResponse.json({
      success: true,
      attemptId: testAttempt.id,
      score: totalScore,
      totalQuestions: totalQuestions,
      percentage: Math.round((totalScore / totalQuestions) * 100)
    })

  } catch (error) {
    console.error("❌ Error submitting test:", error)
    
    // Log more specific error details
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    
    // Check if it's a Prisma error
    if (error && typeof error === 'object' && 'code' in error) {
      console.error("Prisma error code:", error.code)
      console.error("Prisma error meta:", error.meta)
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
