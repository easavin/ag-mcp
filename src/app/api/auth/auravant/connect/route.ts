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
    const { token, extensionId, extensionSecret } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Bearer token is required. Generate a test token from your Auravant Extension Developer Space.' },
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
      message: 'Successfully connected to Auravant'
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