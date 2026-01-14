import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import devPsychPre from '@/data/dev-psych-pre.json'
import devPsychPost from '@/data/dev-psych-post.json'

export const dynamic = 'force-dynamic'

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

    // Note: Pre-tests and post-tests use comprehensive 30-question format
    // This ensures all tests cover all 4 core subjects for better risk assessment
    // The special DevPsych Week 1 case is now handled by the main database query below

    const { prisma } = await import('@/lib/prisma')

    // Build the where clause for filtering
    const whereClause: any = {}
    
    // For pre-test and post-test: Always include all 4 core subjects regardless of week/topic
    // This ensures comprehensive assessment across all subject areas
    const coreSubjects = [
      'Abnormal Psychology',
      'Developmental Psychology',
      'Industrial Psychology',
      'Psychological Assessment'
    ]
    
    if (type === 'pre-test' || type === 'post-test') {
      // Override subjects to always include all core subjects
      whereClause.subject = {
        in: coreSubjects
      }
      console.log('📚 Overriding subjects to include all core subjects for comprehensive assessment')
    } else if (subjects.length > 0) {
      // For mock-exam, use provided subjects
      whereClause.subject = {
        in: subjects
      }
    }
    
    // Filter by week if provided (for regular tests, NOT pre-test/post-test)
    // Pre-tests and post-tests should cover ALL weeks to assess all subject areas
    // Mock exams use all weeks, review weeks (13-15) can use multiple weeks
    if (week > 0 && type !== 'mock-exam' && type !== 'pre-test' && type !== 'post-test') {
      if (week >= 13 && week <= 15) {
        // Review weeks can use questions from all previous weeks
        whereClause.week = {
          lte: week
        }
      } else {
        // Regular weeks: use questions from that specific week
        whereClause.week = week
      }
    }
    
    // Filter by lecture if provided (optional, for more precise matching)
    // Pre-tests and post-tests should NOT filter by lecture - they cover all topics
    if (lecture > 0 && type !== 'mock-exam' && type !== 'pre-test' && type !== 'post-test' && week < 13) {
      whereClause.lecture = lecture
    }
    
    // Note: We'll use the same questions for both pre-test and post-test, but shuffle for post-tests
    // Mock exams will use all available questions

    console.log('🔍 Querying database with whereClause:', whereClause)
    console.log('📋 Test type:', type, '| Week:', week, '| Lecture:', lecture)
    if (type === 'pre-test' || type === 'post-test') {
      console.log('✅ Pre/Post-test: Ignoring week/lecture filters, using ALL questions from all 4 core subjects')
    }

    // Load questions from database
    let questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: {
        id: 'asc'
      }
    })
    
    console.log(`📊 Found ${questions.length} questions from database query`)

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

    // For pre-test and post-test, always ensure we have enough questions from all subjects
    const minQuestionsNeeded = (type === 'pre-test' || type === 'post-test') ? 30 : 20
    if ((type === 'pre-test' || type === 'post-test') || (uniqueQuestions.length < minQuestionsNeeded && type !== 'mock-exam')) {
      console.log('📚 Loading questions from all subjects to ensure sufficient coverage...')
      
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
        lecture: q.lecture,
        verification: { expected: true } // Add verification property
      }))
      
      const allUniqueQuestions = allFormattedQuestions.filter((question, index, self) => 
        index === self.findIndex(q => q.question === question.question)
      )
      
      // For pre-test/post-test, use all unique questions (we'll select 30 from them)
      // For other tests, combine with original questions
      if (type === 'pre-test' || type === 'post-test') {
        formattedQuestions = allUniqueQuestions
        console.log(`📚 Loaded ${formattedQuestions.length} total unique questions from database for ${type}`)
      } else {
        // Combine with original questions, prioritizing the requested subjects
        const combinedQuestions = [...uniqueQuestions]
        allUniqueQuestions.forEach(q => {
          if (!combinedQuestions.find(existing => existing.question === q.question)) {
            combinedQuestions.push(q)
          }
        })
        console.log(`📚 Combined questions: ${combinedQuestions.length} total`)
        formattedQuestions = combinedQuestions
      }
    } else {
      formattedQuestions = uniqueQuestions
    }

    // Limit questions based on test type
    // Pre-tests and post-tests now use 30 questions covering all 4 core subjects
    const questionLimit = type === 'mock-exam' ? 100 : (type === 'pre-test' || type === 'post-test' ? 30 : 20)
    
    // For pre-test and post-test: ensure all 4 core subjects are covered
    // Distribute 30 questions: 7-8 questions per subject (7+8+8+7 = 30)
    if ((type === 'pre-test' || type === 'post-test') && questionLimit === 30) {
      const coreSubjects = [
        'Abnormal Psychology',
        'Developmental Psychology', 
        'Industrial Psychology',
        'Psychological Assessment'
      ]
      
      const questionsBySubject: Record<string, typeof formattedQuestions> = {}
      coreSubjects.forEach(subject => {
        // Sort by ID for deterministic selection (same questions every time)
        questionsBySubject[subject] = formattedQuestions
          .filter(q => q.subject === subject)
          .sort((a, b) => a.id.localeCompare(b.id))
        console.log(`📚 Found ${questionsBySubject[subject].length} questions for ${subject}`)
      })
      
      // Log all unique subjects found in formattedQuestions
      const allSubjectsFound = [...new Set(formattedQuestions.map(q => q.subject))]
      console.log(`📚 All subjects found in database:`, allSubjectsFound)
      console.log(`📚 Total questions available: ${formattedQuestions.length}`)
      
      // Distribute 30 questions: 7, 8, 8, 7 per subject
      const questionsPerSubject = [7, 8, 8, 7]
      const selectedQuestions: typeof formattedQuestions = []
      
      coreSubjects.forEach((subject, index) => {
        const subjectQuestions = questionsBySubject[subject] || []
        const questionsToTake = Math.min(questionsPerSubject[index], subjectQuestions.length)
        console.log(`📚 Selecting ${questionsToTake} questions from ${subject} (available: ${subjectQuestions.length}, requested: ${questionsPerSubject[index]})`)
        selectedQuestions.push(...subjectQuestions.slice(0, questionsToTake))
      })
      
      console.log(`📚 Selected ${selectedQuestions.length} questions from core subjects (target: ${questionLimit})`)
      
      // If we don't have enough questions from core subjects, supplement with any available
      if (selectedQuestions.length < questionLimit) {
        const remaining = questionLimit - selectedQuestions.length
        const usedQuestionIds = new Set(selectedQuestions.map(q => q.id))
        const additionalQuestions = formattedQuestions
          .filter(q => !usedQuestionIds.has(q.id))
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, remaining)
        console.log(`📚 Supplementing with ${additionalQuestions.length} additional questions to reach ${questionLimit}`)
        selectedQuestions.push(...additionalQuestions)
      }
      
      console.log(`📚 Total selected after supplementation: ${selectedQuestions.length}`)
      
      // Ensure we have exactly 30 questions (or as many as available)
      // If we still don't have enough, take from ALL available questions regardless of subject
      let finalSelectedQuestions = selectedQuestions.slice(0, Math.min(questionLimit, selectedQuestions.length))
      
      if (finalSelectedQuestions.length < questionLimit && formattedQuestions.length >= questionLimit) {
        console.log(`⚠️ Only have ${finalSelectedQuestions.length} questions from core subjects, taking from all available questions`)
        const usedQuestionIds = new Set(finalSelectedQuestions.map(q => q.id))
        const allAvailable = formattedQuestions
          .filter(q => !usedQuestionIds.has(q.id))
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, questionLimit - finalSelectedQuestions.length)
        finalSelectedQuestions = [...finalSelectedQuestions, ...allAvailable]
        console.log(`📚 Now have ${finalSelectedQuestions.length} questions total`)
      }
      
      // Sort by ID to ensure deterministic selection (same questions for both pre-test and post-test)
      const sortedByID = finalSelectedQuestions.sort((a, b) => a.id.localeCompare(b.id))
      
      console.log(`📚 Final selection: ${sortedByID.length} questions (target: ${questionLimit})`)
      
      // For pre-test: use questions in sorted order
      // For post-test: use the SAME questions but shuffle the order
      if (type === 'pre-test') {
        formattedQuestions = sortedByID
      } else {
        // Post-test: use same question IDs but shuffle the presentation order
        formattedQuestions = shuffleArray([...sortedByID])
      }
    } else if (type === 'mock-exam') {
      formattedQuestions = shuffleArray(formattedQuestions)
      formattedQuestions = formattedQuestions.slice(0, Math.min(questionLimit, formattedQuestions.length))
    } else {
      formattedQuestions = formattedQuestions.slice(0, Math.min(questionLimit, formattedQuestions.length))
    }
    
    const finalQuestions = formattedQuestions

    // Add warning if not enough questions
    if (finalQuestions.length < questionLimit) {
      console.warn(`⚠️ Only ${finalQuestions.length} questions available for ${type} (requested: ${questionLimit})`)
    } else {
      console.log(`✅ Successfully selected ${finalQuestions.length} questions for ${type} (requested: ${questionLimit})`)
    }

    // Log question distribution by subject for pre-test/post-test
    if ((type === 'pre-test' || type === 'post-test') && finalQuestions.length > 0) {
      const subjectCounts: Record<string, number> = {}
      finalQuestions.forEach(q => {
        subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1
      })
      console.log(`📊 Question distribution by subject:`, subjectCounts)
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
  const questionCount = type === 'mock-exam' ? 100 : (type === 'pre-test' || type === 'post-test' ? 30 : 20)
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
