import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPI } from '@/lib/johndeere'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST callback route called')
    const { code, state } = await request.json()
    console.log('📝 Received code:', code?.substring(0, 10) + '...', 'state:', state)

    if (!code || !state) {
      console.error('❌ Missing code or state parameter')
      return NextResponse.json(
        { error: 'Missing authorization code or state parameter' },
        { status: 400 }
      )
    }

    // Get current authenticated user
    const authUser = await getCurrentUser(request)
    console.log('👤 Current user:', authUser ? `${authUser.email} (${authUser.id})` : 'null')
    
    if (!authUser) {
      console.error('❌ No authenticated user found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Exchange authorization code for tokens
    console.log('🔄 Exchanging code for tokens...')
    const johnDeereAPI = getJohnDeereAPI()
    const tokens = await johnDeereAPI.exchangeCodeForTokens(code)
    console.log('✅ Received tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    })

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Store tokens in database - handle missing refresh_token
    console.log('💾 Storing tokens in database for user:', authUser.id)
    await prisma.johnDeereToken.upsert({
      where: { userId: authUser.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
      create: {
        userId: authUser.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: tokens.scope,
      },
    })

    // Update user's John Deere connection status
    console.log('📝 Updating user connection status...')
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: { johnDeereConnected: true },
    })

    console.log('🎉 OAuth flow completed successfully!')
    return NextResponse.json({
      user: updatedUser,
      connection: {
        isConnected: true,
        expiresAt,
        scope: tokens.scope,
      },
    })
  } catch (error) {
    console.error('❌ Error handling John Deere callback:', error)
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

    // For GET requests (browser redirects), we can't easily get the authenticated user
    // So we'll redirect to a success page that will handle the completion client-side
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>John Deere Authorization</title>
      </head>
      <body>
        <script>
          console.log('🔧 Popup callback script executing...');
          console.log('🔧 Code:', '${code}');
          console.log('🔧 State:', '${state}');
          console.log('🔧 Window opener exists:', !!window.opener);
          
          // Send the code and state to the parent window or redirect to complete the flow
          if (window.opener) {
            console.log('🔧 Sending postMessage to parent...');
            window.opener.postMessage({
              type: 'JOHN_DEERE_AUTH_CALLBACK',
              code: '${code}',
              state: '${state}'
            }, window.location.origin);
            console.log('🔧 PostMessage sent, closing popup...');
            window.close();
          } else {
            console.log('🔧 No opener, redirecting to completion page...');
            // Main window was redirected, send to completion page
            window.location.href = '/johndeere-connection?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}';
          }
        </script>
        <p>Authorization successful! Completing connection...</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Error handling John Deere callback:', error)
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