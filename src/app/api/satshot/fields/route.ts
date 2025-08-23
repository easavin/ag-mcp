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
    const region = searchParams.get('region')
    const cropType = searchParams.get('cropType')
    const minArea = searchParams.get('minArea') ? parseFloat(searchParams.get('minArea')!) : undefined
    const includeGeometry = searchParams.get('includeGeometry') !== 'false'

    const server = await getSatshotServer()

    const result = await server.testTool('get_satshot_fields', {
      region,
      cropType,
      minArea,
      includeGeometry
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
    console.error('Satshot fields API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fields data' },
      { status: 500 }
    )
  }
}
