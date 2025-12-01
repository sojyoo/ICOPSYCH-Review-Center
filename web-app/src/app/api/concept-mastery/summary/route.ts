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

    // Get all concept mastery records for user
    const masteryRecords = await prisma.conceptMastery.findMany({
      where: { userId: session.user.id },
      include: {
        concept: true
      }
    })

    // Format for ML API
    const formattedRecords = masteryRecords.map(record => ({
      conceptId: record.conceptId,
      conceptName: record.concept.name,
      subject: record.concept.subject,
      masteryLevel: record.masteryLevel,
      attempts: record.attempts,
      correctAttempts: record.correctAttempts,
      nextReviewDate: record.nextReviewDate?.toISOString()
    }))

    // Call ML API for summary
    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:5000'
    
    try {
      const mlResponse = await fetch(`${mlApiUrl}/concept-mastery/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masteryRecords: formattedRecords,
          threshold: 0.7
        })
      })

      if (mlResponse.ok) {
        const mlData = await mlResponse.json()
        return NextResponse.json({
          summary: mlData.summary,
          weakConcepts: mlData.weakConcepts,
          allConcepts: formattedRecords
        })
      }
    } catch (mlError) {
      console.error("ML API error, using fallback:", mlError)
    }

    // Fallback: Calculate summary locally
    const summary = {
      total: formattedRecords.length,
      mastered: formattedRecords.filter(r => r.masteryLevel >= 0.9).length,
      proficient: formattedRecords.filter(r => r.masteryLevel >= 0.7 && r.masteryLevel < 0.9).length,
      developing: formattedRecords.filter(r => r.masteryLevel >= 0.5 && r.masteryLevel < 0.7).length,
      beginning: formattedRecords.filter(r => r.masteryLevel >= 0.3 && r.masteryLevel < 0.5).length,
      novice: formattedRecords.filter(r => r.masteryLevel < 0.3).length,
      averageMastery: formattedRecords.length > 0
        ? formattedRecords.reduce((sum, r) => sum + r.masteryLevel, 0) / formattedRecords.length
        : 0
    }

    const weakConcepts = formattedRecords
      .filter(r => r.masteryLevel < 0.7)
      .sort((a, b) => a.masteryLevel - b.masteryLevel)
      .slice(0, 10)

    return NextResponse.json({
      summary,
      weakConcepts,
      allConcepts: formattedRecords
    })

  } catch (error) {
    console.error("Error getting concept mastery summary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

