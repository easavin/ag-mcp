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
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error stack:', error.stack)
    }
    
    // Check for specific error types
    let errorMessage = 'Failed to complete John Deere authorization'
    if (error instanceof Error) {
      if (error.message.includes('credentials not configured')) {
        errorMessage = 'John Deere API credentials not configured'
      } else if (error.message.includes('Authentication required')) {
        errorMessage = 'User authentication required'
      } else if (error.message.includes('Failed to exchange')) {
        errorMessage = 'Failed to exchange authorization code for tokens'
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
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

    console.log('🔄 GET callback route called')
    console.log('📝 Received params:', { code: code ? 'PRESENT' : 'MISSING', state: state ? 'PRESENT' : 'MISSING', error })

    if (error) {
      // Return HTML page that closes popup and sends error to parent
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>John Deere Authorization Failed</title>
        </head>
        <body>
          <h3>Authorization Failed</h3>
          <p>Error: ${error}</p>
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
          <title>John Deere Authorization Failed</title>
        </head>
        <body>
          <h3>Authorization Failed</h3>
          <p>Missing authorization code or state.</p>
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
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // For GET requests (browser redirects), we can't easily get the authenticated user
    // So we'll redirect to a success page that will handle the completion client-side
    // We prefer redirecting to the handler page immediately to ensure reliability
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>John Deere Authorization</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; text-align: center; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <h3>Authorization Successful</h3>
        <p>Completing connection...</p>
        <div class="loader"></div>
        <p id="status">Redirecting...</p>
        
        <script>
          const code = '${code}';
          const state = '${state}';
          const targetUrl = '/johndeere-connection?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state);
          
          console.log('🔧 Popup callback script executing...');
          
          // Function to redirect to fallback page
          function redirectToFallback() {
             console.log('🔧 Redirecting to fallback page:', targetUrl);
             window.location.href = targetUrl;
          }

          // Force redirect immediately for reliability
          // The window.opener communication is fragile across different domains/protocols
          // Redirecting to the main app ensures we're back on the same origin
          console.log('🔧 Redirecting immediately to completion page...');
          setTimeout(redirectToFallback, 100);
          
        </script>
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