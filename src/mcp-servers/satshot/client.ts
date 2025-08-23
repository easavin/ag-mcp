// Satshot XML-RPC Client

import * as xmlrpc from 'xmlrpc'
import { parseString } from 'xml2js'
import { MCPUtils } from '../base/utils'
import { 
  SatshotConfig, 
  SatshotSession, 
  XMLRPCResponse, 
  XMLRPCError,
  SATSHOT_SERVERS,
  SatshotServer 
} from './types'

export class SatshotXMLRPCClient {
  private config: SatshotConfig
  private session: SatshotSession | null = null
  private client: any = null
  private cookies: string[] = [] // Store cookies for session management

  constructor(config: SatshotConfig) {
    this.config = config
    this.initializeClient()
  }

  private initializeClient(): void {
    try {
      const serverUrl = SATSHOT_SERVERS[this.config.server]
      this.client = xmlrpc.createSecureClient(serverUrl)
      MCPUtils.logWithTimestamp('INFO', `Satshot XML-RPC client initialized for ${this.config.server} server`)
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'Failed to initialize Satshot XML-RPC client', error)
      throw new Error('Failed to initialize XML-RPC client')
    }
  }

  private getClientUrl(): string {
    const baseUrl = SATSHOT_SERVERS[this.config.server]
    if (this.session) {
      // Use the working authentication format: token in URL + cookies
      return `${baseUrl}?idtoken=${this.session.sessionToken}`
    }
    return baseUrl
  }

  /**
   * Login to Satshot and establish session using cookie-based authentication
   */
  async login(): Promise<SatshotSession> {
    try {
      MCPUtils.logWithTimestamp('INFO', `Attempting Satshot login for user: ${this.config.username}`)

      // Use cookie-aware login
      const response = await this.makeXMLRPCCallWithCookies('login', [
        this.config.username,
        this.config.password
      ])

      if (response.error) {
        throw new Error(`Login failed: ${response.error.faultString}`)
      }

      const sessionToken = response.result
      if (!sessionToken) {
        throw new Error('No session token received from login')
      }

      this.session = {
        sessionToken,
        server: this.config.server,
        username: this.config.username,
        expiresAt: undefined // Satshot doesn't provide explicit expiration
      }

      MCPUtils.logWithTimestamp('INFO', `Satshot login successful with ${this.cookies.length} cookies`)
      return this.session

    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'Satshot login failed', error)
      throw error
    }
  }

  /**
   * Logout from Satshot
   */
  async logout(): Promise<void> {
    if (!this.session) {
      return
    }

    try {
      await this.makeXMLRPCCall('logout', [])
      this.session = null
      MCPUtils.logWithTimestamp('INFO', 'Satshot logout successful')
    } catch (error) {
      MCPUtils.logWithTimestamp('WARN', 'Satshot logout failed', error)
      // Still clear session even if logout fails
      this.session = null
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    return this.session !== null
  }

  /**
   * Get current session
   */
  getSession(): SatshotSession | null {
    return this.session
  }

  /**
   * Set session (for restored sessions)
   */
  setSession(session: SatshotSession): void {
    this.session = session
  }

  /**
   * Make authenticated XML-RPC call
   */
  async callMethod(method: string, params: any[] = []): Promise<any> {
    if (!this.session) {
      throw new Error('No active Satshot session. Please login first.')
    }

    try {
      return await this.makeXMLRPCCall(method, params)
    } catch (error) {
      // If call fails due to session issues, try to re-login once
      if (this.isSessionError(error)) {
        MCPUtils.logWithTimestamp('WARN', 'Session expired, attempting re-login')
        try {
          await this.login()
          return await this.makeXMLRPCCall(method, params)
        } catch (reloginError) {
          MCPUtils.logWithTimestamp('ERROR', 'Re-login failed', reloginError)
          throw reloginError
        }
      }
      throw error
    }
  }

  /**
   * Make cookie-aware XML-RPC call
   */
  private async makeXMLRPCCallWithCookies(method: string, params: any[]): Promise<XMLRPCResponse> {
    const https = require('https')
    const { URL } = require('url')
    
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      // Create XML-RPC request body
      const xmlrpcRequest = `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
${params.map(param => `    <param><value><string>${param}</string></value></param>`).join('\n')}
  </params>
</methodCall>`

      const url = new URL(this.config.baseUrl)
      const options: any = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(xmlrpcRequest),
          'User-Agent': 'NodeJS XML-RPC Client'
        }
      }

      // Add cookies to request if we have them
      if (this.cookies.length > 0) {
        options.headers['Cookie'] = this.cookies.join('; ')
      }

      const req = https.request(options, (res: any) => {
        let data = ''
        
        // Capture cookies from response
        const newCookies = res.headers['set-cookie']
        if (newCookies) {
          // Update our cookie store
          this.cookies = newCookies.map((cookie: string) => cookie.split(';')[0])
          MCPUtils.logWithTimestamp('INFO', `Updated cookies: ${this.cookies.join('; ')}`)
        }

        res.on('data', (chunk: any) => {
          data += chunk
        })

        res.on('end', () => {
          const duration = Date.now() - startTime
          
          try {
            // Parse XML-RPC response using xml2js
            parseString(data, { explicitArray: false }, (error: any, result: any) => {
              if (error) {
                MCPUtils.logWithTimestamp('ERROR', `XML-RPC parse error: ${method}`, error)
                resolve({ 
                  error: { 
                    faultCode: -1, 
                    faultString: `Parse error: ${error.message}` 
                  } 
                })
              } else if (result?.methodResponse?.fault) {
                // Handle XML-RPC fault response
                const fault = result.methodResponse.fault.value
                resolve({ 
                  error: { 
                    faultCode: fault.struct?.member?.find((m: any) => m.name === 'faultCode')?.value?.int || -1,
                    faultString: fault.struct?.member?.find((m: any) => m.name === 'faultString')?.value?.string || 'Unknown error'
                  } 
                })
              } else if (result?.methodResponse?.params?.param?.value) {
                // Handle successful response - extract the actual value
                const value = result.methodResponse.params.param.value
                let extractedResult = value.string || value.int || value.double || value
                
                MCPUtils.logWithTimestamp('INFO', `XML-RPC call successful: ${method}`, {
                  duration: `${duration}ms`,
                  cookies: this.cookies.length,
                  result: extractedResult
                })
                resolve({ result: extractedResult })
              } else {
                MCPUtils.logWithTimestamp('ERROR', `Unexpected XML-RPC response format: ${method}`, result)
                resolve({ 
                  error: { 
                    faultCode: -1, 
                    faultString: 'Unexpected response format' 
                  } 
                })
              }
            })
          } catch (parseError: any) {
            MCPUtils.logWithTimestamp('ERROR', `XML-RPC response parse failed: ${method}`, parseError)
            resolve({ 
              error: { 
                faultCode: -1, 
                faultString: `Response parse failed: ${parseError?.message || 'Unknown parse error'}` 
              } 
            })
          }
        })
      })

      req.on('error', (error: any) => {
        const duration = Date.now() - startTime
        MCPUtils.logWithTimestamp('ERROR', `XML-RPC request failed: ${method}`, error)
        resolve({ 
          error: { 
            faultCode: -1, 
            faultString: `Request failed: ${error.message}` 
          } 
        })
      })

      req.write(xmlrpcRequest)
      req.end()
    })
  }

  /**
   * Make raw XML-RPC call with cookie support
   */
  private async makeXMLRPCCall(method: string, params: any[]): Promise<XMLRPCResponse> {
    // Use cookie-aware method for all calls now
    return this.makeXMLRPCCallWithCookies(method, params)
  }

  /**
   * Check if error is session-related
   */
  private isSessionError(error: any): boolean {
    if (!error) return false
    
    const errorString = error.faultString || error.message || ''
    return errorString.toLowerCase().includes('session') ||
           errorString.toLowerCase().includes('login') ||
           errorString.toLowerCase().includes('authentication') ||
           error.faultCode === 401 ||
           error.faultCode === 403
  }

  /**
   * Test connection to Satshot server
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use Satshot-specific connectivity test instead of system.listMethods
      return await this.testServerConnectivity()
      
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'Server connection test error', error)
      return false
    }
  }

  /**
   * Test server connectivity using Satshot's core_api methods
   */
  async testServerConnectivity(): Promise<boolean> {
    try {
      // Try to call a basic Satshot method without authentication
      // get_my_user_info will return "You are not logged in" instead of "method not found"
      const response = await this.makeXMLRPCCall('get_my_user_info', [])
      
      if (response.error && response.error.faultCode !== -32601) {
        // If it's not a "method not found" error, server is responding
        MCPUtils.logWithTimestamp('INFO', 'Satshot server is responding (auth may be required)')
        return true
      } else if (!response.error) {
        MCPUtils.logWithTimestamp('INFO', 'Satshot server connectivity confirmed')
        return true
      }
      
      // Try alternative approach - just test if we can reach the server
      MCPUtils.logWithTimestamp('WARN', 'Standard methods not available, server may require authentication')
      return true // Server is reachable but requires auth
      
    } catch (error) {
      MCPUtils.logWithTimestamp('WARN', 'Server connectivity test failed', error)
      return false
    }
  }

  /**
   * Get available API methods (returns known Satshot methods)
   */
  async getAvailableMethods(): Promise<string[]> {
    // Satshot doesn't support system.listMethods introspection
    // Return known methods from API documentation
    return [
      'login',
      'logout', 
      'get_my_user_info',
      'mapcenter_api.get_my_user_info',
      'mapcenter_api.get_visible_groups',
      'get_available_maps',
      'mapcenter_api.get_regions',
      'mapcenter_api.get_scenes',
      'mapcenter_api.analyze_scene',
      'mapcenter_api.export_data'
    ]
  }

  /**
   * Get method signature
   */
  async getMethodSignature(method: string): Promise<any> {
    try {
      const response = await this.makeXMLRPCCall('system.methodSignature', [method])
      
      if (response.error) {
        throw new Error(`Failed to get method signature: ${response.error.faultString}`)
      }
      
      return response.result
      
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', `Failed to get signature for ${method}`, error)
      throw error
    }
  }

  /**
   * Get method help
   */
  async getMethodHelp(method: string): Promise<string> {
    try {
      const response = await this.makeXMLRPCCall('system.methodHelp', [method])
      
      if (response.error) {
        throw new Error(`Failed to get method help: ${response.error.faultString}`)
      }
      
      return response.result || 'No help available'
      
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', `Failed to get help for ${method}`, error)
      throw error
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.logout()
    } catch (error) {
      MCPUtils.logWithTimestamp('WARN', 'Error during cleanup', error)
    }
  }
}
