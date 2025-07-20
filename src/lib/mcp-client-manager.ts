// MCP Client Manager - Orchestrates connections to multiple MCP servers
import { MCPUtils } from '../mcp-servers/base/utils.js'
import { HealthCheckResult, ServerMetrics } from '../mcp-servers/base/types.js'

// Mock client interface for each MCP server since we don't have actual transport yet
interface MockMCPClient {
  serverName: string
  connected: boolean
  lastPing: number
  tools: string[]
  callTool: (toolName: string, args: any) => Promise<any>
  listTools: () => Promise<string[]>
  disconnect: () => Promise<void>
}

export interface MCPServerConfig {
  name: string
  port: number
  enabled: boolean
  url?: string
}

export interface MCPClientManagerConfig {
  servers: MCPServerConfig[]
  reconnectAttempts: number
  reconnectDelay: number
  healthCheckInterval: number
}

export class MCPClientManager {
  private clients: Map<string, MockMCPClient> = new Map()
  private config: MCPClientManagerConfig
  private healthCheckTimer?: NodeJS.Timeout
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(config?: Partial<MCPClientManagerConfig>) {
    this.config = {
      servers: [
        { name: 'weather', port: 8002, enabled: true },
        { name: 'john-deere', port: 8001, enabled: true },
        { name: 'usda', port: 8003, enabled: true },
        { name: 'eu-commission', port: 8004, enabled: true },
        { name: 'auravant', port: 8005, enabled: true }
      ],
      reconnectAttempts: 3,
      reconnectDelay: 5000,
      healthCheckInterval: 30000,
      ...config
    }
  }

  /**
   * Initialize and connect to all enabled MCP servers
   */
  async initialize(): Promise<void> {
    MCPUtils.logWithTimestamp('INFO', 'MCP Client Manager: Initializing connections')

    const enabledServers = this.config.servers.filter(s => s.enabled)
    
    for (const serverConfig of enabledServers) {
      try {
        await this.connectToServer(serverConfig)
      } catch (error) {
        MCPUtils.logWithTimestamp('ERROR', `Failed to connect to ${serverConfig.name}`, error)
      }
    }

    // Start health check monitoring
    this.startHealthChecking()

    MCPUtils.logWithTimestamp('INFO', `MCP Client Manager: Initialized with ${this.clients.size} server(s)`)
  }

  /**
   * Connect to a specific MCP server
   */
  private async connectToServer(serverConfig: MCPServerConfig): Promise<void> {
    try {
      MCPUtils.logWithTimestamp('INFO', `Connecting to ${serverConfig.name} MCP server`)

      // For now, create a mock client. In production, this would use actual MCP transport
      const mockClient: MockMCPClient = {
        serverName: serverConfig.name,
        connected: true,
        lastPing: Date.now(),
        tools: this.getExpectedToolsForServer(serverConfig.name),
        callTool: this.createMockToolCaller(serverConfig.name),
        listTools: async () => this.getExpectedToolsForServer(serverConfig.name),
        disconnect: async () => {
          mockClient.connected = false
          MCPUtils.logWithTimestamp('INFO', `${serverConfig.name}: Disconnected`)
        }
      }

      this.clients.set(serverConfig.name, mockClient)
      
      MCPUtils.logWithTimestamp('INFO', `${serverConfig.name}: Connected successfully`)
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', `Failed to connect to ${serverConfig.name}`, error)
      throw error
    }
  }

  /**
   * Get expected tools for each server type
   */
  private getExpectedToolsForServer(serverName: string): string[] {
    const toolMap: Record<string, string[]> = {
      'weather': ['get_current_weather', 'get_weather_forecast', 'search_locations'],
      'john-deere': ['get_organizations', 'get_fields', 'get_equipment'],
      'usda': ['get_usda_market_prices', 'get_usda_production_data', 'get_usda_trade_data', 'get_usda_market_dashboard'],
      'eu-commission': ['get_eu_market_prices', 'get_eu_market_dashboard'],
      'auravant': ['get_auravant_fields', 'get_auravant_livestock']
    }
    
    return toolMap[serverName] || []
  }

  /**
   * Create a mock tool caller that simulates calling the actual MCP server
   */
  private createMockToolCaller(serverName: string) {
    return async (toolName: string, args: any): Promise<any> => {
      MCPUtils.logWithTimestamp('INFO', `${serverName}: Calling tool ${toolName}`, args)

      // In production, this would make actual JSON-RPC calls to the MCP server
      // For now, return mock responses to demonstrate the architecture
      
      const mockResponses: Record<string, any> = {
        'get_current_weather': {
          success: true,
          message: '🌤️ Current weather conditions retrieved',
          data: { temperature: 22, humidity: 65, location: 'Mock Location' },
          actionTaken: 'Retrieved current weather conditions'
        },
        'get_organizations': {
          success: true,
          message: '🏢 Retrieved 2 John Deere organization(s)',
          data: { organizations: [{ id: 'org-123', name: 'Test Farm' }], count: 1 },
          actionTaken: 'Found 1 organizations'
        },
        'get_usda_market_prices': {
          success: true,
          message: '📊 Retrieved 3 USDA market price(s)',
          data: { prices: [{ commodity: 'Corn', price: 4.85, unit: '$/bushel' }], count: 1 },
          actionTaken: 'Found 1 market prices'
        },
        'get_eu_market_prices': {
          success: true,
          message: '🇪🇺 Retrieved 3 EU market price(s)',
          data: { prices: [{ commodity: 'Wheat', price: 185.50, unit: '€/tonne' }], count: 1 },
          actionTaken: 'EU market prices retrieved successfully'
        },
        'get_auravant_fields': {
          success: true,
          message: '🐄 Retrieved 3 Auravant field(s)',
          data: { fields: [{ id: 'field-001', name: 'Paddock A', area: 45.2 }], count: 1 },
          actionTaken: 'Auravant fields retrieved successfully'
        }
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100))

      return mockResponses[toolName] || {
        success: false,
        message: `Tool ${toolName} not implemented in mock`,
        error: 'Tool not found in mock responses'
      }
    }
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(serverName: string, toolName: string, args: any = {}): Promise<any> {
    const client = this.clients.get(serverName)
    
    if (!client) {
      throw new Error(`No client connected for server: ${serverName}`)
    }

    if (!client.connected) {
      throw new Error(`Server ${serverName} is not connected`)
    }

    try {
      const result = await client.callTool(toolName, args)
      
      // Update last successful communication
      client.lastPing = Date.now()
      
      return result
    } catch (error) {
      MCPUtils.logWithTimestamp('ERROR', `Tool call failed on ${serverName}:${toolName}`, error)
      throw error
    }
  }

