import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { BaseMCPServer } from '../base/mcp-server-base.js'
import { MCPServerConfig, MCPToolResult } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { USDATools } from './tools.js'

export class USDAMCPServer extends BaseMCPServer {
  private usdaTools!: USDATools

  constructor() {
    const config: MCPServerConfig = {
      name: 'usda-mcp-server',
      version: '1.0.0',
      port: parseInt(process.env.USDA_MCP_PORT || '8003'),
      capabilities: {
        tools: {}
      }
    }

    super(config)
  }

  setupToolHandlers(): void {
    // Initialize USDA tools during setup
    this.usdaTools = new USDATools()

    // Register all USDA tools
    const mcpTools = this.usdaTools.getMCPTools()
    
    mcpTools.forEach(tool => {
      this.registerTool(tool)
    })

    MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Registered ${mcpTools.length} USDA tools`)
  }

  getAvailableTools(): Tool[] {
    return this.usdaTools.getToolDefinitions()
  }

  protected async executeTool(name: string, args: any): Promise<MCPToolResult> {
    const tool = this.tools.get(name)
    
    if (!tool) {
      return MCPUtils.createErrorResult(
        `Unknown tool: ${name}`,
        `Tool '${name}' is not available in USDA server`
      )
    }

    try {
      return await tool.handler(args)
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', `USDA: Tool ${name} execution failed`, error)
      
      return MCPUtils.createErrorResult(
        `Tool execution failed: ${errorMessage}`,
        errorMessage
      )
    }
  }

  // Override health check to include USDA-specific checks
  public async getHealthCheck() {
    try {
      const baseHealth = await super.getHealthCheck()
      
      // Test USDA data availability
      const testResult = await this.usdaTools.getMarketPrices({ category: 'grain', limit: 1 })
      
      if (testResult.success) {
        return {
          ...baseHealth,
          details: {
            ...baseHealth.details,
            usdaData: 'available',
            lastTest: new Date().toISOString()
          }
        }
      } else {
        return MCPUtils.createHealthCheck('unhealthy', {
          ...baseHealth.details,
          usdaData: 'unavailable',
          error: testResult.error
        }, 'USDA data test failed')
      }
    } catch (error) {
      return MCPUtils.createHealthCheck('unhealthy', null, MCPUtils.formatError(error))
    }
  }

  // Public method for testing tool execution
  public async testTool(name: string, args: any): Promise<MCPToolResult> {
    return await this.executeTool(name, args)
  }
}

// Start server if run directly
if (require.main === module || process.argv[1]?.includes('usda/server')) {
  const server = new USDAMCPServer()
  
  server.start().catch((error) => {
    MCPUtils.logWithTimestamp('ERROR', 'Failed to start USDA MCP Server', error)
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down USDA MCP Server...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down USDA MCP Server...')
    await server.stop()
    process.exit(0)
  })
} 