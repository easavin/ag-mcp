import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { BaseMCPServer } from '../base/mcp-server-base.js'
import { MCPServerConfig, MCPToolResult } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { JohnDeereAuth } from './auth.js'
import { JohnDeereToolsSimple } from './tools-simple.js'

export class JohnDeereMCPServer extends BaseMCPServer {
  private auth!: JohnDeereAuth
  private johnDeereTools!: JohnDeereToolsSimple

  constructor() {
    const config: MCPServerConfig = {
      name: 'john-deere-mcp-server',
      version: '1.0.0',
      port: parseInt(process.env.JOHN_DEERE_MCP_PORT || '8001'),
      capabilities: {
        tools: {}
      }
    }

    super(config)
  }

  setupToolHandlers(): void {
    // Initialize authentication and tools during setup
    this.auth = new JohnDeereAuth()
    this.johnDeereTools = new JohnDeereToolsSimple(this.auth)

    // Register all John Deere tools
    const mcpTools = this.johnDeereTools.getMCPTools()
    
    mcpTools.forEach(tool => {
      this.registerTool(tool)
    })

    MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Registered ${mcpTools.length} John Deere tools`)
  }

  getAvailableTools(): Tool[] {
    return this.johnDeereTools.getToolDefinitions()
  }

  protected async executeTool(name: string, args: any): Promise<MCPToolResult> {
    const tool = this.tools.get(name)
    
    if (!tool) {
      return MCPUtils.createErrorResult(
        `Unknown tool: ${name}`,
        `Tool '${name}' is not available in John Deere server`
      )
    }

    try {
      return await tool.handler(args)
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', `John Deere: Tool ${name} execution failed`, error)
      
      return MCPUtils.createErrorResult(
        `Tool execution failed: ${errorMessage}`,
        errorMessage
      )
    }
  }

  // Override health check to include John Deere-specific checks
  public async getHealthCheck() {
    try {
      const baseHealth = await super.getHealthCheck()
      
      // Test authentication status
      const authStatus = await this.auth.authenticate()
      
      return {
        ...baseHealth,
        details: {
          ...baseHealth.details,
          authentication: authStatus ? 'connected' : 'disconnected',
          lastTest: new Date().toISOString(),
          environment: this.auth.getConfig().sandboxMode ? 'sandbox' : 'production'
        }
      }
    } catch (error) {
      return MCPUtils.createHealthCheck('unhealthy', null, MCPUtils.formatError(error))
    }
  }

  // Method to set mock tokens for testing
  public setMockTokens(tokens: any): void {
    if (this.auth) {
      this.auth.setMockTokens(tokens)
    }
  }

  // Method to clear authentication
  public clearAuth(): void {
    if (this.auth) {
      this.auth.clearTokens()
    }
  }

  // Public method for testing tool execution
  public async testTool(name: string, args: any): Promise<MCPToolResult> {
    return await this.executeTool(name, args)
  }
}

// Start server if run directly
if (require.main === module || process.argv[1]?.includes('john-deere/server')) {
  const server = new JohnDeereMCPServer()
  
  server.start().catch((error) => {
    MCPUtils.logWithTimestamp('ERROR', 'Failed to start John Deere MCP Server', error)
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down John Deere MCP Server...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down John Deere MCP Server...')
    await server.stop()
    process.exit(0)
  })
} 