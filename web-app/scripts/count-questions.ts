import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function countQuestions() {
  try {
    const totalCount = await prisma.question.count()
    
    const bySubject = await prisma.question.groupBy({
      by: ['subject'],
      _count: {
        id: true
      }
    })
    
    const byWeek = await prisma.question.groupBy({
      by: ['week'],
      _count: {
        id: true
      }
    })
    
    console.log('\n📊 Question Bank Statistics\n')
    console.log(`Total Questions: ${totalCount}\n`)
    
    console.log('By Subject:')
    bySubject.forEach(({ subject, _count }) => {
      console.log(`  ${subject}: ${_count.id}`)
    })
    
    console.log('\nBy Week:')
    byWeek.sort((a, b) => a.week - b.week).forEach(({ week, _count }) => {
      console.log(`  Week ${week}: ${_count.id}`)
    })
    
  } catch (error) {
    console.error('Error counting questions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

countQuestions()




