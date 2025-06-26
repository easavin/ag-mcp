import { prisma } from '@/lib/prisma'
import { AuravantClient } from './client'

export class AuravantAuth {
  
  /**
   * Generate Bearer token from extension credentials
   */
  static async generateTokenFromExtension(extensionId: string, secret: string): Promise<string> {
    try {
      const response = await fetch('https://api.auravant.com/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extension_id: extensionId,
          secret: secret
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle Auravant-specific error codes
      if (data.code !== undefined && data.code !== 0) {
        throw new Error(data.msg || 'Failed to generate token')
      }

      // Return the Bearer token
      return data.token || data.access_token || data.bearer_token
    } catch (error) {
      console.error('Failed to generate token from extension credentials:', error)
      throw new Error('Failed to authenticate with extension credentials')
    }
  }

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

  /**
   * Generate Bearer token from extension credentials (Environment-based)
   */
  static async generateTokenFromEnvironment(): Promise<string> {
    const extensionId = process.env.AURAVANT_EXTENSION_ID
    const extensionSecret = process.env.AURAVANT_EXTENSION_SECRET

    if (!extensionId || !extensionSecret) {
      throw new Error('Extension credentials not configured. Please set AURAVANT_EXTENSION_ID and AURAVANT_EXTENSION_SECRET environment variables.')
    }

    return this.generateTokenFromExtension(extensionId, extensionSecret)
  }

  /**
   * Generate user-specific token via Extension (server-to-server)
   */
  static async generateUserTokenViaExtension(auravantUserId: string): Promise<string> {
    const extensionId = process.env.AURAVANT_EXTENSION_ID
    const extensionSecret = process.env.AURAVANT_EXTENSION_SECRET

    if (!extensionId || !extensionSecret) {
      throw new Error('Extension credentials not configured')
    }

    try {
      const response = await fetch('https://api.auravant.com/api/auth/extension/user-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extension_id: extensionId,
          secret: extensionSecret,
          user_id: auravantUserId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.code !== undefined && data.code !== 0) {
        throw new Error(data.msg || 'Failed to generate user token')
      }

      return data.token || data.access_token || data.bearer_token
    } catch (error) {
      console.error('Failed to generate user token via extension:', error)
      throw new Error('Failed to generate user token via extension')
    }
  }

  /**
   * List users who have installed the Extension
   */
  static async getExtensionUsers(): Promise<Array<{ user_id: string; email?: string; name?: string }>> {
    const extensionId = process.env.AURAVANT_EXTENSION_ID
    const extensionSecret = process.env.AURAVANT_EXTENSION_SECRET

    if (!extensionId || !extensionSecret) {
      throw new Error('Extension credentials not configured')
    }

    try {
      const response = await fetch('https://api.auravant.com/api/auth/extension/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Extension ${extensionId}:${extensionSecret}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.code !== undefined && data.code !== 0) {
        throw new Error(data.msg || 'Failed to get extension users')
      }

      return data.users || data.data || []
    } catch (error) {
      console.error('Failed to get extension users:', error)
      throw new Error('Failed to get extension users')
    }
  }

  /**
   * Connect user via Extension installation (improved UX)
   */
  static async connectViaExtension(userId: string, auravantUserId?: string): Promise<void> {
    try {
      const extensionId = process.env.AURAVANT_EXTENSION_ID

      if (!extensionId) {
        throw new Error('Extension not configured')
      }

      let token: string

      if (auravantUserId) {
        // Generate user-specific token
        token = await this.generateUserTokenViaExtension(auravantUserId)
      } else {
        // Use general extension token (less secure, for development)
        token = await this.generateTokenFromEnvironment()
      }

      // Store token with extension metadata
      await this.storeToken(userId, token, extensionId)

      console.log(`User ${userId} connected via Extension ${extensionId}${auravantUserId ? ` (Auravant User: ${auravantUserId})` : ''}`)
    } catch (error) {
      console.error('Failed to connect via extension:', error)
      throw new Error('Failed to connect via extension')
    }
  }

  /**
   * Auto-connect users based on Extension installations
   */
  static async syncExtensionUsers(): Promise<{ connected: number; errors: string[] }> {
    try {
      const extensionUsers = await this.getExtensionUsers()
      const errors: string[] = []
      let connected = 0

      for (const auravantUser of extensionUsers) {
        try {
          // Try to find matching user by email
          const user = await prisma.user.findUnique({
            where: { email: auravantUser.email }
          })

          if (user && !user.auravantConnected) {
            await this.connectViaExtension(user.id, auravantUser.user_id)
            connected++
          }
        } catch (error) {
          const errorMsg = `Failed to connect user ${auravantUser.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      return { connected, errors }
    } catch (error) {
      console.error('Failed to sync extension users:', error)
      throw new Error('Failed to sync extension users')
    }
  }
} 