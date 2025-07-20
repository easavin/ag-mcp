import { MCPToolResult, HealthCheckResult, ServerMetrics } from './types.js'

export class MCPUtils {
  static createSuccessResult(
    message: string, 
    data?: any, 
    actionTaken?: string
  ): MCPToolResult {
    return {
      success: true,
      message,
      data,
      actionTaken
    }
  }

  static createErrorResult(
    message: string, 
    error?: string, 
    data?: any
  ): MCPToolResult {
    return {
      success: false,
      message,
      error: error || message,
      data
    }
  }

  static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'Unknown error occurred'
  }

  static createHealthCheck(
    status: 'healthy' | 'unhealthy',
    details?: any,
    error?: string
  ): HealthCheckResult {
    return {
      status,
      timestamp: new Date().toISOString(),
      details,
      error
    }
  }

  static validateRequiredFields(args: any, requiredFields: string[]): string[] {
    const missing: string[] = []
    
    for (const field of requiredFields) {
      if (args[field] === undefined || args[field] === null || args[field] === '') {
        missing.push(field)
      }
    }
    
    return missing
  }

  static sanitizeArgs(args: any): any {
    // Remove potential security risks from arguments
    if (typeof args !== 'object' || args === null) {
      return args
    }

    const sanitized = { ...args }
    
    // Remove any function properties
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'function') {
        delete sanitized[key]
      }
    }
    
    return sanitized
  }

  static logWithTimestamp(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: any): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${level}: ${message}`
    
    if (context) {
      console.log(logMessage, context)
    } else {
      console.log(logMessage)
    }
  }

  static measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now()
      
      try {
        const result = await fn()
        const duration = Date.now() - startTime
        resolve({ result, duration })
      } catch (error) {
        const duration = Date.now() - startTime
        reject({ error, duration })
      }
    })
  }

  static createServerMetrics(): ServerMetrics {
    return {
      uptime: process.uptime(),
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0
    }
  }
} 