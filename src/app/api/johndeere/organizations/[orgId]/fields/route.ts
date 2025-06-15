import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedJohnDeereAPI } from '@/lib/johndeere-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    // Get authenticated John Deere API client
    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(userId)

    // Fetch fields for the organization
    const fields = await johnDeereAPI.getFields(orgId)

    return NextResponse.json({
      fields,
      count: fields.length,
      organizationId: orgId,
    })
  } catch (error) {
    console.error('Error fetching John Deere fields:', error)

    if (error instanceof Error && error.message.includes('No valid John Deere tokens')) {
      return NextResponse.json(
        { error: 'John Deere account not connected or tokens expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch fields' },
      { status: 500 }
    )
  }
} 