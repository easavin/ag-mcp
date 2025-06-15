import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const fieldId = searchParams.get('fieldId') || undefined

    const johnDeereClient = getJohnDeereAPIClient()
    const operations = await johnDeereClient.getFieldOperations(orgId, {
      startDate,
      endDate,
      fieldId,
    })

    return NextResponse.json({
      organizationId: orgId,
      operations,
      count: operations.length,
      filters: {
        startDate,
        endDate,
        fieldId,
      },
    })
  } catch (error) {
    console.error('Error fetching field operations:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('auth')) {
        return NextResponse.json(
          { error: 'John Deere authentication required. Please connect your account.' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch field operations' },
      { status: 500 }
    )
  }
} 