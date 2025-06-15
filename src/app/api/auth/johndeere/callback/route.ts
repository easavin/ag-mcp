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

    console.log('Received tokens:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope 
    })

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Store tokens in database - handle missing refresh_token
    await prisma.johnDeereToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
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
      // Return HTML page that closes popup and sends error to parent
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>John Deere Authorization</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'JOHN_DEERE_AUTH_ERROR',
                error: '${encodeURIComponent(error)}'
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/?error=john_deere_auth_failed&message=${encodeURIComponent(error)}';
            }
          </script>
          <p>Authorization failed. This window should close automatically.</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    if (!code || !state) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>John Deere Authorization</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'JOHN_DEERE_AUTH_ERROR',
                error: 'Missing authorization code'
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/?error=john_deere_auth_failed&message=Missing authorization code';
            }
          </script>
          <p>Authorization failed. This window should close automatically.</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // Process the callback using the same logic as POST
    const userId = 'user_placeholder'
    const johnDeereAPI = getJohnDeereAPI()
    const tokens = await johnDeereAPI.exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    console.log('GET callback - Received tokens:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope 
    })

    await prisma.johnDeereToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: tokens.scope,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { johnDeereConnected: true },
    })

    // Return HTML page that closes popup and sends success message to parent
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>John Deere Authorization</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'JOHN_DEERE_AUTH_SUCCESS',
              connection: {
                isConnected: true,
                expiresAt: '${expiresAt.toISOString()}',
                scope: '${tokens.scope}'
              }
            }, window.location.origin);
            window.close();
          } else {
            window.location.href = '/?john_deere_connected=true';
          }
        </script>
        <p>Authorization successful! This window should close automatically.</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Error handling John Deere GET callback:', error)
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>John Deere Authorization</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'JOHN_DEERE_AUTH_ERROR',
              error: 'Authorization failed'
            }, window.location.origin);
            window.close();
          } else {
            window.location.href = '/?error=john_deere_auth_failed&message=Authorization failed';
          }
        </script>
        <p>Authorization failed. This window should close automatically.</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    })
  }
} 