import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Map subjects to their corresponding weeks based on ICOPSYCH schedule
const SUBJECT_WEEK_MAP: Record<string, number> = {
  'Developmental Psychology': 1,
  'Industrial Psychology': 2,
  'Abnormal Psychology': 3,
  'Psychological Assessment': 4,
  'Personality Theories': 5,
  'Learning': 6,
  'Cognition': 6,
  'Clinical Psychology': 7,
  'Counseling Psychology': 8,
  'Psychological Statistics': 9,
  'Research Methods': 9,
  'Neuropsychology': 10,
  'Social Psychology': 11,
  'Integration': 12,
  'All Subjects': 13,
  'Weak Areas': 15,
  'Combined Subjects': 16
}

// Map weeks to lecture numbers
const WEEK_LECTURE_MAP: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, // Weeks 1-6: Lecture 1
  7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2, // Weeks 7-12: Lecture 2
  13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3 // Weeks 13-18: Lecture 3
}

function getWeekForSubject(subject: string): number {
  return SUBJECT_WEEK_MAP[subject] || 1
}

function getLectureForWeek(week: number): number {
  return WEEK_LECTURE_MAP[week] || 1
}

// POST - Import questions from questions.json
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Read the questions JSON file
    // In Vercel, public files are served from the root, so we need to fetch via HTTP
    let questionsData
    
    try {
      // Get the base URL - try multiple sources
      let baseUrl = process.env.NEXTAUTH_URL
      if (!baseUrl) {
        const origin = request.headers.get('origin')
        const host = request.headers.get('host')
        if (origin) {
          baseUrl = origin
        } else if (host) {
          baseUrl = `https://${host}`
        } else {
          baseUrl = 'https://icopsych-review-center.vercel.app'
        }
      }
      
      // Remove trailing slash
      baseUrl = baseUrl.replace(/\/$/, '')
      const questionsUrl = `${baseUrl}/questions.json`
      
      console.log(`🔍 Attempting to fetch questions from: ${questionsUrl}`)
      
      const response = await fetch(questionsUrl, {
        cache: 'no-store' // Ensure we get fresh data
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      questionsData = await response.json()
      console.log(`✅ Successfully loaded ${questionsData?.length || 0} questions from URL`)
      
    } catch (urlError) {
      console.error('❌ Failed to fetch from URL:', urlError)
      
      // Fallback to file system (for local development only)
      try {
        console.log('⚠️ Trying file system fallback...')
        const questionsPath = path.join(process.cwd(), '..', '..', 'public', 'questions.json')
        questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))
        console.log(`✅ Loaded questions from file: ${questionsPath}`)
      } catch (fileError) {
        // Try alternative path
        try {
          const altPath = path.join(process.cwd(), 'public', 'questions.json')
          questionsData = JSON.parse(fs.readFileSync(altPath, 'utf8'))
          console.log(`✅ Loaded questions from file: ${altPath}`)
        } catch (altError) {
          return NextResponse.json({ 
            error: "Could not load questions.json",
            details: `URL fetch failed: ${urlError instanceof Error ? urlError.message : String(urlError)}. File system also failed.`,
            suggestion: "Make sure questions.json exists in the public folder and is accessible via /questions.json"
          }, { status: 404 })
        }
      }
    }
    
    if (!questionsData || !Array.isArray(questionsData)) {
      return NextResponse.json({ 
        error: "Invalid questions.json format",
        details: "Expected an array of questions"
      }, { status: 400 })
    }
    
    console.log(`\n📋 Found ${questionsData.length} questions to import\n`)
    
    let imported = 0
    let updated = 0
    let skipped = 0
    const stats: Record<string, number> = {}
    
    for (const question of questionsData) {
      try {
        // Determine week and lecture based on subject
        const week = getWeekForSubject(question.subject)
        const lecture = getLectureForWeek(week)
        
        // Track stats
        const key = `${question.subject} - Week ${week}`
        stats[key] = (stats[key] || 0) + 1
        
        // Map JSON fields to Prisma schema fields
        const questionText = question.stem || question.question || ''
        const options = Array.isArray(question.options) ? question.options : []
        const correctIndex = question.correctIndex ?? 0
        const difficulty = question.difficulty || 'medium'
        const explanation = question.explanation || null
        
        const existing = await prisma.question.findUnique({
          where: { id: question.id }
        })
        
        await prisma.question.upsert({
          where: { id: question.id },
          update: {
            question: questionText,
            options: JSON.stringify(options),
            correctIndex: correctIndex,
            subject: question.subject,
            difficulty: difficulty,
            week: week,
            lecture: lecture,
            explanation: explanation
          },
          create: {
            id: question.id,
            question: questionText,
            options: JSON.stringify(options),
            correctIndex: correctIndex,
            subject: question.subject,
            difficulty: difficulty,
            week: week,
            lecture: lecture,
            explanation: explanation
          }
        })
        
        if (existing) {
          updated++
        } else {
          imported++
        }
      } catch (error) {
        console.error(`❌ Error importing question ${question.id}:`, error)
        skipped++
      }
    }
    
    const summary = {
      success: true,
      total: questionsData.length,
      imported,
      updated,
      skipped,
      stats: Object.entries(stats)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .reduce((acc, [key, count]) => {
          acc[key] = count
          return acc
        }, {} as Record<string, number>)
    }
    
    console.log(`\n✅ Import complete!`)
    console.log(`- New questions imported: ${imported}`)
    console.log(`- Existing questions updated: ${updated}`)
    console.log(`- Skipped (errors): ${skipped}\n`)
    
    await prisma.$disconnect()
    return NextResponse.json(summary)
    
  } catch (error) {
    console.error('❌ Error importing questions:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
