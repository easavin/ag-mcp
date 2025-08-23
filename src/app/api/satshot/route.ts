import { NextRequest, NextResponse } from 'next/server'
import { SatshotMCPServer } from '@/mcp-servers/satshot/server'

// Global Satshot MCP server instance
let satshotServer: SatshotMCPServer | null = null

async function getSatshotServer(): Promise<SatshotMCPServer> {
  if (!satshotServer) {
    satshotServer = new SatshotMCPServer()
    // Start the server (this initializes tools but doesn't start network listener)
    await satshotServer.setupToolHandlers()
  }
  return satshotServer
}

export async function GET(request: NextRequest) {
  try {
    const server = await getSatshotServer()
    
    const status = server.getAuthStatus()
    const serverInfo = server.getServerInfo()
    const health = await server.getHealthCheck()
    
    return NextResponse.json({
      success: true,
      data: {
        status,
        serverInfo,
        health,
        availableTools: server.getAvailableTools().map(tool => ({
          name: tool.name,
          description: tool.description
        }))
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Satshot API error:', error)
    return NextResponse.json(
      { error: 'Failed to get Satshot status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tool, args } = await request.json()

    if (!tool) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      )
    }

    const server = await getSatshotServer()
    
    console.log(`🔧 Executing Satshot tool: ${tool}`, args)
    const result = await server.testTool(tool, args || {})
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Satshot tool execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute Satshot tool' },
      { status: 500 }
    )
  }
}
