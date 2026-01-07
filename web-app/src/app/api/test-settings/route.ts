import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Fetch test settings (public, for checking restrictions)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('type')

    const settings = await prisma.testSettings.findMany({
      where: testType ? { testType } : undefined
    })

    // If no settings exist, return defaults (all unlocked for demo)
    if (settings.length === 0) {
      return NextResponse.json({
        settings: [
          { testType: 'pre-test', isLocked: false, requirePrerequisite: false, allowRetakes: true, lockedWeeks: null },
          { testType: 'post-test', isLocked: false, requirePrerequisite: false, allowRetakes: true, lockedWeeks: null },
          { testType: 'mock-exam', isLocked: false, requirePrerequisite: false, allowRetakes: true, lockedWeeks: null }
        ]
      })
    }

    const parsedSettings = settings.map(s => {
      let lockedWeeks = null
      try {
        if (s.lockedWeeks) {
          lockedWeeks = JSON.parse(s.lockedWeeks)
        }
      } catch (e) {
        // Ignore parse errors
      }

      return {
        ...s,
        lockedWeeks
      }
    })

    return NextResponse.json({ settings: parsedSettings })
  } catch (error) {
    console.error("Error fetching test settings:", error)
    return NextResponse.json({ 
      settings: [
        { testType: 'pre-test', isLocked: false, requirePrerequisite: false, allowRetakes: true, lockedWeeks: null },
        { testType: 'post-test', isLocked: false, requirePrerequisite: false, allowRetakes: true, lockedWeeks: null },
        { testType: 'mock-exam', isLocked: false, requirePrerequisite: false, allowRetakes: true, lockedWeeks: null }
      ]
    })
  }
}




