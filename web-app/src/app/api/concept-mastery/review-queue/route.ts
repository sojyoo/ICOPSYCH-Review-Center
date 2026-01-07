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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'due' // 'due', 'upcoming', 'all'

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get concepts due for review
    let whereClause: any = {
      userId: session.user.id,
      nextReviewDate: { not: null }
    }

    if (status === 'due') {
      whereClause.nextReviewDate = { lte: now }
    } else if (status === 'upcoming') {
      whereClause.nextReviewDate = { 
        gte: now,
        lte: tomorrow
      }
    }

    const reviewQueue = await prisma.conceptMastery.findMany({
      where: whereClause,
      include: {
        concept: true
      },
      orderBy: [
        { nextReviewDate: 'asc' },
        { masteryLevel: 'asc' }
      ],
      take: 50
    })

    // Format response
    const formatted = reviewQueue.map(item => ({
      id: item.id,
      conceptId: item.conceptId,
      conceptName: item.concept.name,
      subject: item.concept.subject,
      topic: item.concept.topic,
      masteryLevel: item.masteryLevel,
      attempts: item.attempts,
      correctAttempts: item.correctAttempts,
      lastReviewed: item.lastReviewed?.toISOString(),
      nextReviewDate: item.nextReviewDate?.toISOString(),
      isOverdue: item.nextReviewDate ? new Date(item.nextReviewDate) < now : false,
      daysUntilReview: item.nextReviewDate 
        ? Math.ceil((new Date(item.nextReviewDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
    }))

    // Count stats
    const stats = {
      due: formatted.filter(c => c.isOverdue).length,
      upcoming: formatted.filter(c => !c.isOverdue && c.daysUntilReview !== null && c.daysUntilReview <= 1).length,
      total: formatted.length
    }

    return NextResponse.json({
      concepts: formatted,
      stats
    })

  } catch (error) {
    console.error("Error fetching review queue:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { conceptMasteryId, performance } = body // performance: 'correct' | 'incorrect' | 'partial'

    if (!conceptMasteryId || !performance) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get current mastery record
    const mastery = await prisma.conceptMastery.findUnique({
      where: { id: conceptMasteryId },
      include: { concept: true }
    })

    if (!mastery || mastery.userId !== session.user.id) {
      return NextResponse.json({ error: "Concept mastery not found" }, { status: 404 })
    }

    // Update mastery based on performance
    const now = new Date()
    let newMasteryLevel = mastery.masteryLevel
    let newAttempts = mastery.attempts + 1
    let newCorrectAttempts = mastery.correctAttempts

    if (performance === 'correct') {
      newCorrectAttempts += 1
      newMasteryLevel = Math.min(1.0, mastery.masteryLevel + 0.1)
    } else if (performance === 'incorrect') {
      newMasteryLevel = Math.max(0.0, mastery.masteryLevel - 0.15)
    } else if (performance === 'partial') {
      newCorrectAttempts += 0.5
      newMasteryLevel = Math.min(1.0, mastery.masteryLevel + 0.05)
    }

    // Calculate next review date using spaced repetition algorithm
    // Simple algorithm: interval increases based on mastery level
    const baseInterval = 1 // days
    const masteryMultiplier = Math.max(1, Math.floor(newMasteryLevel * 10))
    const daysUntilNext = baseInterval * masteryMultiplier * (performance === 'correct' ? 2 : 1)
    
    const nextReviewDate = new Date(now)
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilNext)

    // Update mastery record
    const updated = await prisma.conceptMastery.update({
      where: { id: conceptMasteryId },
      data: {
        masteryLevel: newMasteryLevel,
        attempts: newAttempts,
        correctAttempts: Math.floor(newCorrectAttempts),
        lastReviewed: now,
        nextReviewDate: nextReviewDate
      },
      include: {
        concept: true
      }
    })

    return NextResponse.json({
      success: true,
      mastery: {
        id: updated.id,
        masteryLevel: updated.masteryLevel,
        attempts: updated.attempts,
        correctAttempts: updated.correctAttempts,
        nextReviewDate: updated.nextReviewDate?.toISOString()
      }
    })

  } catch (error) {
    console.error("Error updating concept review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}




