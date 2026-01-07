import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Fetch all test settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.testSettings.findMany({
      orderBy: { testType: 'asc' }
    })

    // If no settings exist, create defaults (all unlocked for demo)
    if (settings.length === 0) {
      const defaultSettings = [
        { testType: 'pre-test', isLocked: false, requirePrerequisite: false, allowRetakes: true },
        { testType: 'post-test', isLocked: false, requirePrerequisite: false, allowRetakes: true },
        { testType: 'mock-exam', isLocked: false, requirePrerequisite: false, allowRetakes: true }
      ]

      await prisma.testSettings.createMany({
        data: defaultSettings
      })

      return NextResponse.json({ settings: defaultSettings })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching test settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update test settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { testType, isLocked, requirePrerequisite, allowRetakes, lockedWeeks } = body

    if (!testType) {
      return NextResponse.json({ error: "testType is required" }, { status: 400 })
    }

    const settings = await prisma.testSettings.upsert({
      where: { testType },
      update: {
        isLocked: isLocked ?? false,
        requirePrerequisite: requirePrerequisite ?? false,
        allowRetakes: allowRetakes ?? true,
        lockedWeeks: lockedWeeks ? JSON.stringify(lockedWeeks) : null
      },
      create: {
        testType,
        isLocked: isLocked ?? false,
        requirePrerequisite: requirePrerequisite ?? false,
        allowRetakes: allowRetakes ?? true,
        lockedWeeks: lockedWeeks ? JSON.stringify(lockedWeeks) : null
      }
    })

    let parsedLockedWeeks = null
    try {
      if (settings.lockedWeeks) {
        parsedLockedWeeks = JSON.parse(settings.lockedWeeks)
      }
    } catch (e) {
      // Ignore parse errors
    }

    return NextResponse.json({
      ...settings,
      lockedWeeks: parsedLockedWeeks
    })
  } catch (error) {
    console.error("Error updating test settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}




