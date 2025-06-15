import { prisma } from './prisma'
import { getJohnDeereAPI } from './johndeere'

export interface ValidatedTokens {
  accessToken: string
  expiresAt: Date
  scope: string
}

export async function getValidJohnDeereTokens(userId: string): Promise<ValidatedTokens | null> {
  try {
    // Get current tokens from database
    const tokenRecord = await prisma.johnDeereToken.findUnique({
      where: { userId },
    })

    if (!tokenRecord) {
      return null
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
    
    if (tokenRecord.expiresAt > fiveMinutesFromNow) {
      // Token is still valid
      return {
        accessToken: tokenRecord.accessToken,
        expiresAt: tokenRecord.expiresAt,
        scope: tokenRecord.scope || '',
      }
    }

    // Try to refresh the token
    try {
      const johnDeereAPI = getJohnDeereAPI()
      const newTokens = await johnDeereAPI.refreshAccessToken(tokenRecord.refreshToken)

      // Calculate new expiration date
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

      // Update tokens in database
      await prisma.johnDeereToken.update({
        where: { userId },
        data: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt,
          scope: newTokens.scope,
          updatedAt: new Date(),
        },
      })

      return {
        accessToken: newTokens.access_token,
        expiresAt,
        scope: newTokens.scope,
      }
    } catch (refreshError) {
      console.error('Failed to refresh John Deere token:', refreshError)
      
      // Mark user as disconnected and clean up tokens
      await prisma.user.update({
        where: { id: userId },
        data: { johnDeereConnected: false },
      })

      await prisma.johnDeereToken.deleteMany({
        where: { userId },
      })

      return null
    }
  } catch (error) {
    console.error('Error getting valid John Deere tokens:', error)
    return null
  }
}

export async function getAuthenticatedJohnDeereAPI(userId: string) {
  const tokens = await getValidJohnDeereTokens(userId)
  
  if (!tokens) {
    throw new Error('No valid John Deere tokens available')
  }

  const johnDeereAPI = getJohnDeereAPI()
  johnDeereAPI.setAccessToken(tokens.accessToken)
  
  return johnDeereAPI
} 