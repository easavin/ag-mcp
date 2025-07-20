import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  Tool, 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  CallToolResult
} from '@modelcontextprotocol/sdk/types.js'

import { 
  MCPServerConfig, 
  MCPToolResult, 
  HealthCheckResult, 
  ServerMetrics,
  MCPTool
} from './types.js'
import { MCPUtils } from './utils.js'

export abstract class BaseMCPServer {
  protected server: Server
  protected config: MCPServerConfig
  protected tools: Map<string, MCPTool> = new Map()
  protected metrics: ServerMetrics
  private startTime: number

  constructor(config: MCPServerConfig) {
    this.config = config
    this.startTime = Date.now()
    this.metrics = MCPUtils.createServerMetrics()
    
    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          ...this.config.capabilities
        },
      }
    )

    this.setupCommonHandlers()
    this.setupToolHandlers()
  }

  // Abstract methods that must be implemented by subclasses
  abstract setupToolHandlers(): void
  abstract getAvailableTools(): Tool[]
  protected abstract executeTool(name: string, args: any): Promise<MCPToolResult>

  private setupCommonHandlers(): void {
    // Handle tools/list requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Listing available tools`)
        const tools = this.getAvailableTools()
        return { tools }
      } catch (error) {
        MCPUtils.logWithTimestamp('ERROR', `${this.config.name}: Error listing tools`, error)
        throw error
      }
    })

    // Handle tools/call requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      return await this.handleToolCall(name, args || {})
    })
  }

  protected async handleToolCall(name: string, args: any): Promise<CallToolResult> {
    const startTime = Date.now()
    this.metrics.requestCount++

    try {
      MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Executing tool ${name}`, args)
      
      // Sanitize and validate arguments
      const sanitizedArgs = MCPUtils.sanitizeArgs(args)
      
      // Execute the tool
      const result = await this.executeTool(name, sanitizedArgs)
      
      // Update metrics
      const duration = Date.now() - startTime
      this.updateMetrics(duration, false)
      
      MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Tool ${name} completed in ${duration}ms`)
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.updateMetrics(duration, true)
      
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', `${this.config.name}: Tool ${name} failed`, error)
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              MCPUtils.createErrorResult(
                `Tool execution failed: ${errorMessage}`,
                errorMessage
              ),
              null,
              2
            ),
          },
        ],
        isError: true,
      }
    }
  }

  protected registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool)
    MCPUtils.logWithTimestamp('INFO', `${this.config.name}: Registered tool ${tool.name}`)
  }

  protected updateMetrics(duration: number, isError: boolean): void {
    if (isError) {
      this.metrics.errorCount++
    }
    
    // Update average response time (simple moving average)
    const totalRequests = this.metrics.requestCount
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalRequests - 1) + duration) / totalRequests
  }

  public async getHealthCheck(): Promise<HealthCheckResult> {
    try {
      // Basic health check - can be overridden by subclasses
      const uptime = Date.now() - this.startTime
      
      return MCPUtils.createHealthCheck('healthy', {
        uptime: uptime,
        metrics: this.metrics,
        toolCount: this.tools.size
      })
    } catch (error) {
      return MCPUtils.createHealthCheck('unhealthy', null, MCPUtils.formatError(error))
    }
  }

  public getMetrics(): ServerMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime
    }
  }

  public async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport()
      await this.server.connect(transport)
      MCPUtils.logWithTimestamp('INFO', `🚀 ${this.config.name} started successfully`)
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', `Failed to start ${this.config.name}`, error)
      throw error
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.server.close()
      MCPUtils.logWithTimestamp('INFO', `🛑 ${this.config.name} stopped`)
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', `Error stopping ${this.config.name}`, error)
      throw error
    }
  }
} 