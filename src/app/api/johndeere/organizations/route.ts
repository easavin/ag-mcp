import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedJohnDeereAPI } from '@/lib/johndeere-auth'

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    // Get authenticated John Deere API client
    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(userId)

    // Fetch organizations
    const organizations = await johnDeereAPI.getOrganizations()

    return NextResponse.json({
      organizations,
      count: organizations.length,
    })
  } catch (error) {
    console.error('Error fetching John Deere organizations:', error)

    if (error instanceof Error && error.message.includes('No valid John Deere tokens')) {
      return NextResponse.json(
        { error: 'John Deere account not connected or tokens expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
} 