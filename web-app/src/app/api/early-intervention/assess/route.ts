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

    // Get user's test attempts
    const testAttempts = await prisma.testAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: 'desc' },
      take: 20
    })

    if (testAttempts.length === 0) {
      return NextResponse.json({
        riskScore: 0.5,
        riskLevel: "medium",
        predictedScore: 0,
        currentAverageScore: 0,
        weeksUntilExam: 8,
        riskFactors: ["No test data available"],
        recommendations: ["Take your first test to get personalized risk assessment"]
      })
    }

    // Calculate current scores by subject
    const subjectScores: Record<string, number> = {}
    const scoreTrend: number[] = []

    testAttempts.forEach(attempt => {
      if (attempt.subjectScores) {
        try {
          const scores = JSON.parse(attempt.subjectScores)
          Object.entries(scores).forEach(([subject, data]: [string, any]) => {
            if (!subjectScores[subject]) {
              subjectScores[subject] = { total: 0, correct: 0 }
            }
            subjectScores[subject].total += data.total || 0
            subjectScores[subject].correct += data.correct || 0
          })
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Calculate overall score for trend
      if (attempt.totalQuestions > 0) {
        const percentage = (attempt.score / attempt.totalQuestions) * 100
        scoreTrend.push(percentage)
      }
    })

    // Convert to percentages
    const currentScores: Record<string, number> = {}
    Object.entries(subjectScores).forEach(([subject, data]) => {
      if (data.total > 0) {
        currentScores[subject] = (data.correct / data.total) * 100
      }
    })

    // Calculate consistency (standard deviation of scores)
    const avgScore = scoreTrend.length > 0 
      ? scoreTrend.reduce((a, b) => a + b, 0) / scoreTrend.length 
      : 0
    const variance = scoreTrend.length > 1
      ? scoreTrend.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / (scoreTrend.length - 1)
      : 0
    const stdDev = Math.sqrt(variance)
    const consistency = Math.max(0, Math.min(1, 1 - (stdDev / 100))) // Normalize to 0-1

    // Calculate improvement rate (slope of trend)
    let improvementRate = 0
    if (scoreTrend.length >= 2) {
      const n = scoreTrend.length
      const sumX = (n * (n - 1)) / 2
      const sumY = scoreTrend.reduce((a, b) => a + b, 0)
      const sumXY = scoreTrend.reduce((sum, y, i) => sum + (i * y), 0)
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
      
      improvementRate = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    }

    // Call ML API for risk assessment
    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:5000'
    
    try {
      const mlResponse = await fetch(`${mlApiUrl}/early-intervention/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentScores,
          scoreTrend: scoreTrend.reverse(), // Oldest first
          consistency,
          improvementRate,
          weeksUntilExam: 8 // TODO: Calculate from actual exam date
        })
      })

      if (mlResponse.ok) {
        const mlData = await mlResponse.json()
        
        // Save alert if high risk
        if (mlData.riskLevel === 'high' || mlData.riskLevel === 'critical') {
          await prisma.atRiskAlert.create({
            data: {
              userId: session.user.id,
              riskLevel: mlData.riskLevel,
              riskScore: mlData.riskScore,
              predictedScore: mlData.predictedScore,
              weeksUntilExam: mlData.weeksUntilExam,
              reasons: JSON.stringify(mlData.riskFactors),
              recommendations: JSON.stringify(mlData.recommendations)
            }
          })
        }

        return NextResponse.json(mlData)
      }
    } catch (mlError) {
      console.error("ML API error, using fallback:", mlError)
    }

    // Fallback: Simple risk calculation
    const avgCurrentScore = Object.values(currentScores).length > 0
      ? Object.values(currentScores).reduce((a, b) => a + b, 0) / Object.values(currentScores).length
      : 0

    const predictedScore = avgCurrentScore + (improvementRate * 8)
    let riskScore = 0
    const riskFactors: string[] = []

    if (avgCurrentScore < 60) {
      riskScore += 0.4
      riskFactors.push("Current average score is below 60%")
    } else if (avgCurrentScore < 70) {
      riskScore += 0.2
      riskFactors.push("Current average score is below 70%")
    }

    if (predictedScore < 75) {
      riskScore += 0.3
      riskFactors.push(`Predicted score (${predictedScore.toFixed(1)}%) is below passing threshold`)
    }

    if (improvementRate < 0.5) {
      riskScore += 0.1
      riskFactors.push("Low improvement rate")
    }

    const riskLevel = riskScore >= 0.7 ? "high" : riskScore >= 0.4 ? "medium" : "low"

    const recommendations = riskScore >= 0.7
      ? [
          "URGENT: Schedule a meeting with your instructor",
          "Increase study time to at least 3-4 hours per day",
          "Focus on fundamental concepts before advanced topics"
        ]
      : riskScore >= 0.4
      ? [
          "Increase study time to 2-3 hours per day",
          "Focus on your weakest subjects first",
          "Review past tests and understand mistakes"
        ]
      : [
          "Maintain current study habits",
          "Continue focusing on areas for improvement"
        ]

    return NextResponse.json({
      riskScore: Math.min(1.0, riskScore),
      riskLevel,
      predictedScore,
      currentAverageScore: avgCurrentScore,
      weeksUntilExam: 8,
      riskFactors,
      recommendations
    })

  } catch (error) {
    console.error("Error assessing risk:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

