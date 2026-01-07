import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map subjects to their corresponding weeks
const SUBJECT_WEEK_MAP: Record<string, number> = {
  'Developmental Psychology': 1,
  'Industrial Psychology': 2,
  'Abnormal Psychology': 3,
  'Psychological Assessment': 4,
}

const WEEK_LECTURE_MAP: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1,
  7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2,
  13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3
}

function getWeekForSubject(subject: string): number {
  return SUBJECT_WEEK_MAP[subject] || 1
}

function getLectureForWeek(week: number): number {
  return WEEK_LECTURE_MAP[week] || 1
}

async function fixQuestions() {
  try {
    // Find questions that might have incorrect week/subject tags
    // Look for questions where week doesn't match subject
    const allQuestions = await prisma.question.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`\n🔍 Found ${allQuestions.length} total questions\n`)
    
    let fixed = 0
    let deleted = 0
    
    // Group by subject to find potential duplicates
    const bySubject: Record<string, any[]> = {}
    allQuestions.forEach(q => {
      if (!bySubject[q.subject]) {
        bySubject[q.subject] = []
      }
      bySubject[q.subject].push(q)
    })
    
    // Check each subject group
    for (const [subject, questions] of Object.entries(bySubject)) {
      const expectedWeek = getWeekForSubject(subject)
      const expectedLecture = getLectureForWeek(expectedWeek)
      
      console.log(`\n📚 ${subject} (Expected: Week ${expectedWeek}, Lecture ${expectedLecture})`)
      console.log(`   Total questions: ${questions.length}`)
      
      // Find questions with incorrect week
      const incorrect = questions.filter(q => q.week !== expectedWeek)
      
      if (incorrect.length > 0) {
        console.log(`   ⚠️  Found ${incorrect.length} questions with incorrect week`)
        
        for (const q of incorrect) {
          // Check if this is a duplicate (same question text)
          const correctQuestions = questions.filter(
            other => other.week === expectedWeek && 
                     other.question === q.question &&
                     other.id !== q.id
          )
          
          if (correctQuestions.length > 0) {
            // This is a duplicate, delete it
            console.log(`   🗑️  Deleting duplicate: ${q.id.substring(0, 30)}...`)
            await prisma.question.delete({ where: { id: q.id } })
            deleted++
          } else {
            // Fix the week and lecture
            console.log(`   ✅ Fixing: ${q.id.substring(0, 30)}... (Week ${q.week} → ${expectedWeek})`)
            await prisma.question.update({
              where: { id: q.id },
              data: {
                week: expectedWeek,
                lecture: expectedLecture
              }
            })
            fixed++
          }
        }
      } else {
        console.log(`   ✅ All questions correctly tagged`)
      }
    }
    
    console.log(`\n✅ Fix complete!`)
    console.log(`- Fixed: ${fixed} questions`)
    console.log(`- Deleted duplicates: ${deleted} questions\n`)
    
    // Show final stats
    const finalCount = await prisma.question.count()
    const bySubjectFinal = await prisma.question.groupBy({
      by: ['subject'],
      _count: { id: true }
    })
    
    const byWeekFinal = await prisma.question.groupBy({
      by: ['week'],
      _count: { id: true }
    })
    
    console.log(`📊 Final Statistics:`)
    console.log(`Total Questions: ${finalCount}\n`)
    
    console.log('By Subject:')
    bySubjectFinal.forEach(({ subject, _count }) => {
      console.log(`  ${subject}: ${_count.id}`)
    })
    
    console.log('\nBy Week:')
    byWeekFinal.sort((a, b) => a.week - b.week).forEach(({ week, _count }) => {
      console.log(`  Week ${week}: ${_count.id}`)
    })
    
  } catch (error) {
    console.error('❌ Error fixing questions:', error)
    throw error
  }
}

fixQuestions()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




