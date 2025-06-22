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

    // Get Auravant client
    const client = await AuravantAuth.getClient(session.user.id)
    if (!client) {
      return NextResponse.json(
        { error: 'Auravant not connected. Please connect your account first.' },
        { status: 400 }
      )
    }

    // Parse query parameters to determine what livestock data to fetch
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'herds' or 'paddocks'

    if (type === 'paddocks') {
      // Fetch paddocks
      const paddocks = await client.getPaddocks()
      return NextResponse.json({
        success: true,
        data: paddocks,
        count: paddocks.length,
        type: 'paddocks'
      })
    } else {
      // Default to herds
      const herds = await client.getHerds()
      return NextResponse.json({
        success: true,
        data: herds,
        count: herds.length,
        type: 'herds'
      })
    }

  } catch (error) {
    console.error('Auravant livestock API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch livestock data from Auravant',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 