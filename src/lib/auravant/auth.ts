import { prisma } from '@/lib/prisma'
import { AuravantClient } from './client'

export class AuravantAuth {
  
  /**
   * Test if a Bearer token is valid by making a test API call
   */
  static async validateToken(token: string): Promise<boolean> {
    try {
      const client = new AuravantClient(token)
      return await client.testConnection()
    } catch (error) {
      console.error('Auravant token validation failed:', error)
      return false
    }
  }

  /**
   * Store Auravant token for a user
   */
  static async storeToken(userId: string, token: string, extensionId?: string): Promise<void> {
    try {
      await prisma.auravantToken.upsert({
        where: { userId },
        update: { 
          accessToken: token,
          extensionId,
          updatedAt: new Date()
        },
        create: {
          userId,
          accessToken: token,
          tokenType: 'Bearer',
          extensionId
        }
      })

      // Update user's connection status
      await prisma.user.update({
        where: { id: userId },
        data: { auravantConnected: true }
      })

      console.log(`Auravant token stored for user ${userId}`)
    } catch (error) {
      console.error('Failed to store Auravant token:', error)
      throw new Error('Failed to store authentication token')
    }
  }

  /**
   * Get stored Auravant token for a user
   */
  static async getToken(userId: string): Promise<string | null> {
    try {
      const tokenRecord = await prisma.auravantToken.findUnique({
        where: { userId }
      })

      return tokenRecord?.accessToken || null
    } catch (error) {
      console.error('Failed to retrieve Auravant token:', error)
      return null
    }
  }

  /**
   * Get Auravant client for a user
   */
  static async getClient(userId: string): Promise<AuravantClient | null> {
    const token = await this.getToken(userId)
    
    if (!token) {
      return null
    }

    return new AuravantClient(token)
  }

  /**
   * Check if user has valid Auravant connection
   */
  static async isConnected(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { auravantConnected: true }
      })

      if (!user?.auravantConnected) {
        return false
      }

      // Test if token is still valid
      const token = await this.getToken(userId)
      if (!token) {
        return false
      }

      return await this.validateToken(token)
    } catch (error) {
      console.error('Failed to check Auravant connection:', error)
      return false
    }
  }

  /**
   * Disconnect user from Auravant
   */
  static async disconnect(userId: string): Promise<void> {
    try {
      // Delete token
      await prisma.auravantToken.deleteMany({
        where: { userId }
      })

      // Update user connection status
      await prisma.user.update({
        where: { id: userId },
        data: { auravantConnected: false }
      })

      console.log(`Auravant disconnected for user ${userId}`)
    } catch (error) {
      console.error('Failed to disconnect Auravant:', error)
      throw new Error('Failed to disconnect from Auravant')
    }
  }

  /**
   * Get connection status and metadata for a user
   */
  static async getConnectionStatus(userId: string): Promise<{
    connected: boolean
    extensionId?: string
    lastUpdated?: Date
    tokenExpiry?: Date
  }> {
    try {
      const tokenRecord = await prisma.auravantToken.findUnique({
        where: { userId }
      })

      if (!tokenRecord) {
        return { connected: false }
      }

      const isValid = await this.validateToken(tokenRecord.accessToken)

      return {
        connected: isValid,
        extensionId: tokenRecord.extensionId || undefined,
        lastUpdated: tokenRecord.updatedAt,
        tokenExpiry: tokenRecord.expiresAt || undefined
      }
    } catch (error) {
      console.error('Failed to get Auravant connection status:', error)
      return { connected: false }
    }
  }

  /**
   * Refresh or validate existing token
   */
  static async refreshToken(userId: string): Promise<boolean> {
    try {
      const token = await this.getToken(userId)
      
      if (!token) {
        return false
      }

      const isValid = await this.validateToken(token)
      
      if (!isValid) {
        // Mark as disconnected if token is invalid
        await prisma.user.update({
          where: { id: userId },
          data: { auravantConnected: false }
        })
      }

      return isValid
    } catch (error) {
      console.error('Failed to refresh Auravant token:', error)
      return false
    }
  }
} 