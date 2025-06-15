import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLLMService } from '@/lib/llm'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check database connectivity
    let databaseStatus = 'healthy'
    let databaseLatency = 0
    
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      databaseLatency = Date.now() - dbStart
    } catch (error) {
      databaseStatus = 'unhealthy'
      console.error('Database health check failed:', error)
    }
    
    // Check LLM service availability
    let llmStatus = 'healthy'
    const llmService = getLLMService()
    const providers = llmService.getAvailableProviders()
    
    if (!providers.gemini && !providers.openai) {
      llmStatus = 'unhealthy'
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    const envStatus = missingEnvVars.length === 0 ? 'healthy' : 'unhealthy'
    
    // Overall health status
    const isHealthy = databaseStatus === 'healthy' && 
                     llmStatus === 'healthy' && 
                     envStatus === 'healthy'
    
    const responseTime = Date.now() - startTime
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: databaseStatus,
          latency: `${databaseLatency}ms`
        },
        llm: {
          status: llmStatus,
          providers: {
            gemini: providers.gemini,
            openai: providers.openai
          }
        },
        environment: {
          status: envStatus,
          missingVars: missingEnvVars
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        }
      }
    }
    
    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - startTime}ms`
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
} 