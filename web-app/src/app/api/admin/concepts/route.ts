import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - List all concepts (for tagging questions)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')

    const where: any = {}
    if (subject) where.subject = subject

    const concepts = await prisma.concept.findMany({
      where,
      orderBy: [
        { subject: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ concepts })
  } catch (error) {
    console.error("Error fetching concepts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}





