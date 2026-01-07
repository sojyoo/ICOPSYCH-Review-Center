import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDuplicates() {
  try {
    const allQuestions = await prisma.question.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`\n🔍 Checking ${allQuestions.length} questions for duplicates...\n`)
    
    // Group by question text
    const byText: Record<string, any[]> = {}
    allQuestions.forEach(q => {
      const key = q.question.trim().toLowerCase()
      if (!byText[key]) {
        byText[key] = []
      }
      byText[key].push(q)
    })
    
    const duplicates = Object.entries(byText).filter(([_, questions]) => questions.length > 1)
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate question texts:\n`)
      
      let totalDuplicates = 0
      for (const [text, questions] of duplicates) {
        console.log(`"${questions[0].question.substring(0, 60)}..."`)
        console.log(`  Found ${questions.length} copies:`)
        questions.forEach((q, idx) => {
          console.log(`    ${idx + 1}. ID: ${q.id}, Subject: ${q.subject}, Week: ${q.week}, Created: ${q.createdAt.toISOString().split('T')[0]}`)
        })
        totalDuplicates += questions.length - 1 // Keep one, delete the rest
        console.log()
      }
      
      console.log(`\n📊 Summary:`)
      console.log(`- Unique question texts: ${allQuestions.length - totalDuplicates}`)
      console.log(`- Duplicate copies to remove: ${totalDuplicates}`)
    } else {
      console.log(`✅ No duplicates found! All questions are unique.`)
    }
    
    // Show oldest 20 questions
    console.log(`\n📅 Oldest 20 questions (likely the original ones):`)
    const oldest = allQuestions.slice(0, 20)
    oldest.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.subject} - Week ${q.week} - "${q.question.substring(0, 50)}..."`)
    })
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error)
    throw error
  }
}

checkDuplicates()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




