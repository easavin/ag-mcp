import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get current authenticated user
    const authUser = await getCurrentUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user and token information
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        johnDeereTokens: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.johnDeereConnected || !user.johnDeereTokens) {
      return NextResponse.json({
        isConnected: false,
        connection: null,
      })
    }

    // Check if token is expired
    const now = new Date()
    const isExpired = user.johnDeereTokens.expiresAt <= now

    if (isExpired) {
      // Mark user as disconnected if token is expired
      await prisma.user.update({
        where: { id: authUser.id },
        data: { johnDeereConnected: false },
      })

      return NextResponse.json({
        isConnected: false,
        connection: null,
      })
    }

    return NextResponse.json({
      isConnected: true,
      connection: {
        expiresAt: user.johnDeereTokens.expiresAt,
        scope: user.johnDeereTokens.scope,
        lastSync: user.johnDeereTokens.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error checking John Deere status:', error)
    return NextResponse.json(
      { error: 'Failed to check John Deere connection status' },
      { status: 500 }
    )
  }
} 