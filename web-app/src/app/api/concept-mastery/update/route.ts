import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { conceptId, questionId, isCorrect } = body

    if (!conceptId || isCorrect === undefined) {
      return NextResponse.json({ error: "conceptId and isCorrect are required" }, { status: 400 })
    }

    // Get or create concept mastery record
    let mastery = await prisma.conceptMastery.findUnique({
      where: {
        userId_conceptId: {
          userId: session.user.id,
          conceptId: conceptId
        }
      }
    })

    const currentMastery = mastery?.masteryLevel || 0.0
    const attempts = mastery?.attempts || 0
    const correctAttempts = mastery?.correctAttempts || 0

    // Call ML API to update mastery
    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:5000'
    const mlResponse = await fetch(`${mlApiUrl}/concept-mastery/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conceptId,
        isCorrect,
        currentMastery,
        attempts,
        correctAttempts,
        currentInterval: mastery?.nextReviewDate ? 1 : 1,
        easeFactor: 2.5
      })
    })

    if (!mlResponse.ok) {
      // Fallback: simple update without ML
      const newMastery = isCorrect 
        ? Math.min(1.0, currentMastery + 0.1)
        : Math.max(0.0, currentMastery - 0.05)
      
      const newAttempts = attempts + 1
      const newCorrectAttempts = correctAttempts + (isCorrect ? 1 : 0)

      if (mastery) {
        mastery = await prisma.conceptMastery.update({
          where: { id: mastery.id },
          data: {
            masteryLevel: newMastery,
            attempts: newAttempts,
            correctAttempts: newCorrectAttempts,
            lastReviewed: new Date()
          }
        })
      } else {
        mastery = await prisma.conceptMastery.create({
          data: {
            userId: session.user.id,
            conceptId: conceptId,
            masteryLevel: newMastery,
            attempts: newAttempts,
            correctAttempts: newCorrectAttempts,
            lastReviewed: new Date()
          }
        })
      }

      return NextResponse.json({
        masteryLevel: mastery.masteryLevel,
        attempts: mastery.attempts,
        correctAttempts: mastery.correctAttempts,
        masteryLevelLabel: getMasteryLabel(mastery.masteryLevel)
      })
    }

    const mlData = await mlResponse.json()

    // Update database with ML results
    if (mastery) {
      mastery = await prisma.conceptMastery.update({
        where: { id: mastery.id },
        data: {
          masteryLevel: mlData.masteryLevel,
          attempts: mlData.attempts,
          correctAttempts: mlData.correctAttempts,
          lastReviewed: new Date(mlData.lastReviewed),
          nextReviewDate: new Date(mlData.nextReviewDate)
        }
      })
    } else {
      mastery = await prisma.conceptMastery.create({
        data: {
          userId: session.user.id,
          conceptId: conceptId,
          masteryLevel: mlData.masteryLevel,
          attempts: mlData.attempts,
          correctAttempts: mlData.correctAttempts,
          lastReviewed: new Date(mlData.lastReviewed),
          nextReviewDate: new Date(mlData.nextReviewDate)
        }
      })
    }

    return NextResponse.json({
      masteryLevel: mastery.masteryLevel,
      attempts: mastery.attempts,
      correctAttempts: mastery.correctAttempts,
      masteryLevelLabel: mlData.masteryLevelLabel || getMasteryLabel(mastery.masteryLevel),
      nextReviewDate: mastery.nextReviewDate?.toISOString()
    })

  } catch (error) {
    console.error("Error updating concept mastery:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

function getMasteryLabel(mastery: number): string {
  if (mastery >= 0.9) return "mastered"
  if (mastery >= 0.7) return "proficient"
  if (mastery >= 0.5) return "developing"
  if (mastery >= 0.3) return "beginning"
  return "novice"
}

