import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    // Delete John Deere tokens
    await prisma.johnDeereToken.deleteMany({
      where: { userId },
    })

    // Update user's connection status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { johnDeereConnected: false },
    })

    return NextResponse.json({
      user: updatedUser,
      message: 'Successfully disconnected from John Deere',
    })
  } catch (error) {
    console.error('Error disconnecting from John Deere:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect from John Deere' },
      { status: 500 }
    )
  }
} 