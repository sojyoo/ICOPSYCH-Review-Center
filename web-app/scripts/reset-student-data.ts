import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetStudentData() {
  try {
    // Find the student user
    const student = await prisma.user.findUnique({
      where: { email: 'student@reviewcenter.com' }
    })

    if (!student) {
      console.log('❌ Student user not found!')
      return
    }

    console.log(`📋 Resetting data for: ${student.name} (${student.email})`)
    console.log('')

    // Get all test attempts for this student
    const testAttempts = await prisma.testAttempt.findMany({
      where: { userId: student.id },
      select: { id: true }
    })

    const testAttemptIds = testAttempts.map(ta => ta.id)

    // Delete all question attempts for this student's test attempts
    let questionAttemptsDeleted = { count: 0 }
    if (testAttemptIds.length > 0) {
      questionAttemptsDeleted = await prisma.questionAttempt.deleteMany({
        where: { 
          testAttemptId: {
            in: testAttemptIds
          }
        }
      })
    }

    console.log(`✅ Deleted ${questionAttemptsDeleted.count} question attempts`)

    // Delete all test attempts for this student
    const testAttemptsDeleted = await prisma.testAttempt.deleteMany({
      where: { userId: student.id }
    })

    console.log(`✅ Deleted ${testAttemptsDeleted.count} test attempts`)

    // Delete study plans for this student
    const studyPlansDeleted = await prisma.studyPlan.deleteMany({
      where: { userId: student.id }
    })

    console.log(`✅ Deleted ${studyPlansDeleted.count} study plans`)

    // Delete calendar events for this student
    const calendarEventsDeleted = await prisma.calendarEvent.deleteMany({
      where: { userId: student.id }
    })

    console.log(`✅ Deleted ${calendarEventsDeleted.count} calendar events`)

    console.log('')
    console.log('✅ All student data has been reset!')
    console.log('📝 The student can now start fresh with all tests.')

  } catch (error) {
    console.error('❌ Error resetting student data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetStudentData()

