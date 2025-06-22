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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const yeargroup = searchParams.get('yeargroup')
    const status = searchParams.get('status')
    const page = searchParams.get('page')
    const pageSize = searchParams.get('page_size')

    const params = {
      ...(yeargroup && { yeargroup: parseInt(yeargroup) }),
      ...(status && { status }),
      ...(page && { page: parseInt(page) }),
      ...(pageSize && { page_size: parseInt(pageSize) })
    }

    // Fetch work orders from Auravant
    const workOrders = await client.getWorkOrders(params)

    return NextResponse.json({
      success: true,
      data: workOrders,
      count: workOrders.length
    })

  } catch (error) {
    console.error('Auravant work orders API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch work orders from Auravant',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 