import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('Checking users in database...')
  
  const users = await prisma.user.findMany()
  console.log('Found users:', users.length)
  
  for (const user of users) {
    console.log(`User: ${user.email}, Role: ${user.role}, Has Password: ${!!user.password}`)
    
    if (user.password) {
      const testPassword = user.email.includes('admin') ? 'admin123' : 'student123'
      const isValid = await bcrypt.compare(testPassword, user.password)
      console.log(`Password test for ${user.email}: ${isValid}`)
    }
  }
  
  await prisma.$disconnect()
}

checkUsers().catch(console.error)


