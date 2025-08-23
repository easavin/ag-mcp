// Satshot MCP Server

import { Tool } from '@modelcontextprotocol/sdk/types'
import { BaseMCPServer } from '../base/mcp-server-base'
import { MCPServerConfig, MCPToolResult } from '../base/types'
import { MCPUtils } from '../base/utils'
import { SatshotAuth } from './auth'
import { SatshotTools } from './tools'

export class SatshotMCPServer extends BaseMCPServer {
  private auth!: SatshotAuth
  private satshotTools!: SatshotTools
  private startTime: number

  constructor() {
    const config: MCPServerConfig = {
      name: 'satshot-mcp-server',
      version: '1.0.0',
      port: parseInt(process.env.SATSHOT_MCP_PORT || '8006'),
      capabilities: {
        tools: {}
      }
    }

    super(config)
    this.startTime = Date.now()
  }

  setupToolHandlers(): void {
    // Initialize authentication and tools during setup
    this.auth = new SatshotAuth()
    this.satshotTools = new SatshotTools(this.auth)

    // Register all Satshot tools
    const mcpTools = this.satshotTools.getMCPTools()
    
    mcpTools.forEach(tool => {
      this.registerTool(tool)
    })

    MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Registered ${mcpTools.length} Satshot tools`)
  }

  getAvailableTools(): Tool[] {
    return this.satshotTools.getToolDefinitions()
  }

  protected async executeTool(name: string, args: any): Promise<MCPToolResult> {
    const tool = this.tools.get(name)
    if (!tool?.handler) {
      return MCPUtils.createErrorResult(`Tool not found: ${name}`)
    }

    try {
      MCPUtils.logWithTimestamp('INFO', `Satshot: Executing tool ${name}`, { args })
      return await tool.handler(args)
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', `Satshot: Tool execution failed for ${name}`, error)
      return MCPUtils.createErrorResult(
        `Error executing ${name}`,
        MCPUtils.formatError(error)
      )
    }
  }

  // Override health check to include Satshot-specific checks
  public async getHealthCheck() {
    try {
      const baseHealth = await super.getHealthCheck()
      
      // Test Satshot server connectivity
      const authStatus = this.auth.getAuthStatus()
      const canConnect = await this.auth.testServerConnection()
      
      if (canConnect && authStatus.hasCredentials) {
        return {
          ...baseHealth,
          details: {
            ...baseHealth.details,
            satshotAPI: authStatus.authenticated ? 'authenticated' : 'connected',
            server: authStatus.server,
            hasCredentials: authStatus.hasCredentials,
            lastTest: new Date().toISOString()
          }
        }
      } else {
        return MCPUtils.createHealthCheck('unhealthy', {
          ...baseHealth.details,
          satshotAPI: 'disconnected',
          server: authStatus.server,
          hasCredentials: authStatus.hasCredentials,
          error: canConnect ? 'Missing credentials' : 'Connection failed'
        }, 'Satshot API connectivity test failed')
      }
    } catch (error) {
      return MCPUtils.createHealthCheck('unhealthy', null, MCPUtils.formatError(error))
    }
  }

  /**
   * Get authentication status
   */
  public getAuthStatus() {
    return this.auth?.getAuthStatus() || {
      authenticated: false,
      server: 'us',
      sessionValid: false,
      hasCredentials: false
    }
  }

  /**
   * Authenticate with Satshot
   */
  public async authenticate(): Promise<boolean> {
    if (!this.auth) {
      return false
    }
    
    return await this.auth.authenticate()
  }

  /**
   * Test tool by name
   */
  public async testTool(name: string, args: any): Promise<MCPToolResult> {
    return await this.executeTool(name, args)
  }

  /**
   * Get available API methods from Satshot
   */
  public async getAvailableAPIMethods(): Promise<string[]> {
    try {
      const client = this.auth.getClient()
      if (!client) {
        throw new Error('No authenticated client available')
      }
      
      return await client.getAvailableMethods()
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', 'Failed to get available API methods', error)
      return []
    }
  }

  /**
   * Get server information
   */
  public getServerInfo() {
    return {
      ...this.auth.getServerInfo(),
      tools: this.tools.size,
      uptime: Date.now() - this.startTime
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.auth) {
      await this.auth.cleanup()
    }
    await super.stop()
  }
}

// Start server if run directly
if (require.main === module || 
    import.meta.url === `file://${process.argv[1]}`) {
  const server = new SatshotMCPServer()
  
  server.start().catch((error) => {
    MCPUtils.logWithTimestamp('ERROR', 'Failed to start Satshot MCP Server', error)
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down Satshot MCP Server...')
    await server.cleanup()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down Satshot MCP Server...')
    await server.cleanup()
    process.exit(0)
  })
}
