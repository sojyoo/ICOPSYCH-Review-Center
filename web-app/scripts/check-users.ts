import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...')
    
    const users = await prisma.user.findMany()
    
    console.log(`📊 Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`)
    })
    
    // Check if user ID '2' exists
    const user2 = await prisma.user.findUnique({
      where: { id: '2' }
    })
    
    if (user2) {
      console.log('✅ User ID "2" exists:', user2.email)
    } else {
      console.log('❌ User ID "2" does not exist')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()



