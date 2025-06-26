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
    const { useExtension, auravantUserId } = body

    // Only extension-based connection is supported
    if (!useExtension) {
      return NextResponse.json(
        { 
          error: 'Extension authentication required',
          details: 'Only Extension-based authentication is supported. Please ensure the Extension is properly configured.'
        },
        { status: 400 }
      )
    }

    try {
      await AuravantAuth.connectViaExtension(session.user.id, auravantUserId)
      
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Auravant via Extension',
        method: 'extension'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Provide helpful guidance for extension connection failures
      if (errorMessage.includes('Extension not configured')) {
        return NextResponse.json({
          error: 'Extension not configured on server. Please contact your administrator to set up the Auravant Extension.',
          details: errorMessage
        }, { status: 400 })
      }
      
      if (errorMessage.includes('Extension not published')) {
        return NextResponse.json({
          error: 'Extension is not published yet. Please publish your Extension in the Auravant Developer Space first.',
          details: errorMessage
        }, { status: 400 })
      }
      
      throw error
    }

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