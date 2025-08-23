// Satshot Authentication Manager

import { AuthenticationProvider } from '../base/types'
import { MCPUtils } from '../base/utils'
import { SatshotXMLRPCClient } from './client'
import { SatshotConfig, SatshotSession, SatshotServer, SATSHOT_SERVERS } from './types'

export class SatshotAuth implements Partial<AuthenticationProvider> {
  private config: SatshotConfig
  private client: SatshotXMLRPCClient | null = null
  private session: SatshotSession | null = null

  constructor() {
    this.config = {
      username: process.env.SATSHOT_USERNAME || '',
      password: process.env.SATSHOT_PASSWORD || '',
      server: (process.env.SATSHOT_SERVER as SatshotServer) || 'us',
      baseUrl: SATSHOT_SERVERS[(process.env.SATSHOT_SERVER as SatshotServer) || 'us']
    }

    // Validate configuration
    if (!this.config.username || !this.config.password) {
      MCPUtils.logWithTimestamp('WARN', 'Satshot: Missing credentials in environment variables')
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      // WORKAROUND: Always re-authenticate since sessions don't persist
      // This is due to Satshot's session management not working as expected
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Re-authenticating for each request')

      // Create new client for each authentication attempt
      this.client = new SatshotXMLRPCClient(this.config)
      
      // Test connection first
      const canConnect = await this.client.testConnection()
      if (!canConnect) {
        throw new Error('Unable to connect to Satshot server')
      }

      // Perform login
      this.session = await this.client.login()
      
      MCPUtils.logWithTimestamp('INFO', `Satshot: Fresh authentication successful for ${this.config.username}`)
      return true

    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Authentication failed', error)
      this.session = null
      this.client = null
      return false
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.client || !this.session) {
      return false
    }

    try {
      // Try a simple authenticated call to validate session
      await this.client.callMethod('get_my_user_info', [])
      
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Session validation successful')
      return true

    } catch (error) {
      MCPUtils.logWithTimestamp('WARN', 'Satshot: Session validation failed', error)
      return false
    }
  }

  async logout(): Promise<void> {
    if (this.client) {
      try {
        await this.client.logout()
        MCPUtils.logWithTimestamp('INFO', 'Satshot: Logout successful')
      } catch (error) {
        MCPUtils.logWithTimestamp('WARN', 'Satshot: Logout failed', error)
      }
    }

    this.session = null
    this.client = null
  }

  getClient(): SatshotXMLRPCClient | null {
    return this.client
  }

  getSession(): SatshotSession | null {
    return this.session
  }

  getConfig(): SatshotConfig {
    return { ...this.config }
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    return !!(this.config.username && this.config.password)
  }

  /**
   * Test server connectivity without authentication
   */
  async testServerConnection(): Promise<boolean> {
    try {
      const tempClient = new SatshotXMLRPCClient(this.config)
      const result = await tempClient.testConnection()
      await tempClient.cleanup()
      return result
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Server connection test failed', error)
      return false
    }
  }

  /**
   * Get available servers
   */
  getAvailableServers(): string[] {
    return Object.keys(SATSHOT_SERVERS)
  }

  /**
   * Switch to different server
   */
  switchServer(server: SatshotServer): void {
    if (!(server in SATSHOT_SERVERS)) {
      throw new Error(`Invalid Satshot server: ${server}`)
    }

    this.config.server = server
    this.config.baseUrl = SATSHOT_SERVERS[server]

    // Invalidate current session since it's server-specific
    this.session = null
    this.client = null

    MCPUtils.logWithTimestamp('INFO', `Satshot: Switched to ${server} server`)
  }

  /**
   * Get server info
   */
  getServerInfo(): { server: string; url: string; connected: boolean } {
    return {
      server: this.config.server,
      url: this.config.baseUrl,
      connected: this.session !== null
    }
  }

  /**
   * Refresh authentication
   */
  async refreshAuth(): Promise<boolean> {
    MCPUtils.logWithTimestamp('INFO', 'Satshot: Refreshing authentication')
    
    // Logout current session
    await this.logout()
    
    // Re-authenticate
    return await this.authenticate()
  }

  /**
   * Get authentication status
   */
  getAuthStatus(): {
    authenticated: boolean
    username?: string
    server: string
    sessionValid: boolean
    hasCredentials: boolean
  } {
    return {
      authenticated: this.session !== null,
      username: this.config.username || undefined,
      server: this.config.server,
      sessionValid: this.session !== null && this.client !== null,
      hasCredentials: this.hasCredentials()
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.logout()
  }
}
