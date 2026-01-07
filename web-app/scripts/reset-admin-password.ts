import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    const adminEmail = 'admin@reviewcenter.com'
    const newPassword = 'admin123'

    // Check if admin user exists
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!admin) {
      // Create admin user if it doesn't exist
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          cohort: 'ICOPSYCH-2025'
        }
      })
      console.log('✅ Created admin user with password: admin123')
    } else {
      // Reset password
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: hashedPassword }
      })
      console.log('✅ Admin password reset to: admin123')
    }

    console.log('\n📋 Admin Credentials:')
    console.log('   Email: admin@reviewcenter.com')
    console.log('   Password: admin123')
    console.log('   Role: admin\n')
  } catch (error) {
    console.error('❌ Error resetting admin password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()




