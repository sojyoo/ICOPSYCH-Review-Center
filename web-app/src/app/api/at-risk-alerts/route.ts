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
    const resolved = searchParams.get('resolved')
    const riskLevel = searchParams.get('riskLevel')

    const where: any = { userId: session.user.id }
    
    if (resolved === 'false' || resolved === null) {
      where.isResolved = false
    } else if (resolved === 'true') {
      where.isResolved = true
    }

    if (riskLevel) {
      where.riskLevel = riskLevel
    }

    const alerts = await prisma.atRiskAlert.findMany({
      where,
      orderBy: [
        { riskLevel: 'desc' }, // critical, high, medium, low
        { createdAt: 'desc' }
      ],
      take: 20
    })

    // Parse JSON fields
    const formatted = alerts.map(alert => ({
      id: alert.id,
      riskLevel: alert.riskLevel,
      riskScore: alert.riskScore,
      predictedScore: alert.predictedScore,
      weeksUntilExam: alert.weeksUntilExam,
      reasons: alert.reasons ? JSON.parse(alert.reasons) : [],
      recommendations: alert.recommendations ? JSON.parse(alert.recommendations) : [],
      isResolved: alert.isResolved,
      resolvedAt: alert.resolvedAt?.toISOString(),
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString()
    }))

    // Get stats
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.riskLevel === 'critical').length,
      high: alerts.filter(a => a.riskLevel === 'high').length,
      medium: alerts.filter(a => a.riskLevel === 'medium').length,
      low: alerts.filter(a => a.riskLevel === 'low').length,
      unresolved: alerts.filter(a => !a.isResolved).length
    }

    return NextResponse.json({
      alerts: formatted,
      stats
    })

  } catch (error) {
    console.error("Error fetching at-risk alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { alertId, isResolved } = body

    if (!alertId) {
      return NextResponse.json({ error: "Missing alertId" }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.atRiskAlert.findUnique({
      where: { id: alertId }
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 })
    }

    const alert = await prisma.atRiskAlert.update({
      where: { id: alertId },
      data: {
        isResolved: isResolved !== undefined ? isResolved : true,
        resolvedAt: isResolved !== false ? new Date() : null
      }
    })

    return NextResponse.json({
      id: alert.id,
      isResolved: alert.isResolved,
      resolvedAt: alert.resolvedAt?.toISOString()
    })

  } catch (error) {
    console.error("Error updating alert:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}




