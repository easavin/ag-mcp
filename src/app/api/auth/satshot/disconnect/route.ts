import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Delete stored tokens
    await prisma.satshotToken.deleteMany({
      where: { userId }
    })

    // Update user connection status
    await prisma.user.update({
      where: { id: userId },
      data: { satshotConnected: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from Satshot',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Satshot disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect from Satshot' },
      { status: 500 }
    )
  }
}
