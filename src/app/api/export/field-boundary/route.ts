import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getLLMService } from '@/lib/llm'

export async function POST(request: NextRequest) {
  console.log('📁 Field boundary export request')

  try {
    // Get authenticated user
    const authUser = await getCurrentUser(request)
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const { fieldName, platform, format = 'kml', includeMetadata = true } = await request.json()

    if (!fieldName || !platform) {
      return NextResponse.json(
        { error: 'fieldName and platform are required' },
        { status: 400 }
      )
    }

    console.log(`📁 Exporting ${format} for field: ${fieldName} from ${platform}`)

    // Get LLM service to execute the export tool
    const llmService = getLLMService()

    // Execute the appropriate export tool
    let toolName: string
    let parameters: any

    if (format === 'kml') {
      toolName = 'export_field_boundary_kml'
      parameters = {
        fieldName,
        platform,
        includeMetadata
      }
    } else if (format === 'shapefile') {
      toolName = 'export_field_boundary_shapefile'
      parameters = {
        fieldName,
        platform,
        includeMetadata
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use "kml" or "shapefile"' },
        { status: 400 }
      )
    }

    // Execute the tool using direct MCP tool executor
    const { mcpToolExecutor } = await import('@/lib/mcp-tools')
    const result = await mcpToolExecutor.executeTool(toolName, parameters)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          details: result.data
        },
        { status: 400 }
      )
    }

    // For KML format, return JSON with content for client-side download
    if (format === 'kml' && result.data?.kmlContent) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          ...result.data,
          // Keep kmlContent for client-side blob creation
        }
      })
    }

    // For other formats or if no direct content, return JSON response
    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data,
      downloadUrl: result.data?.downloadUrl
    })

  } catch (error) {
    console.error('❌ Export API error:', error)
    return NextResponse.json(
      {
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for download by URL (if needed)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fieldName = searchParams.get('field')
  const platform = searchParams.get('platform')
  const format = searchParams.get('format') || 'kml'

  if (!fieldName || !platform) {
    return NextResponse.json(
      { error: 'field and platform parameters are required' },
      { status: 400 }
    )
  }

  // Redirect to POST with query parameters as body
  const body = JSON.stringify({ fieldName, platform, format })

  // Create a new request with POST method and body
  const newRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body
  })

  return POST(newRequest)
}
