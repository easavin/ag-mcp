import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AuravantAuth } from '@/lib/auravant/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get connection status
    const status = await AuravantAuth.getConnectionStatus(session.user.id)

    return NextResponse.json({
      ...status,
      platform: 'auravant'
    })

  } catch (error) {
    console.error('Auravant status error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to get Auravant status',
        details: errorMessage,
        connected: false
      },
      { status: 500 }
    )
  }
} 