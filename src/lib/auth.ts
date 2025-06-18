import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'

export async function getCurrentUser(request?: NextRequest) {
  try {
    const session = await getServerSession()
    return session?.user || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth(request?: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
} 