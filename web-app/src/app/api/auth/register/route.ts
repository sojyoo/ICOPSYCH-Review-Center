import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const studentNumber = body.studentNumber?.trim().toUpperCase()

    // Validate input
    if (!name || !email || !password || !studentNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate name: no numbers or special characters
    if (/[0-9]/.test(name)) {
      return NextResponse.json({ error: "Name cannot contain numbers" }, { status: 400 })
    }
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name)) {
      return NextResponse.json({ error: "Name cannot contain special characters" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate password: 6 characters, one number, one uppercase, one special character
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 })
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 })
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one special character" }, { status: 400 })
    }

    // Validate student number format: XXX-XXXXXM
    const studentNumberRegex = /^\d{3}-\d{4}[A-Z]$/
    if (!studentNumberRegex.test(studentNumber)) {
      return NextResponse.json({ error: "Student number must be in format XXX-XXXXXM (e.g., 225-0123M)" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    const existingByStudentNumber = await prisma.user.findUnique({
      where: { studentNumber }
    })

    if (existingByStudentNumber) {
      return NextResponse.json({ error: "Student number already registered" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        studentNumber,
        role: 'student',
        cohort: 'ICOPSYCH-2025'
      }
    })

    return NextResponse.json({ 
      success: true, 
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        cohort: newUser.cohort
      }
    })

  } catch (error) {
    console.error("Registration error:", error)

    // Handle Prisma unique constraint errors gracefully
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2002') {
      const target = (error as any).meta?.target as string[] | undefined
      if (target?.includes('email')) {
        return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
      }
      if (target?.includes('studentNumber')) {
        return NextResponse.json({ error: "Student number already registered" }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
