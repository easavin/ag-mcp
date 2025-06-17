import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPI } from '@/lib/johndeere'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication session
    // For now, we'll use the placeholder user
    const userId = 'user_placeholder'

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate John Deere authorization URL (force recreation to ensure correct redirect URI)
    const johnDeereAPI = getJohnDeereAPI(true)
    const { url, state } = johnDeereAPI.generateAuthorizationUrl([
      'ag1', // Basic agricultural data
      'ag2', // Field and boundary data
      'ag3', // Equipment and work records
      'eq1', // Equipment access (required for Assets API)
      'offline_access', // Request refresh token
    ])

    // Debug logging
    console.log('Generated authorization URL:', url)
    console.log('Environment variables check:')
    console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'NOT SET (using default: http://localhost:3000)')
    console.log('- JOHN_DEERE_CLIENT_ID:', process.env.JOHN_DEERE_CLIENT_ID ? 'SET' : 'NOT SET')
    console.log('- JOHN_DEERE_CLIENT_SECRET:', process.env.JOHN_DEERE_CLIENT_SECRET ? 'SET' : 'NOT SET')

    // Store the state parameter temporarily (in a real app, you'd use Redis or similar)
    // For now, we'll store it in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        // We'll add a temporary field for OAuth state
        // In production, use a separate table or cache
      },
    })

    return NextResponse.json({
      authorizationUrl: url,
      state,
    })
  } catch (error) {
    console.error('Error initiating John Deere authorization:', error)
    
    if (error instanceof Error && error.message.includes('credentials not configured')) {
      return NextResponse.json(
        { error: 'John Deere API not configured. Please check environment variables.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate John Deere authorization' },
      { status: 500 }
    )
  }
} 