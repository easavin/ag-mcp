import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { BaseMCPServer } from '../base/mcp-server-base.js'
import { MCPServerConfig, MCPToolResult } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { WeatherTools } from './tools.js'

export class WeatherMCPServer extends BaseMCPServer {
  private weatherTools!: WeatherTools

  constructor() {
    const config: MCPServerConfig = {
      name: 'weather-mcp-server',
      version: '1.0.0',
      port: parseInt(process.env.WEATHER_MCP_PORT || '8002'),
      capabilities: {
        tools: {}
      }
    }

    super(config)
  }

  setupToolHandlers(): void {
    // Initialize weatherTools during setup
    this.weatherTools = new WeatherTools()

    // Register all weather tools
    const mcpTools = this.weatherTools.getMCPTools()
    
    mcpTools.forEach(tool => {
      this.registerTool(tool)
    })

    MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Registered ${mcpTools.length} weather tools`)
  }

  getAvailableTools(): Tool[] {
    return this.weatherTools.getToolDefinitions()
  }

  protected async executeTool(name: string, args: any): Promise<MCPToolResult> {
    const tool = this.tools.get(name)
    
    if (!tool) {
      return MCPUtils.createErrorResult(
        `Unknown tool: ${name}`,
        `Tool '${name}' is not available in weather server`
      )
    }

    try {
      return await tool.handler(args)
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', `Weather: Tool ${name} execution failed`, error)
      
      return MCPUtils.createErrorResult(
        `Tool execution failed: ${errorMessage}`,
        errorMessage
      )
    }
  }

  // Override health check to include weather-specific checks
  public async getHealthCheck() {
    try {
      const baseHealth = await super.getHealthCheck()
      
      // Test weather API connectivity
      const testResult = await this.weatherTools.searchLocations({ 
        query: 'New York', 
        limit: 1 
      })
      
      if (testResult.success) {
        return {
          ...baseHealth,
          details: {
            ...baseHealth.details,
            weatherAPI: 'connected',
            lastTest: new Date().toISOString()
          }
        }
      } else {
        return MCPUtils.createHealthCheck('unhealthy', {
          ...baseHealth.details,
          weatherAPI: 'disconnected',
          error: testResult.error
        }, 'Weather API connectivity test failed')
      }
    } catch (error) {
      return MCPUtils.createHealthCheck('unhealthy', null, MCPUtils.formatError(error))
    }
  }
}

// Start server if run directly
if (require.main === module || process.argv[1]?.includes('weather/server')) {
  const server = new WeatherMCPServer()
  
  server.start().catch((error) => {
    MCPUtils.logWithTimestamp('ERROR', 'Failed to start Weather MCP Server', error)
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down Weather MCP Server...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down Weather MCP Server...')
    await server.stop()
    process.exit(0)
  })
} 