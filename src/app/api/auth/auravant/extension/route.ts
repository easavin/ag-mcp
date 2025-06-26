import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AuravantAuth } from '@/lib/auravant/auth'

// GET /api/auth/auravant/extension - Get Extension status and users
export async function GET(request: NextRequest) {
  try {
    // Check authentication (admin only for security)
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const extensionId = process.env.AURAVANT_EXTENSION_ID
    const extensionSecret = process.env.AURAVANT_EXTENSION_SECRET

    if (!extensionId || !extensionSecret) {
      return NextResponse.json({
        configured: false,
        error: 'Extension credentials not configured',
        setup: {
          required_env_vars: ['AURAVANT_EXTENSION_ID', 'AURAVANT_EXTENSION_SECRET'],
          description: 'Set these environment variables with your Auravant Extension credentials'
        }
      })
    }

    try {
      // Test Extension connection and get users
      const extensionUsers = await AuravantAuth.getExtensionUsers()
      
      return NextResponse.json({
        configured: true,
        extension_id: extensionId,
        users_count: extensionUsers.length,
        users: extensionUsers,
        status: 'active'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return NextResponse.json({
        configured: true,
        extension_id: extensionId,
        error: errorMessage,
        status: 'error'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Extension status error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get extension status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/auth/auravant/extension - Sync Extension users
export async function POST(request: NextRequest) {
  try {
    // Check authentication (admin only for security)
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'sync_users') {
      try {
        const result = await AuravantAuth.syncExtensionUsers()
        
        return NextResponse.json({
          success: true,
          message: `Synchronized ${result.connected} users`,
          connected: result.connected,
          errors: result.errors
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        return NextResponse.json({
          error: 'Failed to sync Extension users',
          details: errorMessage
        }, { status: 400 })
      }
    }

    if (action === 'test_connection') {
      try {
        const token = await AuravantAuth.generateTokenFromEnvironment()
        const isValid = await AuravantAuth.validateToken(token)
        
        return NextResponse.json({
          success: true,
          connection_valid: isValid,
          message: isValid ? 'Extension connection is working' : 'Extension connection failed validation'
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        return NextResponse.json({
          success: false,
          connection_valid: false,
          error: errorMessage
        }, { status: 400 })
      }
    }

    return NextResponse.json(
      { 
        error: 'Invalid action',
        valid_actions: ['sync_users', 'test_connection']
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('Extension management error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to manage extension',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 