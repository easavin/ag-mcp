import { NextRequest, NextResponse } from 'next/server'
import { mcpToolExecutor, ALL_MCP_TOOLS } from '@/lib/mcp-tools'

export async function GET() {
  try {
    // Return available MCP tools
    return NextResponse.json({
      success: true,
      tools: ALL_MCP_TOOLS,
      message: `Available MCP tools: ${ALL_MCP_TOOLS.length}`
    })
  } catch (error) {
    console.error('❌ Error fetching MCP tools:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch MCP tools',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { toolName, parameters } = body

    if (!toolName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tool name is required' 
        },
        { status: 400 }
      )
    }

    console.log(`🔧 MCP Tool Request: ${toolName}`, parameters)

    // Execute the MCP tool
    const result = await mcpToolExecutor.executeTool(toolName, parameters || {})

    console.log(`✅ MCP Tool Result:`, result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error executing MCP tool:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute MCP tool',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 