import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { SatshotAuth } from '@/mcp-servers/satshot/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check database for stored token
    const satshotToken = await prisma.satshotToken.findUnique({
      where: { userId },
      select: {
        sessionToken: true,
        server: true,
        username: true,
        expiresAt: true,
        lastUsed: true,
        createdAt: true
      }
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { satshotConnected: true }
    })

    // Test actual connection if we have a token
    let connectionValid = false
    if (satshotToken) {
      try {
        const auth = new SatshotAuth()
        connectionValid = await auth.testServerConnection()
      } catch (error) {
        console.warn('Failed to test Satshot connection:', error)
      }
    }

    // Check environment credentials
    const hasEnvCredentials = !!(process.env.SATSHOT_USERNAME && process.env.SATSHOT_PASSWORD)

    return NextResponse.json({
      success: true,
      data: {
        connected: user?.satshotConnected || false,
        hasToken: !!satshotToken,
        connectionValid,
        hasEnvCredentials,
        server: satshotToken?.server || process.env.SATSHOT_SERVER || 'us',
        username: satshotToken?.username,
        lastUsed: satshotToken?.lastUsed,
        connectedAt: satshotToken?.createdAt
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Satshot status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check Satshot status' },
      { status: 500 }
    )
  }
}
