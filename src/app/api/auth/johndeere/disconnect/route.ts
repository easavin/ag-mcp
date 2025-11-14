import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get current authenticated user
    const authUser = await getCurrentUser(request)
    console.log('👤 Disconnect request from user:', authUser ? `${authUser.email} (${authUser.id})` : 'null')
    
    if (!authUser) {
      console.error('❌ No authenticated user found for disconnect')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        johnDeereTokens: true,
      },
    })

    if (!user) {
      console.error('❌ User not found in database:', authUser.id)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('🔄 Disconnecting John Deere for user:', authUser.id)

    // Delete John Deere tokens
    const deletedTokens = await prisma.johnDeereToken.deleteMany({
      where: { userId: authUser.id },
    })
    console.log('🗑️ Deleted tokens:', deletedTokens.count)

    // Update user's connection status
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: { johnDeereConnected: false },
    })
    console.log('✅ Updated user connection status to disconnected')

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