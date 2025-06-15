import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/chat/sessions - Get all chat sessions for the user
export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication
    // For now, we'll use a placeholder user ID
    const userId = 'user_placeholder'

    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    )
  }
}

// POST /api/chat/sessions - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // TODO: Get user ID from authentication
    // For now, we'll use a placeholder user ID
    const userId = 'user_placeholder'

    const session = await prisma.chatSession.create({
      data: {
        userId,
        title,
      },
      include: {
        messages: true,
      },
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error creating chat session:', error)
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    )
  }
} 