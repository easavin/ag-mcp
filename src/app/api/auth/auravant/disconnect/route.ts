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

    // Disconnect from Auravant
    await AuravantAuth.disconnect(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from Auravant'
    })

  } catch (error) {
    console.error('Auravant disconnect error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to disconnect from Auravant',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 