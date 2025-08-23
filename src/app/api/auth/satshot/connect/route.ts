import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { SatshotAuth } from '@/mcp-servers/satshot/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Since Satshot uses environment credentials, we just test the connection
    const auth = new SatshotAuth()
    
    // Check if credentials are configured
    if (!auth.hasCredentials()) {
      return NextResponse.json({
        success: false,
        error: 'Satshot credentials not configured',
        message: 'Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD environment variables'
      }, { status: 400 })
    }

    // Test server connection
    const canConnect = await auth.testServerConnection()
    if (!canConnect) {
      return NextResponse.json({
        success: false,
        error: 'Cannot connect to Satshot server',
        message: 'Unable to reach the Satshot server. Please check server status.'
      }, { status: 503 })
    }

    // Test authentication
    const authResult = await auth.authenticate()
    if (!authResult) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid Satshot credentials. Please check username and password.'
      }, { status: 401 })
    }

    // Get session info
    const session_info = auth.getSession()
    const server_info = auth.getServerInfo()

    if (session_info) {
      // Store the session token in database
      await prisma.satshotToken.upsert({
        where: { userId },
        update: {
          sessionToken: session_info.sessionToken,
          server: session_info.server,
          username: session_info.username,
          lastUsed: new Date(),
          updatedAt: new Date()
        },
        create: {
          userId,
          sessionToken: session_info.sessionToken,
          server: session_info.server,
          username: session_info.username,
          lastUsed: new Date()
        }
      })

      // Update user connection status
      await prisma.user.update({
        where: { id: userId },
        data: { satshotConnected: true }
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Satshot',
        data: {
          server: server_info.server,
          username: session_info.username,
          connectedAt: new Date().toISOString()
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to establish session',
        message: 'Authentication succeeded but no session was created'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Satshot connection error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Satshot' },
      { status: 500 }
    )
  }
}
