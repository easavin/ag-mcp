import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Lazy initialization to avoid build-time issues
let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    try {
      prisma = new PrismaClient()
    } catch (error) {
      console.error('Failed to create Prisma client:', error)
      // Return a mock client to prevent crashes
      return {
        session: {
          findFirst: async () => null
        },
        user: {
          findUnique: async () => null
        }
      } as any
    }
  }
  return prisma
}

export async function getCurrentUser(request: NextRequest) {
  try {
    // Try to get user from session/cookie/header
    // Adjust this based on your auth implementation
    const cookies = request.cookies
    const sessionCookie = cookies.get('next-auth.session-token')?.value
    
    if (!sessionCookie) {
      console.log('No session cookie found')
      return null
    }

    // If using NextAuth, decode session
    // Example for database lookup:
    const client = getPrismaClient()
    const session = await client.session.findFirst({
      where: { sessionToken: sessionCookie },
      include: { user: true }
    })

    return session?.user || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function getUserById(userId: string) {
  try {
    const client = getPrismaClient()
    return await client.user.findUnique({
      where: { id: userId }
    })
  } catch (error) {
    console.error('Error getting user by ID:', error)
    return null
  }
}
