import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

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

async function importQuestions() {
  try {
    // Read the questions JSON file (from parent directory)
    const questionsPath = path.join(process.cwd(), '..', 'public', 'questions.json')
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))
    
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
        // JSON uses "stem", Prisma uses "question"
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
    
    console.log(`\n✅ Import complete!\n`)
    console.log(`- New questions imported: ${imported}`)
    console.log(`- Existing questions updated: ${updated}`)
    console.log(`- Skipped (errors): ${skipped}\n`)
    
    console.log('📊 Distribution by Subject/Week:')
    Object.entries(stats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, count]) => {
        console.log(`  ${key}: ${count}`)
      })
    
  } catch (error) {
    console.error('❌ Error importing questions:', error)
    throw error
  }
}

importQuestions()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




