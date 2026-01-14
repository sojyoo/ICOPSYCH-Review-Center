import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/**
 * One-time admin setup endpoint
 * Protected by ADMIN_SETUP_SECRET environment variable
 * Call: POST /api/admin/setup?secret=YOUR_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || 'setup-admin-2025'

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminEmail = 'admin@reviewcenter.com'
    const adminPassword = 'admin123'

    // Check if admin user exists
    let admin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!admin) {
      // Create admin user if it doesn't exist
      const hashedPassword = await bcrypt.hash(adminPassword, 12)
      admin = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          cohort: 'ICOPSYCH-2025'
        }
      })
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        credentials: {
          email: adminEmail,
          password: adminPassword,
          role: 'admin'
        }
      })
    } else {
      // Reset password to ensure it's correct
      const hashedPassword = await bcrypt.hash(adminPassword, 12)
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: hashedPassword }
      })
      return NextResponse.json({
        success: true,
        message: 'Admin password reset successfully',
        credentials: {
          email: adminEmail,
          password: adminPassword,
          role: 'admin'
        }
      })
    }
  } catch (error) {
    console.error('Admin setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup admin user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
