import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function GET(request: NextRequest) {
  try {
    const johnDeereClient = getJohnDeereAPIClient()
    const organizations = await johnDeereClient.getOrganizations()

    return NextResponse.json({
      organizations,
      count: organizations.length,
    })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('auth')) {
        return NextResponse.json(
          { error: 'John Deere authentication required. Please connect your account.' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
} 