import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function importQuestions() {
  try {
    // Read the questions JSON file
    const questionsPath = path.join(process.cwd(), 'public', 'questions.json')
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))
    
    console.log(`Found ${questionsData.length} questions to import`)
    
    let imported = 0
    let skipped = 0
    
    for (const question of questionsData) {
      try {
        await prisma.question.upsert({
          where: { id: question.id },
          update: {
            stem: question.stem,
            options: JSON.stringify(question.options),
            correctIndex: question.correctIndex,
            subject: question.subject,
            difficulty: question.difficulty,
            testType: question.testType,
            sourceRef: question.source || 'Imported'
          },
          create: {
            id: question.id,
            stem: question.stem,
            options: JSON.stringify(question.options),
            correctIndex: question.correctIndex,
            subject: question.subject,
            difficulty: question.difficulty,
            testType: question.testType,
            sourceRef: question.source || 'Imported'
          }
        })
        imported++
      } catch (error) {
        console.error(`Error importing question ${question.id}:`, error)
        skipped++
      }
    }
    
    console.log(`Import complete!`)
    console.log(`- Imported: ${imported} questions`)
    console.log(`- Skipped: ${skipped} questions`)
    
  } catch (error) {
    console.error('Error importing questions:', error)
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