  /**
   * Get available tools from a server
   */
  async getAvailableTools(serverName: string): Promise<string[]> {
    const client = this.clients.get(serverName)
    
    if (!client) {
      throw new Error(`No client connected for server: ${serverName}`)
    }

    return await client.listTools()
  }

  /**
   * Get available tools from all connected servers
   */
  async getAllAvailableTools(): Promise<Record<string, string[]>> {
    const allTools: Record<string, string[]> = {}
    
    for (const [serverName, client] of this.clients) {
      if (client.connected) {
        try {
          allTools[serverName] = await client.listTools()
        } catch (error) {
          MCPUtils.logWithTimestamp('ERROR', `Failed to get tools from ${serverName}`, error)
          allTools[serverName] = []
        }
      }
    }
    
    return allTools
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverName: string): boolean {
    const client = this.clients.get(serverName)
    return client?.connected || false
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}
    
    for (const [serverName, client] of this.clients) {
      status[serverName] = client.connected
    }
    
    return status
  }

  /**
   * Disconnect from a specific server
   */
  async disconnect(serverName: string): Promise<void> {
    const client = this.clients.get(serverName)
    
    if (client) {
      await client.disconnect()
      this.clients.delete(serverName)
      
      // Clear any reconnect timers
      const timer = this.reconnectTimers.get(serverName)
      if (timer) {
        clearTimeout(timer)
        this.reconnectTimers.delete(serverName)
      }
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map(serverName => 
      this.disconnect(serverName)
    )
    
    await Promise.all(disconnectPromises)
    
    // Stop health checking
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    
    MCPUtils.logWithTimestamp('INFO', 'MCP Client Manager: All servers disconnected')
  }

  /**
   * Start periodic health checking of all servers
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health checks on all connected servers
   */
  private async performHealthChecks(): Promise<void> {
    const currentTime = Date.now()
    
    for (const [serverName, client] of this.clients) {
      if (client.connected) {
        const timeSinceLastPing = currentTime - client.lastPing
        
        // If we haven't heard from the server in too long, mark as disconnected
        if (timeSinceLastPing > this.config.healthCheckInterval * 2) {
          MCPUtils.logWithTimestamp('WARN', `${serverName}: Health check failed, marking as disconnected`)
          client.connected = false
          
          // Attempt to reconnect
          this.scheduleReconnect(serverName)
        }
      }
    }
  }

  /**
   * Schedule a reconnection attempt for a server
   */
  private scheduleReconnect(serverName: string): void {
    if (this.reconnectTimers.has(serverName)) {
      return // Already scheduled
    }

    const timer = setTimeout(async () => {
      try {
        const serverConfig = this.config.servers.find(s => s.name === serverName)
        if (serverConfig && serverConfig.enabled) {
          MCPUtils.logWithTimestamp('INFO', `${serverName}: Attempting to reconnect...`)
          await this.connectToServer(serverConfig)
        }
      } catch (error) {
        MCPUtils.logWithTimestamp('ERROR', `${serverName}: Reconnection failed`, error)
      } finally {
        this.reconnectTimers.delete(serverName)
      }
    }, this.config.reconnectDelay)

    this.reconnectTimers.set(serverName, timer)
  }

  /**
   * Get comprehensive health status of all servers
   */
  async getHealthStatus(): Promise<Record<string, HealthCheckResult>> {
    const healthStatus: Record<string, HealthCheckResult> = {}
    
    for (const [serverName, client] of this.clients) {
      healthStatus[serverName] = {
        status: client.connected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          connected: client.connected,
          lastPing: client.lastPing,
          timeSinceLastPing: Date.now() - client.lastPing,
          toolCount: client.tools.length
        }
      }
    }
    
    return healthStatus
  }

  /**
   * Get metrics for the MCP Client Manager
   */
  getMetrics(): {
    totalServers: number
    connectedServers: number
    totalTools: number
    serverStatus: Record<string, boolean>
  } {
    const connectedCount = Array.from(this.clients.values()).filter(c => c.connected).length
    const totalTools = Array.from(this.clients.values()).reduce((total, client) => total + client.tools.length, 0)
    
    return {
      totalServers: this.clients.size,
      connectedServers: connectedCount,
      totalTools,
      serverStatus: this.getConnectionStatus()
    }
  }
} 