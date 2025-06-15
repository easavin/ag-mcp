import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPI } from '@/lib/johndeere'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json()

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or state parameter' },
        { status: 400 }
      )
    }

    // TODO: Verify state parameter matches what we stored
    // For now, we'll skip state verification in development

    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    // Exchange authorization code for tokens
    const johnDeereAPI = getJohnDeereAPI()
    const tokens = await johnDeereAPI.exchangeCodeForTokens(code)

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Store tokens in database
    await prisma.johnDeereToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
      },
    })

    // Update user's John Deere connection status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { johnDeereConnected: true },
    })

    return NextResponse.json({
      user: updatedUser,
      connection: {
        isConnected: true,
        expiresAt,
        scope: tokens.scope,
      },
    })
  } catch (error) {
    console.error('Error handling John Deere callback:', error)
    return NextResponse.json(
      { error: 'Failed to complete John Deere authorization' },
      { status: 500 }
    )
  }
}

// Handle GET requests for direct browser callbacks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      // Redirect to frontend with error
      return NextResponse.redirect(
        new URL(`/?error=john_deere_auth_failed&message=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/?error=john_deere_auth_failed&message=Missing authorization code', request.url)
      )
    }

    // Process the callback using the same logic as POST
    const userId = 'user_placeholder'
    const johnDeereAPI = getJohnDeereAPI()
    const tokens = await johnDeereAPI.exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await prisma.johnDeereToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { johnDeereConnected: true },
    })

    // Redirect to frontend with success
    return NextResponse.redirect(
      new URL('/?john_deere_connected=true', request.url)
    )
  } catch (error) {
    console.error('Error handling John Deere GET callback:', error)
    return NextResponse.redirect(
      new URL('/?error=john_deere_auth_failed&message=Authorization failed', request.url)
    )
  }
} 