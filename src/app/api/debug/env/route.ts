import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow this in development or with a specific debug token
  const isDevelopment = process.env.NODE_ENV === 'development'
  const debugToken = request.nextUrl.searchParams.get('token')
  const validDebugToken = process.env.DEBUG_TOKEN || 'debug123'
  
  if (!isDevelopment && debugToken !== validDebugToken) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  // Safe environment check (don't expose secrets)
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    JOHN_DEERE_ENVIRONMENT: process.env.JOHN_DEERE_ENVIRONMENT || 'NOT SET',
    JOHN_DEERE_CLIENT_ID: process.env.JOHN_DEERE_CLIENT_ID ? 'SET' : 'NOT SET',
    JOHN_DEERE_CLIENT_SECRET: process.env.JOHN_DEERE_CLIENT_SECRET ? 'SET' : 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    
    // Computed values
    redirectUri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/johndeere/callback`,
    isProduction: process.env.NODE_ENV === 'production',
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json({
    message: 'Environment check',
    environment: envCheck,
    recommendations: {
      nextauthUrl: envCheck.NEXTAUTH_URL === 'NOT SET' ? 'Set NEXTAUTH_URL to your production domain' : 'OK',
      johnDeereClientId: envCheck.JOHN_DEERE_CLIENT_ID === 'NOT SET' ? 'Set JOHN_DEERE_CLIENT_ID' : 'OK',
      johnDeereClientSecret: envCheck.JOHN_DEERE_CLIENT_SECRET === 'NOT SET' ? 'Set JOHN_DEERE_CLIENT_SECRET' : 'OK',
      redirectUriMatch: envCheck.NEXTAUTH_URL === 'NOT SET' ? 'Update redirect URI in John Deere developer portal' : `Update John Deere redirect URI to: ${envCheck.redirectUri}`,
    }
  })
} 