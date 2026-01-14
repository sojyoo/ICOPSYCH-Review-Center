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
    // Try fetching from public URL first (for Vercel), then fallback to file system
    let questionsData
    
    try {
      // Try fetching from public URL (works in Vercel)
      const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'http://localhost:3000'
      const questionsUrl = `${baseUrl}/questions.json`
      const response = await fetch(questionsUrl)
      
      if (response.ok) {
        questionsData = await response.json()
        console.log(`✅ Loaded questions from URL: ${questionsUrl}`)
      } else {
        throw new Error(`Failed to fetch from URL: ${response.status}`)
      }
    } catch (urlError) {
      // Fallback to file system (for local development)
      console.log('⚠️ Failed to fetch from URL, trying file system...')
      try {
        const questionsPath = path.join(process.cwd(), '..', '..', 'public', 'questions.json')
        questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))
        console.log(`✅ Loaded questions from file: ${questionsPath}`)
      } catch (fileError) {
        // Try alternative path
        const altPath = path.join(process.cwd(), 'public', 'questions.json')
        try {
          questionsData = JSON.parse(fs.readFileSync(altPath, 'utf8'))
          console.log(`✅ Loaded questions from file: ${altPath}`)
        } catch (altError) {
          return NextResponse.json({ 
            error: "Could not load questions.json",
            details: `URL error: ${urlError}, File errors: ${fileError}, ${altError}`
          }, { status: 404 })
        }
      }
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
