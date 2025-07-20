import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { BaseMCPServer } from '../base/mcp-server-base.js'
import { MCPServerConfig, MCPToolResult } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'

export class EUCommissionMCPServer extends BaseMCPServer {

  constructor() {
    const config: MCPServerConfig = {
      name: 'eu-commission-mcp-server',
      version: '1.0.0',
      port: parseInt(process.env.EU_COMMISSION_MCP_PORT || '8004'),
      capabilities: {
        tools: {}
      }
    }

    super(config)
  }

  setupToolHandlers(): void {
    // Register EU Commission tools
    this.registerTool({
      name: 'get_eu_market_prices',
      description: 'Get EU agricultural market prices',
      inputSchema: {
        type: 'object',
        properties: {
          sector: { type: 'string', description: 'Agricultural sector (e.g., cereals, livestock)' },
          memberState: { type: 'string', description: 'EU member state code (e.g., DE, FR, IT)' }
        }
      },
      handler: this.getEUMarketPrices.bind(this)
    })

    this.registerTool({
      name: 'get_eu_market_dashboard',
      description: 'Get EU agricultural market dashboard',
      inputSchema: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'EU region' }
        }
      },
      handler: this.getEUMarketDashboard.bind(this)
    })

    MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Registered 2 EU Commission tools`)
  }

  getAvailableTools(): Tool[] {
    return [
      {
        name: 'get_eu_market_prices',
        description: 'Get EU agricultural market prices',
        inputSchema: {
          type: 'object',
          properties: {
            sector: { type: 'string', description: 'Agricultural sector (e.g., cereals, livestock)' },
            memberState: { type: 'string', description: 'EU member state code (e.g., DE, FR, IT)' }
          }
        }
      },
      {
        name: 'get_eu_market_dashboard',
        description: 'Get EU agricultural market dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            region: { type: 'string', description: 'EU region' }
          }
        }
      }
    ]
  }

  protected async executeTool(name: string, args: any): Promise<MCPToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return MCPUtils.createErrorResult(`Unknown tool: ${name}`)
    }
    return await tool.handler(args)
  }

  private async getEUMarketPrices(args: any): Promise<MCPToolResult> {
    MCPUtils.logWithTimestamp('INFO', 'EU Commission: Getting market prices', args)
    
    const mockData = [
      { commodity: 'Wheat', price: 185.50, unit: '€/tonne', memberState: args.memberState || 'DE' },
      { commodity: 'Corn', price: 195.75, unit: '€/tonne', memberState: args.memberState || 'DE' },
      { commodity: 'Barley', price: 160.25, unit: '€/tonne', memberState: args.memberState || 'DE' }
    ]

    return MCPUtils.createSuccessResult(
      `🇪🇺 Retrieved ${mockData.length} EU market price(s)`,
      { prices: mockData, count: mockData.length },
      'EU market prices retrieved successfully'
    )
  }

  private async getEUMarketDashboard(args: any): Promise<MCPToolResult> {
    MCPUtils.logWithTimestamp('INFO', 'EU Commission: Getting market dashboard', args)
    
    const dashboard = {
      region: args.region || 'European Union',
      lastUpdated: new Date().toISOString(),
      summary: {
        avgWheatPrice: '185.50 €/tonne',
        totalProduction: '135 million tonnes',
        majorProducers: ['France', 'Germany', 'Poland']
      }
    }

    return MCPUtils.createSuccessResult(
      `📊 EU market dashboard for ${dashboard.region}`,
      dashboard,
      'EU dashboard generated successfully'
    )
  }

  public async testTool(name: string, args: any): Promise<MCPToolResult> {
    return await this.executeTool(name, args)
  }
}

// Start server if run directly
if (require.main === module || process.argv[1]?.includes('eu-commission/server')) {
  const server = new EUCommissionMCPServer()
  
  server.start().catch((error) => {
    MCPUtils.logWithTimestamp('ERROR', 'Failed to start EU Commission MCP Server', error)
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down EU Commission MCP Server...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down EU Commission MCP Server...')
    await server.stop()
    process.exit(0)
  })
} 