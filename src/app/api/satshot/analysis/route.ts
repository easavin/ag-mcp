import { NextRequest, NextResponse } from 'next/server'
import { SatshotMCPServer } from '@/mcp-servers/satshot/server'

// Shared server instance
let satshotServer: SatshotMCPServer | null = null

async function getSatshotServer(): Promise<SatshotMCPServer> {
  if (!satshotServer) {
    satshotServer = new SatshotMCPServer()
    await satshotServer.setupToolHandlers()
  }
  return satshotServer
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fieldId, analysisType = 'ndvi', dateRange, resolution = 10 } = body

    if (!fieldId) {
      return NextResponse.json(
        { error: 'fieldId is required' },
        { status: 400 }
      )
    }

    const server = await getSatshotServer()

    const result = await server.testTool('analyze_field_imagery', {
      fieldId,
      analysisType,
      dateRange,
      resolution
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: result.message,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || result.error,
        timestamp: new Date().toISOString()
      }, { status: result.message?.includes('authentication') ? 401 : 500 })
    }

  } catch (error) {
    console.error('Satshot analysis API error:', error)
    return NextResponse.json(
      { error: 'Failed to perform field analysis' },
      { status: 500 }
    )
  }
}
