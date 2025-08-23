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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const mapType = searchParams.get('mapType') || 'all'
    const mapId = searchParams.get('mapId')

    const server = await getSatshotServer()

    let result
    if (mapId) {
      // Load specific map
      result = await server.testTool('load_satshot_map', {
        mapId,
        includeLayers: searchParams.get('includeLayers') !== 'false'
      })
    } else {
      // Get available maps
      result = await server.testTool('get_satshot_maps', {
        limit,
        mapType
      })
    }

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
    console.error('Satshot maps API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maps data' },
      { status: 500 }
    )
  }
}
