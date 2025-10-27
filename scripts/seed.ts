import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create cohorts
  const cohort4A = await prisma.cohort.upsert({
    where: { id: 'cohort-4a-2025' },
    update: {},
    create: {
      id: 'cohort-4a-2025',
      name: 'BSP 4A',
      year: 2025,
    },
  })

  const cohort4B = await prisma.cohort.upsert({
    where: { id: 'cohort-4b-2025' },
    update: {},
    create: {
      id: 'cohort-4b-2025',
      name: 'BSP 4B',
      year: 2025,
    },
  })

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@reviewcenter.com' },
    update: {},
    create: {
      email: 'admin@reviewcenter.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: hashedPassword,
    },
  })

  // Create sample student
  const studentPassword = await bcrypt.hash('student123', 10)
  
  const student = await prisma.user.upsert({
    where: { email: 'student@reviewcenter.com' },
    update: {},
    create: {
      email: 'student@reviewcenter.com',
      name: 'John Student',
      role: 'STUDENT',
      cohortId: cohort4A.id,
      password: studentPassword,
    },
  })

  // Create sample questions
  const questions = [
    {
      subject: 'Abnormal Psychology',
      topic: 'Anxiety Disorders',
      stem: 'Which of the following is a characteristic symptom of Generalized Anxiety Disorder?',
      options: JSON.stringify([
        'Panic attacks',
        'Excessive worry about multiple events',
        'Compulsive behaviors',
        'Hallucinations'
      ]),
      correctIndex: 1,
      sourceRef: 'Sample Question 1'
    },
    {
      subject: 'Industrial Psychology',
      topic: 'Organizational Behavior',
      stem: 'What is the primary focus of Industrial Psychology?',
      options: JSON.stringify([
        'Clinical treatment of mental disorders',
        'Study of behavior in work settings',
        'Child development research',
        'Social media psychology'
      ]),
      correctIndex: 1,
      sourceRef: 'Sample Question 2'
    },
    {
      subject: 'Psychological Assessment',
      topic: 'Test Construction',
      stem: 'Which type of validity refers to how well a test measures what it claims to measure?',
      options: JSON.stringify([
        'Content validity',
        'Criterion validity',
        'Construct validity',
        'Face validity'
      ]),
      correctIndex: 2,
      sourceRef: 'Sample Question 3'
    }
  ]

  for (const question of questions) {
    await prisma.question.upsert({
      where: { id: `question-${question.sourceRef}` },
      update: {},
      create: {
        id: `question-${question.sourceRef}`,
        ...question
      },
    })
  }

  // Create sample events
  const events = [
    {
      cohortId: cohort4A.id,
      type: 'CLASS',
      title: 'Review Session - Abnormal Psychology',
      start: new Date('2025-01-20T08:00:00'),
      end: new Date('2025-01-20T10:00:00'),
      color: '#3B82F6'
    },
    {
      cohortId: cohort4A.id,
      type: 'TEST',
      title: 'Pre-test - Industrial Psychology',
      start: new Date('2025-01-22T09:00:00'),
      end: new Date('2025-01-22T10:00:00'),
      color: '#EF4444'
    },
    {
      cohortId: cohort4A.id,
      type: 'STUDY',
      title: 'Self-study - Psychological Assessment',
      start: new Date('2025-01-23T14:00:00'),
      end: new Date('2025-01-23T16:00:00'),
      color: '#10B981'
    }
  ]

  for (const event of events) {
    await prisma.event.create({
      data: event
    })
  }

  console.log('Database seeded successfully!')
  console.log('Admin login: admin@reviewcenter.com / admin123')
  console.log('Student login: student@reviewcenter.com / student123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


