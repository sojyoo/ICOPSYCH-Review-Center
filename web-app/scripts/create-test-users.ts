import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create test users
  const testUsers = [
    {
      email: 'testone@gmail.com',
      name: 'Test One',
      password: 'password123',
      studentNumber: 'TEST001',
      role: 'student' as const,
      cohort: 'ICOPSYCH-2025'
    },
    {
      email: 'testtwo@gmail.com',
      name: 'Test Two',
      password: 'password123',
      studentNumber: 'TEST002',
      role: 'student' as const,
      cohort: 'ICOPSYCH-2025'
    }
  ]

  for (const userData of testUsers) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    if (existing) {
      // Update existing user's password
      await prisma.user.update({
        where: { email: userData.email },
        data: {
          password: hashedPassword,
          name: userData.name,
          studentNumber: userData.studentNumber,
          role: userData.role,
          cohort: userData.cohort
        }
      })
      console.log(`✅ Updated user: ${userData.email} (password reset)`)
      continue
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        studentNumber: userData.studentNumber,
        role: userData.role,
        cohort: userData.cohort
      }
    })

    console.log(`✅ Created user: ${user.email} (${user.studentNumber})`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


