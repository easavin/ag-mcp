// Shared types for MCP servers
export interface MCPToolResult {
  success: boolean
  message: string
  data?: any
  error?: string
  actionTaken?: string
}

export interface MCPServerConfig {
  name: string
  version: string
  port: number
  capabilities?: {
    tools?: Record<string, any>
    resources?: Record<string, any>
  }
}

export interface AuthenticationProvider {
  authenticate(): Promise<boolean>
  refreshToken(): Promise<boolean>
  isTokenValid(): Promise<boolean>
}

export interface ErrorHandler {
  handleError(error: Error, context?: string): MCPToolResult
  logError(error: Error, context?: string): void
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
  handler: (args: any) => Promise<MCPToolResult>
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  details?: any
  error?: string
}

export interface ServerMetrics {
  uptime: number
  requestCount: number
  errorCount: number
  averageResponseTime: number
  lastError?: string
} 