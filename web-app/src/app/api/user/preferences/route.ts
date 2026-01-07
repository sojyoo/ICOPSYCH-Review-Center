import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id }
    })

    console.log('🔍 GET /api/user/preferences - Database result:', preferences)

    if (!preferences) {
      // Return default preferences
      return NextResponse.json({
        dailyAvailability: null,
        habitActiveLearning: null,
        habitPlanning: null,
        habitDiscipline: null,
        habitConfidence: null,
        habitActiveTechniques: null, // Legacy
        habitQuietEnv: null, // Legacy
        weeklyStudyGoal: 10.0
      })
    }

    // Parse JSON fields safely
    let dailyAvailability = null
    try {
      if (preferences.dailyAvailability) {
        dailyAvailability = JSON.parse(preferences.dailyAvailability)
      }
    } catch (e) {
      console.error('Error parsing dailyAvailability:', e)
      dailyAvailability = null
    }

    const result = {
      dailyAvailability,
      habitActiveLearning: preferences.habitActiveLearning ?? null,
      habitPlanning: preferences.habitPlanning ?? null,
      habitDiscipline: preferences.habitDiscipline ?? null,
      habitConfidence: preferences.habitConfidence ?? null,
      habitActiveTechniques: preferences.habitActiveTechniques ?? null, // Legacy
      habitQuietEnv: preferences.habitQuietEnv ?? null, // Legacy
      weeklyStudyGoal: preferences.weeklyStudyGoal ?? 10.0
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error fetching preferences:", error)
    // Return default preferences on error instead of failing
    return NextResponse.json({
      dailyAvailability: null,
      habitActiveLearning: null,
      habitPlanning: null,
      habitDiscipline: null,
      habitConfidence: null,
      habitActiveTechniques: null, // Legacy
      habitQuietEnv: null, // Legacy
      weeklyStudyGoal: 10.0
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Prepare data for Prisma
    const updateData: any = {}

    if (body.dailyAvailability !== undefined) {
      updateData.dailyAvailability = body.dailyAvailability ? JSON.stringify(body.dailyAvailability) : null
    }
    if (body.habitActiveLearning !== undefined) updateData.habitActiveLearning = body.habitActiveLearning
    if (body.habitPlanning !== undefined) updateData.habitPlanning = body.habitPlanning
    if (body.habitDiscipline !== undefined) updateData.habitDiscipline = body.habitDiscipline
    if (body.habitConfidence !== undefined) updateData.habitConfidence = body.habitConfidence
    // Legacy fields (for backward compatibility)
    if (body.habitActiveTechniques !== undefined) updateData.habitActiveTechniques = body.habitActiveTechniques
    if (body.habitQuietEnv !== undefined) updateData.habitQuietEnv = body.habitQuietEnv
    if (body.weeklyStudyGoal !== undefined) updateData.weeklyStudyGoal = body.weeklyStudyGoal

    console.log('💾 PUT /api/user/preferences - Saving data:', updateData)
    console.log('💾 PUT /api/user/preferences - User ID:', session.user.id)
    
    // Upsert preferences
    let preferences
    try {
      preferences = await prisma.userPreferences.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...updateData
        },
        update: updateData
      })
      
      console.log('✅ PUT /api/user/preferences - Saved to database:', preferences)
    } catch (error: any) {
      console.error('❌ PUT /api/user/preferences - Error saving:', error)
      console.error('❌ Error code:', error.code)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error meta:', error.meta)
      throw error // Re-throw to be caught by outer try-catch
    }

    // Parse JSON fields for response safely
    let dailyAvailability = null
    try {
      if (preferences.dailyAvailability) {
        dailyAvailability = JSON.parse(preferences.dailyAvailability)
      }
    } catch (e) {
      console.error('Error parsing dailyAvailability:', e)
      dailyAvailability = null
    }

    const result = {
      dailyAvailability,
      habitActiveLearning: preferences.habitActiveLearning ?? null,
      habitPlanning: preferences.habitPlanning ?? null,
      habitDiscipline: preferences.habitDiscipline ?? null,
      habitConfidence: preferences.habitConfidence ?? null,
      habitActiveTechniques: preferences.habitActiveTechniques ?? null, // Legacy
      habitQuietEnv: preferences.habitQuietEnv ?? null, // Legacy
      weeklyStudyGoal: preferences.weeklyStudyGoal ?? 10.0
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

