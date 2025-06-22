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

    // Fetch fields from Auravant
    const fields = await client.getFields()

    return NextResponse.json({
      success: true,
      data: fields,
      count: fields.length
    })

  } catch (error) {
    console.error('Auravant fields API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch fields from Auravant',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 