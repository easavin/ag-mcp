import { AuthenticationProvider } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { JohnDeereAuthConfig, JohnDeereTokens } from './types.js'

export class JohnDeereAuth implements AuthenticationProvider {
  private config: JohnDeereAuthConfig
  private tokens: JohnDeereTokens | null = null
  private refreshPromise: Promise<boolean> | null = null

  constructor() {
    this.config = {
      clientId: process.env.JOHN_DEERE_CLIENT_ID || '',
      clientSecret: process.env.JOHN_DEERE_CLIENT_SECRET || '',
      redirectUri: process.env.JOHN_DEERE_REDIRECT_URI || 'http://localhost:3000/api/auth/johndeere/callback',
      sandboxMode: process.env.JOHN_DEERE_SANDBOX_MODE === 'true'
    }

    // Validate configuration
    if (!this.config.clientId || !this.config.clientSecret) {
      MCPUtils.logWithTimestamp('WARN', 'John Deere: Missing client credentials in environment variables')
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      // If mock tokens are set, use them for testing
      if (this.tokens) {
        MCPUtils.logWithTimestamp('INFO', 'John Deere: Using existing tokens (mock or loaded)')
        return true
      }
      
      // For MCP server, we'll use the stored tokens from the main application
      // In a real implementation, this would integrate with the existing auth system
      return await this.loadTokensFromStorage()
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Authentication failed', error)
      return false
    }
  }

  async refreshToken(): Promise<boolean> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return await this.refreshPromise
    }

    this.refreshPromise = this.performTokenRefresh()
    const result = await this.refreshPromise
    this.refreshPromise = null
    
    return result
  }

  private async performTokenRefresh(): Promise<boolean> {
    if (!this.tokens?.refreshToken) {
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: No refresh token available')
      return false
    }

    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Refreshing access token')
      
      const baseUrl = this.config.sandboxMode 
        ? 'https://sandboxapi.deere.com'
        : 'https://api.deere.com'

      const response = await fetch(`${baseUrl}/platform/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refreshToken,
          scope: this.tokens.scope || 'ag1 ag2 ag3'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
        scope: data.scope || this.tokens.scope
      }

      // Save updated tokens
      await this.saveTokensToStorage()
      
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Token refreshed successfully')
      return true

    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Token refresh failed', error)
      this.tokens = null
      return false
    }
  }

  async isTokenValid(): Promise<boolean> {
    if (!this.tokens) {
      return false
    }

    // Check if token expires within the next 5 minutes
    const expirationBuffer = 5 * 60 * 1000 // 5 minutes in milliseconds
    return this.tokens.expiresAt > (Date.now() + expirationBuffer)
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null
  }

  async ensureValidToken(): Promise<string | null> {
    if (!this.tokens) {
      const authenticated = await this.authenticate()
      if (!authenticated) {
        return null
      }
    }

    const isValid = await this.isTokenValid()
    if (!isValid) {
      const refreshed = await this.refreshToken()
      if (!refreshed) {
        return null
      }
    }

    return this.getAccessToken()
  }

  private async loadTokensFromStorage(): Promise<boolean> {
    try {
      // In a real implementation, this would load from database or secure storage
      // For now, we'll simulate this with environment variables for testing
      const accessToken = process.env.JOHN_DEERE_ACCESS_TOKEN
      const refreshToken = process.env.JOHN_DEERE_REFRESH_TOKEN
      const expiresAt = process.env.JOHN_DEERE_TOKEN_EXPIRES_AT

      if (accessToken && refreshToken) {
        this.tokens = {
          accessToken,
          refreshToken,
          expiresAt: expiresAt ? parseInt(expiresAt) : Date.now() + (60 * 60 * 1000), // 1 hour default
          scope: 'ag1 ag2 ag3'
        }
        
        MCPUtils.logWithTimestamp('INFO', 'John Deere: Tokens loaded from storage')
        return true
      }

      // If no stored tokens, return false but don't error
      MCPUtils.logWithTimestamp('INFO', 'John Deere: No stored tokens found')
      return false

    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to load tokens from storage', error)
      return false
    }
  }

  private async saveTokensToStorage(): Promise<void> {
    try {
      // In a real implementation, this would save to database or secure storage
      // For now, we'll just log that we would save the tokens
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Tokens would be saved to storage (simulated)')
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to save tokens to storage', error)
    }
  }

  // Mock authentication for testing
  setMockTokens(tokens: JohnDeereTokens): void {
    this.tokens = tokens
    MCPUtils.logWithTimestamp('INFO', 'John Deere: Mock tokens set for testing')
  }

  clearTokens(): void {
    this.tokens = null
    MCPUtils.logWithTimestamp('INFO', 'John Deere: Tokens cleared')
  }

  getConfig(): JohnDeereAuthConfig {
    return { ...this.config }
  }
} 