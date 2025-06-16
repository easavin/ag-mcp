import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    const johnDeereClient = getJohnDeereAPIClient()
    const farms = await johnDeereClient.getFarms(orgId)

    return NextResponse.json({
      organizationId: orgId,
      farms,
      count: farms.length,
    })
  } catch (error) {
    console.error('Error fetching farms:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('auth')) {
        return NextResponse.json(
          { error: 'John Deere authentication required. Please connect your account.' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch farms' },
      { status: 500 }
    )
  }
} 