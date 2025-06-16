import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPI } from '@/lib/johndeere'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    // Get current tokens from database
    const tokenRecord = await prisma.johnDeereToken.findUnique({
      where: { userId },
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'No John Deere tokens found for user' },
        { status: 404 }
      )
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
    
    if (tokenRecord.expiresAt > fiveMinutesFromNow) {
      // Token is still valid
      return NextResponse.json({
        connection: {
          isConnected: true,
          expiresAt: tokenRecord.expiresAt,
          scope: tokenRecord.scope,
        },
      })
    }

    // Refresh the token
    const johnDeereAPI = getJohnDeereAPI()
    
    if (!tokenRecord.refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const newTokens = await johnDeereAPI.refreshAccessToken(tokenRecord.refreshToken)

    // Calculate new expiration date
    const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

    // Update tokens in database
    const updatedTokens = await prisma.johnDeereToken.update({
      where: { userId },
      data: {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt,
        scope: newTokens.scope,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      connection: {
        isConnected: true,
        expiresAt: updatedTokens.expiresAt,
        scope: updatedTokens.scope,
      },
    })
  } catch (error) {
    console.error('Error refreshing John Deere token:', error)

    // If refresh fails, mark user as disconnected
    try {
      await prisma.user.update({
        where: { id: 'user_placeholder' },
        data: { johnDeereConnected: false },
      })

      // Optionally delete the invalid tokens
      await prisma.johnDeereToken.deleteMany({
        where: { userId: 'user_placeholder' },
      })
    } catch (dbError) {
      console.error('Error updating user connection status:', dbError)
    }

    return NextResponse.json(
      { error: 'Failed to refresh John Deere token' },
      { status: 401 }
    )
  }
} 