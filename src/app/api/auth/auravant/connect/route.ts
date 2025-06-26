import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AuravantAuth } from '@/lib/auravant/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { token, extensionId, extensionSecret, useExtension, auravantUserId } = body

    // Extension-based connection (recommended for production)
    if (useExtension) {
      try {
        await AuravantAuth.connectViaExtension(session.user.id, auravantUserId)
        
        return NextResponse.json({
          success: true,
          message: 'Successfully connected to Auravant via Extension',
          method: 'extension'
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // If extension connection fails, provide helpful guidance
        if (errorMessage.includes('Extension not configured')) {
          return NextResponse.json({
            error: 'Extension not configured on server. Please contact administrator or use Bearer token method.',
            details: errorMessage,
            fallback: 'bearer_token'
          }, { status: 400 })
        }
        
        throw error
      }
    }

    // Bearer token connection (for developers and fallback)
    if (!token) {
      return NextResponse.json(
        { 
          error: 'Authentication method required',
          details: 'Please provide either a Bearer token or use Extension-based authentication',
          methods: {
            bearer_token: 'Provide "token" field with your Bearer token',
            extension: 'Set "useExtension": true (requires server Extension configuration)'
          }
        },
        { status: 400 }
      )
    }

    const finalToken = token
    const finalExtensionId = extensionId

    // Validate token by testing connection
    const isValid = await AuravantAuth.validateToken(finalToken)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Auravant credentials. Please check your credentials and try again.' },
        { status: 400 }
      )
    }

    // Store token for user
    await AuravantAuth.storeToken(session.user.id, finalToken, finalExtensionId)

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Auravant',
      method: 'bearer_token'
    })

  } catch (error) {
    console.error('Auravant connect error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to connect to Auravant',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 