import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'
import { authOptions } from './auth-config'

export async function getCurrentUser(request?: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
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