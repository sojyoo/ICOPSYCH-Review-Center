import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import devPsychPre from '@/data/dev-psych-pre.json'
import devPsychPost from '@/data/dev-psych-post.json'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔍 Questions API - Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('❌ Questions API - Unauthorized: No session or user ID')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '0')
    const lecture = parseInt(searchParams.get('lecture') || '0')
    const subjects = searchParams.get('subjects')?.split(',') || []
    const type = searchParams.get('type') || ''

    // Load questions from the MACALALAY folder
    const questions = await loadQuestions(week, lecture, subjects, type)
    
    return NextResponse.json({ questions })
  } catch (error) {
    console.error("Error loading questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function loadQuestions(week: number, lecture: number, subjects: string[], type: string) {
  try {
    const normalizedSubjects = subjects.map((subject) => subject.toLowerCase())
    const isDevPsychWeekOne =
      week === 1 && normalizedSubjects.some((subject) => subject.includes('developmental'))

    if (isDevPsychWeekOne && (type === 'pre-test' || type === 'post-test')) {
      const preSubset = devPsychPre.questions.slice(0, 10)
      const postSubset = preSubset.map((preQuestion) => {
        const match = devPsychPost.questions.find(
          (postQuestion) => postQuestion.question.trim() === preQuestion.question.trim()
        )
        return match || preQuestion
      })

      const bank = type === 'pre-test' ? preSubset : postSubset

      const staticQuestions = bank.map((question: any, index) => ({
        id: `dev-psych-${type}-${index + 1}`,
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        subject: question.subject || 'Developmental Psychology',
        difficulty: 'standard',
        explanation: question.explanation || '',
        week: question.week || 1,
        lecture: question.lecture || 1,
      }))

      return staticQuestions
    }

    const { prisma } = await import('@/lib/prisma')

    // Build the where clause for filtering
    const whereClause: any = {}
    
    // Filter by subjects if provided
    if (subjects.length > 0) {
      whereClause.subject = {
        in: subjects
      }
    }
    
    // Note: We'll use the same questions for both pre-test and post-test, but shuffle for post-tests
    // Mock exams will use all available questions

    console.log('🔍 Querying database with whereClause:', whereClause)

    // Load questions from database
    let questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: {
        id: 'asc'
      }
    })

    console.log(`🔍 Found ${questions.length} questions for subjects: ${subjects.join(', ')}`)

    // Convert Prisma results to the expected format
    let formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options), // Parse JSON string back to array
      correctIndex: q.correctIndex,
      subject: q.subject,
      difficulty: q.difficulty,
      explanation: q.explanation,
      week: q.week,
      lecture: q.lecture
    }))

    // Remove duplicate questions based on question text
    const uniqueQuestions = formattedQuestions.filter((question, index, self) => 
      index === self.findIndex(q => q.question === question.question)
    )

    console.log(`🔍 After removing duplicates: ${uniqueQuestions.length} unique questions`)

    // If we don't have enough unique questions for the requested subjects, 
    // supplement with questions from all subjects
    if (uniqueQuestions.length < 10 && type !== 'mock-exam') {
      console.log('📚 Not enough unique questions, supplementing with all subjects...')
      
      const allQuestions = await prisma.question.findMany({
        orderBy: { id: 'asc' }
      })
      
      const allFormattedQuestions = allQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
        correctIndex: q.correctIndex,
        subject: q.subject,
        difficulty: q.difficulty,
        explanation: q.explanation,
        week: q.week,
        lecture: q.lecture
      }))
      
      const allUniqueQuestions = allFormattedQuestions.filter((question, index, self) => 
        index === self.findIndex(q => q.question === question.question)
      )
      
      // Combine with original questions, prioritizing the requested subjects
      const combinedQuestions = [...uniqueQuestions]
      allUniqueQuestions.forEach(q => {
        if (!combinedQuestions.find(existing => existing.question === q.question)) {
          combinedQuestions.push(q)
        }
      })
      
      console.log(`📚 Combined questions: ${combinedQuestions.length} total`)
      formattedQuestions = combinedQuestions
    } else {
      formattedQuestions = uniqueQuestions
    }

    // Limit questions based on test type, but use all available if less than limit
    const questionLimit = type === 'mock-exam' ? 100 : 10
    if (type === 'mock-exam') {
      formattedQuestions = shuffleArray(formattedQuestions)
    }
    const finalQuestions = formattedQuestions.slice(0, Math.min(questionLimit, formattedQuestions.length))

    // Add warning if not enough questions
    if (finalQuestions.length < questionLimit) {
      console.warn(`Only ${finalQuestions.length} questions available for ${type} (requested: ${questionLimit})`)
    }

    console.log(`✅ Returning ${finalQuestions.length} questions for ${type}`)
    formattedQuestions = finalQuestions

    await prisma.$disconnect()
    return formattedQuestions

  } catch (error) {
    console.error("Error loading questions from database:", error)
    
    // Fallback to mock questions if database fails
    return generateMockQuestions(week, lecture, subjects, type)
  }
}

function matchesWeekAndLecture(question: any, week: number, lecture: number): boolean {
  // Map weeks to lectures based on ICOPSYCH schedule:
  // Weeks 1-6: Lecture 1 (Abnormal Psychology, Industrial Psychology)
  // Weeks 7-12: Lecture 2 (Clinical Psychology, Social Psychology)  
  // Weeks 13-18: Lecture 3 (Advanced Topics, Review)
  
  const questionLecture = getLectureForWeek(question.week || 1)
  return questionLecture === lecture
}

function getLectureForWeek(week: number): number {
  if (week >= 1 && week <= 6) return 1
  if (week >= 7 && week <= 12) return 2
  if (week >= 13 && week <= 18) return 3
  return 1
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function generateMockQuestions(week: number, lecture: number, subjects: string[], type: string) {
  const questionCount = type === 'mock-exam' ? 100 : 10
  const questions = []

  for (let i = 1; i <= questionCount; i++) {
    const subject = subjects[i % subjects.length] || 'General Psychology'
    questions.push({
      id: `mock-${week}-${lecture}-${type}-${i}`,
      question: `This is a mock question ${i} for Week ${week}, Lecture ${lecture}, ${type}. What is the correct answer?`,
      options: [
        'Option A - First choice',
        'Option B - Second choice', 
        'Option C - Third choice',
        'Option D - Fourth choice'
      ],
      correctIndex: i % 4,
      subject: subject,
      difficulty: i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy',
      explanation: `This is the explanation for mock question ${i}.`,
      week: week,
      lecture: lecture
    })
  }

  return questions
}
