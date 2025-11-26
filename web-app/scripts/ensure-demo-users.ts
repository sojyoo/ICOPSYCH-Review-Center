import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function ensureDemoUsers() {
  try {
    // Check for admin user
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@reviewcenter.com' }
    })

    if (!admin) {
      const hashedPassword = await bcrypt.hash('password123', 12)
      admin = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@reviewcenter.com',
          password: hashedPassword,
          role: 'admin',
          cohort: 'ICOPSYCH-2025'
        }
      })
      console.log('✅ Created admin user')
    } else {
      console.log('✅ Admin user already exists')
    }

    // Check for student user
    let student = await prisma.user.findUnique({
      where: { email: 'student@reviewcenter.com' }
    })

    if (!student) {
      const hashedPassword = await bcrypt.hash('password123', 12)
      student = await prisma.user.create({
        data: {
          name: 'Student User',
          email: 'student@reviewcenter.com',
          password: hashedPassword,
          role: 'student',
          cohort: 'ICOPSYCH-2025'
        }
      })
      console.log('✅ Created student user')
    } else {
      console.log('✅ Student user already exists')
    }

    console.log('✅ Demo users ready!')
  } catch (error) {
    console.error('❌ Error ensuring demo users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

ensureDemoUsers()







