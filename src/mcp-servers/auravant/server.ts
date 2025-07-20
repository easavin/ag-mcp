import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { BaseMCPServer } from '../base/mcp-server-base.js'
import { MCPServerConfig, MCPToolResult } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'

export class AuravantMCPServer extends BaseMCPServer {

  constructor() {
    const config: MCPServerConfig = {
      name: 'auravant-mcp-server',
      version: '1.0.0',
      port: parseInt(process.env.AURAVANT_MCP_PORT || '8005'),
      capabilities: {
        tools: {}
      }
    }

    super(config)
  }

  setupToolHandlers(): void {
    // Register Auravant tools
    this.registerTool({
      name: 'get_auravant_fields',
      description: 'Get field data from Auravant',
      inputSchema: {
        type: 'object',
        properties: {
          farmId: { type: 'string', description: 'Farm identifier' }
        }
      },
      handler: this.getAuravantFields.bind(this)
    })

    this.registerTool({
      name: 'get_auravant_livestock',
      description: 'Get livestock data from Auravant',
      inputSchema: {
        type: 'object',
        properties: {
          farmId: { type: 'string', description: 'Farm identifier' }
        }
      },
      handler: this.getAuravantLivestock.bind(this)
    })

    MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Registered 2 Auravant tools`)
  }

  getAvailableTools(): Tool[] {
    return [
      {
        name: 'get_auravant_fields',
        description: 'Get field data from Auravant',
        inputSchema: {
          type: 'object',
          properties: {
            farmId: { type: 'string', description: 'Farm identifier' }
          }
        }
      },
      {
        name: 'get_auravant_livestock',
        description: 'Get livestock data from Auravant',
        inputSchema: {
          type: 'object',
          properties: {
            farmId: { type: 'string', description: 'Farm identifier' }
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

  private async getAuravantFields(args: any): Promise<MCPToolResult> {
    MCPUtils.logWithTimestamp('INFO', 'Auravant: Getting fields', args)
    
    const mockData = [
      { id: 'field-001', name: 'Paddock A', area: 45.2, unit: 'hectares', farmId: args.farmId || 'farm-123' },
      { id: 'field-002', name: 'Paddock B', area: 32.8, unit: 'hectares', farmId: args.farmId || 'farm-123' },
      { id: 'field-003', name: 'North Pasture', area: 78.5, unit: 'hectares', farmId: args.farmId || 'farm-123' }
    ]

    return MCPUtils.createSuccessResult(
      `🐄 Retrieved ${mockData.length} Auravant field(s)`,
      { fields: mockData, farmId: args.farmId, count: mockData.length },
      'Auravant fields retrieved successfully'
    )
  }

  private async getAuravantLivestock(args: any): Promise<MCPToolResult> {
    MCPUtils.logWithTimestamp('INFO', 'Auravant: Getting livestock', args)
    
    const mockData = [
      { id: 'herd-001', type: 'cattle', count: 125, breed: 'Angus', farmId: args.farmId || 'farm-123' },
      { id: 'herd-002', type: 'cattle', count: 87, breed: 'Hereford', farmId: args.farmId || 'farm-123' },
      { id: 'flock-001', type: 'sheep', count: 450, breed: 'Merino', farmId: args.farmId || 'farm-123' }
    ]

    return MCPUtils.createSuccessResult(
      `🐄 Retrieved ${mockData.length} Auravant livestock group(s)`,
      { livestock: mockData, farmId: args.farmId, count: mockData.length },
      'Auravant livestock retrieved successfully'
    )
  }

  public async testTool(name: string, args: any): Promise<MCPToolResult> {
    return await this.executeTool(name, args)
  }
}

// Start server if run directly
if (require.main === module || process.argv[1]?.includes('auravant/server')) {
  const server = new AuravantMCPServer()
  
  server.start().catch((error) => {
    MCPUtils.logWithTimestamp('ERROR', 'Failed to start Auravant MCP Server', error)
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down Auravant MCP Server...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    MCPUtils.logWithTimestamp('INFO', 'Shutting down Auravant MCP Server...')
    await server.stop()
    process.exit(0)
  })
} 