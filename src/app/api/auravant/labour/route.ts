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
    const page = searchParams.get('page')
    const pageSize = searchParams.get('page_size')
    const farmId = searchParams.get('farm_id')
    const fieldId = searchParams.get('field_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const status = searchParams.get('status')

    // Yeargroup is required
    if (!yeargroup) {
      return NextResponse.json(
        { error: 'yeargroup parameter is required' },
        { status: 400 }
      )
    }

    const params = {
      yeargroup: parseInt(yeargroup),
      ...(page && { page: parseInt(page) }),
      ...(pageSize && { page_size: parseInt(pageSize) }),
      ...(farmId && { farm_id: parseInt(farmId) }),
      ...(fieldId && { field_id: parseInt(fieldId) }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
      ...(status && { status: parseInt(status) })
    }

    // Fetch labour operations from Auravant
    const labourResponse = await client.getLabourOperations(params)

    return NextResponse.json({
      success: true,
      data: labourResponse.data,
      pagination: labourResponse.pagination,
      count: labourResponse.data.length
    })

  } catch (error) {
    console.error('Auravant labour API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch labour operations from Auravant',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 