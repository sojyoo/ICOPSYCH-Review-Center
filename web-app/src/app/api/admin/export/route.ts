import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Export test results to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('testType') // 'pre-test', 'post-test', or null for all
    const cohort = searchParams.get('cohort') // Optional cohort filter
    const format = searchParams.get('format') || 'csv' // csv or json

    // Build where clause
    const where: any = {}
    if (testType && (testType === 'pre-test' || testType === 'post-test')) {
      where.testType = testType
    }
    if (cohort) {
      where.user = { cohort }
    }

    // Fetch all test attempts with related data
    const testAttempts = await prisma.testAttempt.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            studentNumber: true,
            name: true,
            cohort: true
          }
        },
        questionAttempts: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                options: true,
                correctIndex: true,
                subject: true,
                difficulty: true
              }
            }
          }
        }
      },
      orderBy: [
        { user: { email: 'asc' } },
        { completedAt: 'asc' }
      ]
    })

    if (format === 'json') {
      // Return JSON format
      const jsonData = testAttempts.map(attempt => ({
        student: {
          email: attempt.user.email,
          studentNumber: attempt.user.studentNumber,
          name: attempt.user.name,
          cohort: attempt.user.cohort
        },
        test: {
          id: attempt.id,
          testType: attempt.testType,
          completedAt: attempt.completedAt?.toISOString(),
          weekNumber: attempt.weekNumber,
          lecture: attempt.lecture,
          subjects: attempt.subjects ? JSON.parse(attempt.subjects) : [],
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          percentage: ((attempt.score / attempt.totalQuestions) * 100).toFixed(2)
        },
        questions: attempt.questionAttempts.map(qa => {
          const options = JSON.parse(qa.question.options)
          return {
            questionId: qa.question.id,
            questionText: qa.question.question,
            subject: qa.question.subject,
            difficulty: qa.question.difficulty,
            selectedOption: qa.selectedOption,
            selectedOptionText: options[qa.selectedOption] || '',
            correctOption: qa.question.correctIndex,
            correctOptionText: options[qa.question.correctIndex] || '',
            isCorrect: qa.isCorrect,
            timeSpent: qa.timeSpent
          }
        })
      }))

      return NextResponse.json({ data: jsonData, count: jsonData.length })
    }

    // Generate CSV
    const csvRows: string[] = []

    // CSV Header
    const headers = [
      'Student Email',
      'Student Number',
      'Student Name',
      'Cohort',
      'Test Type',
      'Test Attempt ID',
      'Completed At',
      'Week Number',
      'Lecture',
      'Subjects',
      'Overall Score',
      'Overall Percentage',
      'Question ID',
      'Question Text',
      'Question Subject',
      'Question Difficulty',
      'Selected Option (Index)',
      'Selected Option (Text)',
      'Correct Option (Index)',
      'Correct Option (Text)',
      'Is Correct',
      'Time Spent (seconds)'
    ]
    csvRows.push(headers.join(','))

    // CSV Data Rows (one row per question attempt)
    for (const attempt of testAttempts) {
      const user = attempt.user
      const subjects = attempt.subjects ? JSON.parse(attempt.subjects) : []
      const overallPercentage = ((attempt.score / attempt.totalQuestions) * 100).toFixed(2)
      const completedAt = attempt.completedAt?.toISOString() || ''

      for (const qa of attempt.questionAttempts) {
        const question = qa.question
        const options = JSON.parse(question.options)
        
        const selectedOptionText = options[qa.selectedOption] || ''
        const correctOptionText = options[question.correctIndex] || ''

        // Escape CSV values (handle commas, quotes, newlines)
        const escapeCsv = (value: any): string => {
          if (value === null || value === undefined) return ''
          const str = String(value)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }

        const row = [
          escapeCsv(user.email),
          escapeCsv(user.studentNumber),
          escapeCsv(user.name),
          escapeCsv(user.cohort),
          escapeCsv(attempt.testType),
          escapeCsv(attempt.id),
          escapeCsv(completedAt),
          escapeCsv(attempt.weekNumber || ''),
          escapeCsv(attempt.lecture || ''),
          escapeCsv(Array.isArray(subjects) ? subjects.join('; ') : ''),
          escapeCsv(`${attempt.score}/${attempt.totalQuestions}`),
          escapeCsv(overallPercentage),
          escapeCsv(question.id),
          escapeCsv(question.question),
          escapeCsv(question.subject),
          escapeCsv(question.difficulty),
          escapeCsv(qa.selectedOption),
          escapeCsv(selectedOptionText),
          escapeCsv(question.correctIndex),
          escapeCsv(correctOptionText),
          escapeCsv(qa.isCorrect ? 'Yes' : 'No'),
          escapeCsv(qa.timeSpent || '')
        ]

        csvRows.push(row.join(','))
      }
    }

    const csvContent = csvRows.join('\n')

    // Return CSV file
    const filename = `test-results-export-${testType || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error("Error exporting test results:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
