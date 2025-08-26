import { NextRequest, NextResponse } from 'next/server'
import { getLLMService, AGRICULTURAL_SYSTEM_PROMPT, getRelevantFunctions, ChatMessage, InternalChatMessage, FunctionCall } from '@/lib/llm'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { mcpToolExecutor, getRelevantMCPTools } from '@/lib/mcp-tools'
import { JohnDeereConnectionError, JohnDeereRCAError, JohnDeerePermissionError } from '@/lib/johndeere-api'
import { parseVisualizationsFromResponse } from '@/lib/visualization-parser'
import { sanitizeResponseContent } from '@/lib/response-sanitizer'

// Debug mode for development only
const DEBUG_MODE = process.env.NODE_ENV === 'development'

function calculateFieldArea(boundaryData: any): string | null {
  try {
    // Try to extract area from boundary data if available
    if (boundaryData?.area) {
      return `${boundaryData.area} ha`
    }

    // If no area data, return null
    return null
  } catch (error) {
    console.error('Error calculating field area:', error)
    return null
  }
}

/**
 * Limit chat history to reduce token usage
 * Keeps system message + last N user/assistant pairs
 */
function limitChatHistory(messages: any[], maxExchanges = 10): any[] {
  if (!messages || messages.length <= maxExchanges) {
    return messages
  }

  // Always keep the system message (usually first message)
  const systemMessage = messages[0]?.role === 'system' ? messages[0] : null
  const remainingMessages = systemMessage ? messages.slice(1) : messages

  // Keep the last N exchanges (user + assistant pairs)
  const limitedMessages = remainingMessages.slice(-maxExchanges)

  return systemMessage ? [systemMessage, ...limitedMessages] : limitedMessages
}

export function extractCoordinatesFromBoundary(boundaryData: any): { lat: number, lng: number } | null {
  try {
    if (DEBUG_MODE) {
      console.log('🔍 Extracting coordinates from boundary data...')
      console.log('📊 Full boundary structure:', JSON.stringify(boundaryData, null, 2).substring(0, 1000))
    }

    let coordinates = null

    // NEW: Handle the actual John Deere API response structure from logs
    if (boundaryData?.data?.boundary?.values?.[0]) {
      const boundaryValue = boundaryData.data.boundary.values[0]
      console.log('🔍 Boundary value structure:', JSON.stringify(boundaryValue, null, 2).substring(0, 500))

      // Look for multipolygons in the boundary value
      if (boundaryValue.multipolygons?.[0]?.rings?.[0]?.points) {
        const points = boundaryValue.multipolygons[0].rings[0].points
        const lats = points.map((p: any) => p.lat).filter((lat: any) => lat !== undefined)
        const lons = points.map((p: any) => p.lon).filter((lon: any) => lon !== undefined)

        if (lats.length > 0 && lons.length > 0) {
          coordinates = {
            lat: lats.reduce((sum: number, lat: number) => sum + lat, 0) / lats.length,
            lng: lons.reduce((sum: number, lon: number) => sum + lon, 0) / lons.length
          }
        }
      }
    }

    // Keep existing extraction logic as fallbacks for other structures
    if (!coordinates && boundaryData?.lat && boundaryData?.lon) {
      coordinates = { lat: boundaryData.lat, lng: boundaryData.lon }
    } else if (!coordinates && boundaryData?.latitude && boundaryData?.longitude) {
      coordinates = { lat: boundaryData.latitude, lng: boundaryData.longitude }
    }

    // Look in geometry or features
    if (!coordinates && boundaryData?.geometry?.coordinates) {
      const coords = boundaryData.geometry.coordinates
      if (Array.isArray(coords) && coords.length > 0) {
        if (Array.isArray(coords[0]) && coords[0].length >= 2) {
          coordinates = { lat: coords[0][1], lng: coords[0][0] }
        } else if (coords.length >= 2) {
          coordinates = { lat: coords[1], lng: coords[0] }
        }
      }
    }

    // Look in features array
    if (!coordinates && boundaryData?.features && Array.isArray(boundaryData.features)) {
      for (const feature of boundaryData.features) {
        if (feature?.geometry?.coordinates) {
          const coords = feature.geometry.coordinates
          if (Array.isArray(coords) && coords.length > 0) {
            if (Array.isArray(coords[0]) && coords[0].length >= 2) {
              coordinates = { lat: coords[0][1], lng: coords[0][0] }
              break
            } else if (coords.length >= 2) {
              coordinates = { lat: coords[1], lng: coords[0] }
              break
            }
          }
        }
      }
    }

    // Look for center or centroid properties
    if (!coordinates && boundaryData?.center) {
      const center = boundaryData.center
      if (Array.isArray(center) && center.length >= 2) {
        coordinates = { lat: center[1], lng: center[0] }
      } else if (center?.lat && center?.lon) {
        coordinates = { lat: center.lat, lng: center.lon }
      }
    }

    // Fallback: Look for multipolygons structure (John Deere specific)
    if (!coordinates && boundaryData?.values?.[0]?.multipolygons?.[0]?.rings?.[0]?.points) {
      const points = boundaryData.values[0].multipolygons[0].rings[0].points
      const lats = points.map((p: any) => p.lat).filter((lat: any) => lat !== undefined)
      const lons = points.map((p: any) => p.lon).filter((lon: any) => lon !== undefined)

      if (lats.length > 0 && lons.length > 0) {
        coordinates = {
          lat: lats.reduce((sum: number, lat: number) => sum + lat, 0) / lats.length,
          lng: lons.reduce((sum: number, lon: number) => sum + lon, 0) / lons.length
        }
      }
    }

    if (coordinates) {
      console.log(`✅ Extracted coordinates: ${coordinates.lat}, ${coordinates.lng}`)
      return coordinates
    } else {
      console.warn('⚠️ Could not find coordinates in boundary data structure')
          // Log the actual structure we received for debugging
    if (DEBUG_MODE) {
      console.log('📊 Received boundary data keys:', Object.keys(boundaryData || {}))
      if (boundaryData?.data) {
        console.log('📊 Data keys:', Object.keys(boundaryData.data))
      }
      if (boundaryData?.data?.boundary) {
        console.log('📊 Boundary keys:', Object.keys(boundaryData.data.boundary))
      }
    }
      return null
    }
  } catch (error) {
    console.error('❌ Error extracting coordinates:', error)
    return null
  }
}

function generateWeatherForecastResponse(functionResults: any[], originalQuery: string): string {
  const fieldResult = functionResults.find(result => result.name === 'get_field_boundary')
  const weatherResult = functionResults.find(result => result.name === 'getWeatherForecast')

  if (!fieldResult?.result?.data || !weatherResult?.result?.data) {
    return "I have retrieved your field and weather data, but encountered an issue formatting the response. Please try again."
  }

  const fieldData = fieldResult.result.data
  const weatherData = weatherResult.result.data

  const fieldName = fieldData.fieldName || 'your field'
  const coordinates = fieldData.coordinates

  // Get the actual number of days from forecast data
  const forecast = weatherData.forecast?.daily || []
  const actualDays = Math.min(forecast.length, 10) // Cap at 10 for reasonable display

  // Generate comprehensive weather response
  return `# Weather Forecast for ${fieldName}

## Field Location
- **Field**: ${fieldName}
- **Coordinates**: ${coordinates?.lat?.toFixed(3)}, ${coordinates?.lng?.toFixed(3)}

## Current Weather
${weatherData.current ? `- **Temperature**: ${weatherData.current.temperature}°C
- **Conditions**: ${weatherData.current.weatherCondition}
- **Humidity**: ${weatherData.current.humidity}%
- **Wind**: ${weatherData.current.windSpeed} km/h` : 'Current weather data not available'}

## ${actualDays}-Day Forecast
${weatherData.forecast?.daily ? weatherData.forecast.daily.slice(0, actualDays).map((day: any, index: number) =>
`**Day ${index + 1}**: ${day.maxTemp || 'N/A'}°C / ${day.minTemp || 'N/A'}°C - ${day.weatherCondition || 'Clear'}`
).join('\n') : 'Forecast data not available'}

## Agricultural Recommendations
${weatherData.agriculture ? `- **Soil Temperature**: ${weatherData.agriculture.soilTemperature?.surface}°C
- **Spraying Conditions**: ${weatherData.agriculture.sprayConditions?.suitable ? 'Suitable' : 'Not suitable'}
- **UV Index**: ${weatherData.agriculture.uvIndex}` : 'Agricultural data not available'}

*Weather forecast generated automatically using field coordinates*`
}

// Function to execute John Deere API calls
async function executeJohnDeereFunction(functionCall: FunctionCall, request: NextRequest): Promise<any> {
  const { name, arguments: args } = functionCall
  
  console.log(`🔧 Executing John Deere function: ${name}`, args)
  
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    let url: string
    
    // Helper function to make authenticated internal API calls
    const makeAuthenticatedCall = async (apiUrl: string, method: string = 'GET', body?: string) => {
      return await fetch(apiUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          // Forward the original request cookies for authentication
          'Cookie': request.headers.get('cookie') || '',
        },
        body: body,
      })
    }
    
    switch (name) {
      case 'getOrganizations':
        url = `${baseUrl}/api/johndeere/organizations`
        break
      case 'getFields':
        if (!args.orgId) {
          // Auto-fetch organization first
          console.log('🔄 No orgId provided, fetching organizations first...')
          const orgResponse = await makeAuthenticatedCall(`${baseUrl}/api/johndeere/organizations`)
          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            if (orgData.organizations && orgData.organizations.length > 0) {
              args.orgId = orgData.organizations[0].id
              console.log(`🏢 Using organization: ${orgData.organizations[0].name} (${args.orgId})`)
            }
          }
        }
        url = `${baseUrl}/api/johndeere/organizations/${args.orgId}/fields`
        break
      case 'getEquipment':
        if (!args.orgId) {
          // Auto-fetch organization first
          console.log('🔄 No orgId provided, fetching organizations first...')
          const orgResponse = await makeAuthenticatedCall(`${baseUrl}/api/johndeere/organizations`)
          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            if (orgData.organizations && orgData.organizations.length > 0) {
              args.orgId = orgData.organizations[0].id
              console.log(`🏢 Using organization: ${orgData.organizations[0].name} (${args.orgId})`)
            }
          }
        }
        url = `${baseUrl}/api/johndeere/organizations/${args.orgId}/equipment`
        break
      case 'getOperations':
        if (!args.orgId) {
          // Auto-fetch organization first
          console.log('🔄 No orgId provided, fetching organizations first...')
          const orgResponse = await makeAuthenticatedCall(`${baseUrl}/api/johndeere/organizations`)
          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            if (orgData.organizations && orgData.organizations.length > 0) {
              args.orgId = orgData.organizations[0].id
              console.log(`🏢 Using organization: ${orgData.organizations[0].name} (${args.orgId})`)
            }
          }
        }
        url = `${baseUrl}/api/johndeere/organizations/${args.orgId}/operations`
        break
      case 'getComprehensiveData':
        url = `${baseUrl}/api/johndeere/organizations/${args.orgId}/comprehensive`
        break
      case 'get_field_boundary':
        // First get the field by name to get the fieldId
        if (!args.organizationId) {
          console.log('🔄 No organizationId provided for get_field_boundary, fetching organizations first...')
          const orgResponse = await makeAuthenticatedCall(`${baseUrl}/api/johndeere/organizations`)
          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            if (orgData.organizations && orgData.organizations.length > 0) {
              args.organizationId = orgData.organizations[0].id
              console.log(`🏢 Using organization: ${orgData.organizations[0].name} (${args.organizationId})`)
            }
          }
        }

        if (!args.fieldName) {
          throw new Error('fieldName is required for get_field_boundary')
        }

        // Get fields to find the fieldId by name
        console.log(`🔍 Finding field "${args.fieldName}" in organization ${args.organizationId}`)
        const fieldsResponse = await makeAuthenticatedCall(`${baseUrl}/api/johndeere/organizations/${args.organizationId}/fields`)

        if (fieldsResponse.ok) {
          const fieldsData = await fieldsResponse.json()
          const field = fieldsData.fields?.find((f: any) => f.name.toLowerCase() === args.fieldName.toLowerCase())

          if (field) {
            console.log(`✅ Found field: ${field.name} (${field.id})`)
            // Use POST method for boundary endpoint and include fieldName in body
            const boundaryUrl = `${baseUrl}/api/johndeere/organizations/${args.organizationId}/fields/${field.id}/boundary`
            console.log(`📡 Making boundary API call to: ${boundaryUrl}`)

            const response = await makeAuthenticatedCall(
              boundaryUrl,
              'POST',
              JSON.stringify({ fieldName: args.fieldName, organizationId: args.organizationId })
            )

            console.log(`📡 Boundary API response status: ${response.status}`)

            if (!response.ok) {
              const errorText = await response.text()
              console.error(`❌ Boundary API call failed: ${response.status} - ${errorText}`)
              throw new Error(`Boundary API call failed: ${response.status} - ${errorText}`)
            }

            const boundaryData = await response.json()
            console.log(`✅ Boundary data retrieved successfully`)
            return boundaryData
          } else {
            throw new Error(`Field "${args.fieldName}" not found in organization ${args.organizationId}`)
          }
        } else {
          throw new Error(`Failed to get fields for organization ${args.organizationId}`)
        }
        break
      default:
        throw new Error(`Unknown John Deere function: ${name}`)
    }

    console.log(`📡 Making API call to: ${url}`)
    
    const response = await makeAuthenticatedCall(url)

    console.log(`📡 API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API call failed: ${response.status} - ${errorText}`)
      
      // Parse error response to check for specific error types
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        // Error text is not JSON, use as-is
      }
      
      // Handle specific error types with user-friendly messages
      if (response.status === 403) {
        if (errorData.error?.includes('connection') || errorData.error?.includes('Connection')) {
          return {
            error: 'connection_required',
            message: 'Your John Deere account needs to be connected to access this data. Please reconnect your account.',
            userMessage: 'I need to reconnect to your John Deere account to access your data. Please go to the John Deere connection page to reestablish the connection.',
            functionName: name,
            arguments: args
          }
        }
        
        if (errorData.error?.includes('RCA') || errorData.error?.includes('Required Customer Action')) {
          return {
            error: 'rca_required',
            message: 'Required Customer Action needed in John Deere Operations Center.',
            userMessage: 'You need to complete a Required Customer Action in your John Deere Operations Center before I can access your data. Please log into your John Deere account and complete any pending actions.',
            functionName: name,
            arguments: args
          }
        }
        
        if (errorData.error?.includes('permission') || errorData.error?.includes('scope')) {
          return {
            error: 'insufficient_permissions',
            message: 'Insufficient permissions to access this John Deere data.',
            userMessage: 'I don\'t have sufficient permissions to access this data in your John Deere account. You may need to reconnect with additional permissions.',
            functionName: name,
            arguments: args
          }
        }
        
        // Generic 403 error
        return {
          error: 'access_denied',
          message: 'Access denied to John Deere data.',
          userMessage: 'I\'m unable to access your John Deere data right now. This might be due to a connection issue or permissions problem. Please try reconnecting your John Deere account.',
          functionName: name,
          arguments: args
        }
      }
      
      throw new Error(`API call failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ John Deere function ${name} completed successfully`, { dataKeys: Object.keys(data) })
    
    return data
  } catch (error) {
    console.error(`❌ Error executing John Deere function ${name}:`, error)
    
    // Handle connection errors with user-friendly messages
    if (error instanceof JohnDeereConnectionError) {
      return {
        error: 'connection_required',
        message: error.message,
        userMessage: 'I need to connect to your John Deere account to access your data. Please go to the John Deere connection page to establish the connection.',
        connectionUrl: error.connectionUrl,
        functionName: name,
        arguments: args
      }
    }
    
    if (error instanceof JohnDeereRCAError) {
      return {
        error: 'rca_required',
        message: error.message,
        userMessage: 'You need to complete a Required Customer Action in your John Deere Operations Center before I can access your data. Please log into your John Deere account and complete any pending actions.',
        rcaUrl: error.rcaUrl,
        functionName: name,
        arguments: args
      }
    }
    
    if (error instanceof JohnDeerePermissionError) {
      return {
        error: 'insufficient_permissions',
        message: error.message,
        userMessage: 'I don\'t have sufficient permissions to access this data in your John Deere account. You may need to reconnect with additional permissions.',
        functionName: name,
        arguments: args
      }
    }
    
    return { 
      error: `Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      functionName: name,
      arguments: args
    }
  }
}

// Unified function executor that handles both John Deere functions and MCP tools
async function executeFunction(functionCall: FunctionCall, request: NextRequest): Promise<any> {
  const { name, arguments: args } = functionCall

  console.log(`🔧 Executing function: ${name}`, args)

  // Handle get_field_boundary through John Deere API instead of MCP
  if (name === 'get_field_boundary') {
    console.log('🌾 Executing get_field_boundary through John Deere API')
    return executeJohnDeereFunction(functionCall, request)
  }

  // Check if it's an MCP tool - for execution we need to check all possible tools
  // since the data source selection might not match the tool being called
  const allPossibleTools = getRelevantMCPTools(['weather', 'johndeere', 'eu-commission', 'usda', 'satshot', 'auravant'])
  const mcpTool = allPossibleTools.find(tool => tool.name === name)
  if (mcpTool) {
    console.log(`🛠️ Executing MCP tool: ${name}`)
    try {
      const result = await mcpToolExecutor.executeTool(name, args)
      console.log(`✅ MCP tool ${name} completed:`, result)
      return result
    } catch (error) {
      console.error(`❌ Error executing MCP tool ${name}:`, error)
      return {
        success: false,
        error: `Failed to execute MCP tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        functionName: name,
        arguments: args
      }
    }
  }
  
  // Otherwise, it's a John Deere function
  return executeJohnDeereFunction(functionCall, request)
}

/**
 * Generate a fallback response when LLM fails
 */
function generateFallbackResponse(functionResults: any[], originalQuery: string): string {
  console.log('🔄 Generating fallback response for failed LLM call')

  // Check what function results we have
  const hasFields = functionResults.some(result => result.name === 'getFields' && result.result?.fields)
  const hasBoundaryError = functionResults.some(result => result.name === 'get_field_boundary' && result.result?.error)
  const hasBoundarySuccess = functionResults.some(result => result.name === 'get_field_boundary' && result.result && !result.result.error)
  const hasWeather = functionResults.some(result => result.name === 'getWeatherForecast' && result.result?.success)

  if (hasFields && originalQuery.toLowerCase().includes('boundary') && hasBoundarySuccess) {
    // User asked for boundary data and it was retrieved successfully
    const fieldName = originalQuery.match(/field\s+([^.]+)/i)?.[1] || 'requested'
    return `Great! I successfully retrieved the boundary data for your field "${fieldName}".

## What I Accomplished:
✅ **Field Found**: Located your field "${fieldName}" in the farm
✅ **Boundary Retrieved**: Successfully got the field boundary data from John Deere
✅ **Data Available**: The boundary information is now available for analysis

The boundary data includes coordinates, area information, and other field details that can be used for precision farming operations.

**Note**: The AI service is currently experiencing high load, so I can't provide the detailed analysis right now. Please try again in a few moments when the service is available, and I'll provide a comprehensive breakdown of your field boundary data including area, shape, and farming recommendations.`
  }

  if (hasFields && originalQuery.toLowerCase().includes('boundary') && hasBoundaryError) {
    // User asked for boundary data but it failed
    return `I found your fields but encountered an issue retrieving the boundary data. This is typically due to authentication or permission settings.

## What I Found:
- Successfully retrieved your field list
- Found the field "${originalQuery.match(/field\s+([^.]+)/i)?.[1] || 'requested'}"

## Next Steps:
1. **Check your John Deere connection** - Make sure your account is properly connected
2. **Verify permissions** - Ensure you have access to field boundary data
3. **Contact support** - If the issue persists, reach out to your farm management administrator

Would you like me to try again or help you check your connection settings?`
  }

  if (hasWeather) {
    return `I have weather data available for your location. The LLM service is currently experiencing issues, but I can provide you with the weather information that was retrieved.

Please try your query again in a few moments when the service is back online.`
  }

  return `The AI service is currently experiencing high load. I successfully retrieved your field information, but I'm having trouble generating the final response.

## What I Found:
- Successfully connected to your John Deere account
- Retrieved your field data

Please try your query again in a few moments. The system should be able to provide a complete response then.`
}

// Helper function to generate boundary response when LLM fails to provide content
function generateBoundaryResponse(fieldData: any, originalQuery: string): string {
  console.log('🔧 Generating boundary response for field data:', fieldData)

  // Extract field information
  const field = fieldData.field || fieldData
  const boundary = fieldData.boundary || field.boundary || {}

  const fieldName = field.name || 'Unknown Field'
  const area = field.area ? `${field.area.value || field.area.measurement || 'Unknown'} ${field.area.unit || 'units'}` : 'Unknown area'

  let response = `# Field Boundary Information for "${fieldName}"\n\n`

  // Basic field information
  response += `## Field Details\n`
  response += `- **Field Name**: ${fieldName}\n`
  response += `- **Area**: ${area}\n`

  // Boundary information if available
  if (boundary && Object.keys(boundary).length > 0) {
    response += `- **Boundary Data Available**: ✅\n`

    // Try to extract coordinates if available
    if (boundary.coordinates || boundary.multipolygons || boundary.points) {
      response += `- **Geographic Coordinates**: Available\n`
      response += `- **Field Shape**: Defined by boundary coordinates\n`
    } else {
      response += `- **Boundary Type**: Basic boundary information\n`
    }

    // Add practical information
    response += `\n## Practical Information\n`
    response += `- **Field Mapping**: Boundary coordinates can be used for precision farming\n`
    response += `- **Area Calculation**: ${area} total field area\n`
    response += `- **Operations Planning**: Use boundary data for accurate field operations\n`
    response += `- **Equipment Navigation**: Boundary data supports auto-steer systems\n`

  } else {
    response += `- **Boundary Data**: Not available in current response\n`
    response += `- **Note**: Boundary coordinates may require additional permissions\n`
  }

  // Add recommendations
  response += `\n## Recommendations\n`
  response += `1. **Precision Operations**: Use boundary data for accurate planting and harvesting\n`
  response += `2. **Equipment Efficiency**: Boundary mapping improves equipment utilization\n`
  response += `3. **Yield Analysis**: Field boundaries enable accurate yield mapping\n`
  response += `4. **Resource Management**: Precise boundaries help optimize inputs\n`

  // Add next steps
  response += `\n## Next Steps\n`
  if (!boundary || Object.keys(boundary).length === 0) {
    response += `- Check your John Deere permissions for field boundary access\n`
    response += `- Ensure your organization has proper field data sharing enabled\n`
    response += `- Contact your farm management administrator if needed\n`
  } else {
    response += `- Use this boundary data in your farming operations\n`
    response += `- Export coordinates for use with precision equipment\n`
    response += `- Set up automated field operations based on boundaries\n`
  }

  return response
}

export async function POST(request: NextRequest) {
  console.log('🚀 Starting chat completion request')
  
  try {
    const { sessionId, messages, options, selectedDataSources } = await request.json()
    console.log('📝 Request data:', { sessionId, messageCount: messages?.length, options, selectedDataSources })

    if (!sessionId || !messages || !Array.isArray(messages)) {
      console.error('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, messages' },
        { status: 400 }
      )
    }

    // Get current authenticated user
    const authUser = await getCurrentUser(request)
    
    if (!authUser) {
      console.error('❌ Authentication required')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const userId = authUser.id

    // Verify session belongs to user
    console.log('🔍 Verifying session:', sessionId)
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
    })

    if (!session) {
      console.error('❌ Chat session not found:', sessionId)
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      )
    }

    // Get LLM service
    console.log('🤖 Initializing LLM service')
    const llmService = getLLMService()

    // Check available providers
    const providers = llmService.getAvailableProviders()
    console.log('🔌 Available LLM providers:', providers)
    
    if (!providers.gemini && !providers.openai) {
      console.error('❌ No LLM providers configured')
      return NextResponse.json(
        { error: 'No LLM providers configured. Please set GOOGLE_API_KEY or OPENAI_API_KEY environment variables.' },
        { status: 500 }
      )
    }

    // Limit chat history to last 10 exchanges to reduce token usage
    const limitedMessages = limitChatHistory(messages, 10)

    // Convert database messages to LLM format
    const chatMessages: ChatMessage[] = limitedMessages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      fileAttachments: msg.fileAttachments || [],
    }))

    console.log('💬 Chat messages prepared:', chatMessages.length)

    // Detect and enhance messages with successful file upload information
    chatMessages.forEach((msg, index) => {
      if (msg.role === 'user' && msg.fileAttachments && msg.fileAttachments.length > 0) {
        const successfulUploads = msg.fileAttachments.filter((file: any) => file.uploadSuccess)
        
        if (successfulUploads.length > 0) {
          // Enhance the user message content to include upload success information
          let uploadInfo = '\n\n**📁 File Upload Status:**\n'
          
          successfulUploads.forEach((file: any) => {
            uploadInfo += `✅ Successfully uploaded "${file.name}" to John Deere Files\n`
            uploadInfo += `   - File Type: ${file.fileType}\n`
            uploadInfo += `   - File ID: ${file.fileId}\n`
            uploadInfo += `   - Size: ${Math.round(file.fileSize / 1024)} KB\n`
            uploadInfo += `   - Upload Method: ${file.endpoint}\n`
            if (file.message) {
              uploadInfo += `   - Details: ${file.message}\n`
            }
          })
          
          uploadInfo += '\nThe files have been successfully uploaded to your John Deere account and are now available in your John Deere Operations Center Files section.'
          
          // Add the upload information to the message content
          chatMessages[index].content = msg.content + uploadInfo
          
          console.log(`📁 Enhanced message ${index} with upload success info for ${successfulUploads.length} files`)
        }
      }
    })

    // Check if John Deere is selected as a data source
    const hasJohnDeere = selectedDataSources && selectedDataSources.includes('johndeere')
    const hasWeather = selectedDataSources && selectedDataSources.includes('weather')

    // Prepare context-aware system prompt based on data source selection
    let systemPrompt = AGRICULTURAL_SYSTEM_PROMPT
    
    if (hasJohnDeere) {
      // John Deere is selected - enable John Deere functions for farm data requests
      systemPrompt += `\n\n**IMPORTANT CONTEXT:**
The user has John Deere connected as an active data source. When they ask about farm data (fields, equipment, organizations, operations), you MUST immediately use the available John Deere API functions to fetch their data.

**REQUIRED ACTIONS for John Deere data requests:**
- For field questions (count, list, details): Call getFields() - it will auto-fetch organization
- For equipment/machine questions (count, list, details): Call getEquipment() - it will auto-fetch organization  
- For operations questions (recent activity, field operations): Call getOperations() - it will auto-fetch organization
- For comprehensive data: Call getComprehensiveData() with the organization ID
- ALWAYS call the appropriate function when user asks about farm data

**EXAMPLES:** 
- User: "how many fields do I have" → IMMEDIATELY call getFields() → count the returned fields
- User: "how many machines do I have" → IMMEDIATELY call getEquipment() → count the returned equipment
- User: "tell me about my machines" → IMMEDIATELY call getEquipment() → provide detailed equipment information
- User: "operations on field X" → IMMEDIATELY call getOperations() → show the operations data

**DO:**
- Automatically fetch the organization first, then use its ID for subsequent calls
- Provide specific data-driven responses based on actual API results
- Use John Deere functions immediately for any farm data questions

**DO NOT:**
- Give generic responses without calling functions
- Ask the user to provide organization IDs manually
- Ask the user to select a data source when John Deere is already connected

Active data sources: ${selectedDataSources?.join(', ') || 'none'}`
    } else {
      // John Deere not selected - offer selection for farm data requests
      systemPrompt += `\n\n**IMPORTANT CONTEXT:**
The user has NOT connected John Deere as a data source yet. When they ask about specific farm data (fields, equipment, organizations, operations), you should offer them data source selection options.

**REQUIRED ACTIONS for farm data requests:**
- For questions about "my fields", "my equipment", "my operations", etc. → Offer John Deere connection
- For general farming advice → Answer directly without data source selection
- For weather questions → Use weather tools directly (weather is always available)

**EXAMPLES:** 
- User: "how many fields do I have" → "I can help you check your field count! To access your field data, you'll need to connect to your John Deere Operations Center. You can connect using the integrations button in the interface."
- User: "what's the weather like" → Use weather tools directly
- User: "what's the best time to plant corn" → Answer directly with farming advice

**DO:**
- Offer John Deere connection for specific farm data requests
- Use weather tools when weather questions are asked
- Provide general farming advice without requiring data source selection

**DO NOT:**
- Call John Deere API functions when John Deere is not connected
- Give generic responses without explaining how to connect data sources

Active data sources: ${selectedDataSources?.join(', ') || 'none'}`
    }

    // Generate completion with appropriate function calling
    console.log('🎯 Generating LLM completion...')
    console.log('📋 System prompt:', systemPrompt.substring(0, 200) + '...')
    console.log('📝 Chat messages:', chatMessages.map(m => ({ role: m.role, contentLength: m.content.length })))
    console.log('🔗 Selected data sources:', selectedDataSources || 'none')
    
    // Enable functions - always enable weather and MCP tools, enable John Deere if connected
    const enableFunctions = true

    // Get relevant functions based on selected data sources to reduce token usage
    const relevantFunctions = getRelevantFunctions(selectedDataSources)

    let response = await llmService.generateChatCompletion(chatMessages, {
      maxTokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.7,
      systemPrompt: systemPrompt,
      enableFunctions: enableFunctions,
      functions: relevantFunctions,
    })

    console.log('🎯 LLM response received:', {
      model: response.model,
      contentLength: response.content?.length,
      hasFunctionCalls: !!response.functionCalls?.length,
      functionCallCount: response.functionCalls?.length || 0
    })

    // Store original user query for validation
    const originalUserQuery = chatMessages[chatMessages.length - 1]?.content || ''
    let functionResults: any[] = []
    let originalFunctionCalls: any[] = []
    let messagesWithFunctions: InternalChatMessage[] = []
    let needsMultiStepFunctions = false

    // Handle function calls if present
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log('🔧 Function calls detected:', response.functionCalls.map(fc => fc.name))
      
      // Filter out functions based on selected data sources
      const johnDeereFunctions = ['getOrganizations', 'getFields', 'getEquipment', 'getOperations', 'getComprehensiveData', 'scheduleFieldOperation', 'getFieldRecommendations', 'updateFieldStatus', 'scheduleEquipmentMaintenance', 'getEquipmentAlerts', 'updateEquipmentStatus', 'get_equipment_details', 'get_field_operation_history', 'list_john_deere_files', 'get_field_boundary']
      const euCommissionFunctions = ['getEUMarketPrices', 'getEUProductionData', 'getEUTradeData', 'getEUMarketDashboard']
      const usdaFunctions = ['getUSDAMarketPrices', 'getUSDAProductionData', 'getUSDATradeData', 'getUSDAMarketDashboard']
      let validFunctionCalls = response.functionCalls
      
      // Filter out John Deere functions if John Deere is not selected
      if (!hasJohnDeere) {
        const filteredCalls = validFunctionCalls.filter(fc => !johnDeereFunctions.includes(fc.name))
        if (filteredCalls.length !== validFunctionCalls.length) {
          console.log('🚫 Filtered out John Deere functions (John Deere not selected)')
          console.log('🔧 Original functions:', validFunctionCalls.map(fc => fc.name))
          console.log('🔧 Filtered functions:', filteredCalls.map(fc => fc.name))
        }
        validFunctionCalls = filteredCalls
      }
      
      if (validFunctionCalls.length === 0) {
        console.log('⚠️  No valid function calls to execute')
      } else {
        // Execute valid function calls
        console.log('⚡ Executing function calls...')
        functionResults = await Promise.all(
          validFunctionCalls.map(async (functionCall, index) => {
            console.log(`🔧 Executing function ${index + 1}/${validFunctionCalls.length}: ${functionCall.name}`)
            const result = await executeFunction(functionCall, request)
            return {
              name: functionCall.name,
              result,
              error: result.error ? result.error : undefined,
              callId: functionCall.callId
            }
          })
        )

        console.log('✅ All function calls completed:', functionResults.map(fr => ({ name: fr.name, hasError: !!fr.error })))

        // Preserve the original function calls before getting final response
        originalFunctionCalls = response.functionCalls

        // Check if any function results contain connection errors
        const hasConnectionErrors = functionResults.some(result => 
          result.result?.error === 'connection_required' || 
          result.result?.error === 'rca_required' || 
          result.result?.error === 'insufficient_permissions' ||
          result.result?.error === 'access_denied'
        )

        // Check if user asked about weather (needed for auto-completion)
        const userAskedAboutWeather = originalUserQuery.toLowerCase().includes('weather') ||
          originalUserQuery.toLowerCase().includes('forecast') ||
          originalUserQuery.toLowerCase().includes('temperature') ||
          originalUserQuery.toLowerCase().includes('rain') ||
          originalUserQuery.toLowerCase().includes('wind')
        
        // Check if we need to automatically call boundary function after getting fields
        const hasGetFieldsResult = functionResults.some(result =>
          result.name === 'getFields' && !result.error && (
            result.result?.success ||
            result.result?.fields ||
            (result.result && !result.result.error)
          )
        )

        if (DEBUG_MODE) {
          console.log('🔍 Detailed function results analysis:', functionResults.map(result => ({
            name: result.name,
            hasError: result.error,
            resultKeys: result.result ? Object.keys(result.result) : 'no result',
            hasSuccess: result.result?.success,
            hasFields: result.result?.fields ? 'yes' : 'no',
            fieldsCount: result.result?.fields?.length || 0,
            resultType: typeof result.result,
            resultSample: result.result ? JSON.stringify(result.result).substring(0, 200) + '...' : 'no result'
          })))
        }

        const userAskedForBoundary = originalUserQuery.toLowerCase().includes('boundary') ||
                                     originalUserQuery.toLowerCase().includes('border') ||
                                     originalUserQuery.toLowerCase().includes('shape') ||
                                     originalUserQuery.toLowerCase().includes('coordinates')

        // Check if we should auto-trigger boundary for location-dependent requests
        const userAskedForLocationData = originalUserQuery.toLowerCase().includes('weather') ||
                                        originalUserQuery.toLowerCase().includes('forecast') ||
                                        originalUserQuery.toLowerCase().includes('rain') ||
                                        originalUserQuery.toLowerCase().includes('temperature') ||
                                        originalUserQuery.toLowerCase().includes('location')

        const shouldAutoTriggerBoundary = hasGetFieldsResult &&
                                        (userAskedForBoundary || userAskedForLocationData) &&
                                        !originalFunctionCalls.some(fc => fc.name === 'get_field_boundary')

        // Auto-trigger boundary call if user asked for boundary and we have fields
        if (DEBUG_MODE) {
          console.log('🔍 Auto-boundary check:', {
            hasGetFieldsResult,
            userAskedForBoundary,
            userAskedForLocationData,
            hasExistingBoundaryCall: originalFunctionCalls.some(fc => fc.name === 'get_field_boundary'),
            originalUserQuery: originalUserQuery.toLowerCase(),
            shouldTrigger: shouldAutoTriggerBoundary
          })
        }

        if (shouldAutoTriggerBoundary) {
          console.log(`🔄 Auto-triggering get_field_boundary function after successful getFields (reason: ${userAskedForBoundary ? 'boundary request' : 'location-dependent request'})`)

          // Find the getFields result
          const getFieldsResult = functionResults.find(result => result.name === 'getFields')
          if (getFieldsResult?.result?.fields) {
            const fields = getFieldsResult.result.fields
            const userFieldQuery = originalUserQuery.toLowerCase()

            // Try to find matching field by name with better matching logic
            let targetField = null

            // Extract potential field names from user query (words that could be field names)
            const potentialFieldNames = originalUserQuery.toLowerCase()
              .replace(/[^\w\s]/g, ' ') // Remove punctuation
              .split(/\s+/) // Split by whitespace
              .filter(word => word.length > 2 && word.length < 20) // Filter reasonable word lengths
              .filter(word => !['field', 'boundary', 'border', 'shape', 'coordinates', 'want', 'get', 'the', 'for', 'my', 'and', 'with'].includes(word)) // Remove common words

            console.log('🔍 Potential field names from query:', potentialFieldNames)
            console.log('📋 Available fields:', fields.map((f: any) => f.name))

            // Try exact match first
            for (const field of fields) {
              if (field.name) {
                const fieldNameLower = field.name.toLowerCase()
                if (potentialFieldNames.includes(fieldNameLower)) {
                  targetField = field
                  console.log(`✅ Exact match found: "${field.name}"`)
                  break
                }
              }
            }

            // If no exact match, try partial match
            if (!targetField) {
              for (const field of fields) {
                if (field.name) {
                  const fieldNameLower = field.name.toLowerCase()
                  for (const potentialName of potentialFieldNames) {
                    if (fieldNameLower.includes(potentialName) || potentialName.includes(fieldNameLower)) {
                      targetField = field
                      console.log(`✅ Partial match found: "${field.name}" (query: "${potentialName}")`)
                      break
                    }
                  }
                  if (targetField) break
                }
              }
            }

            // If still no match but user clearly asked for boundary and there's only one field, use it
            if (!targetField && fields.length === 1 && (originalUserQuery.toLowerCase().includes('boundary') || originalUserQuery.toLowerCase().includes('border') || originalUserQuery.toLowerCase().includes('shape') || originalUserQuery.toLowerCase().includes('coordinates'))) {
              targetField = fields[0]
              console.log(`🎯 Using only available field: "${targetField.name}" (user asked for boundary)`)
            }

            // If we found a matching field, auto-call boundary function
            if (targetField) {
              console.log(`🎯 Auto-calling boundary for field: ${targetField.name} (${targetField.id})`)

              // Execute the boundary function automatically using the same method as other functions
              try {
                console.log('🔧 Executing auto-boundary function call...')
                const boundaryResult = await executeFunction({
                  name: 'get_field_boundary',
                  arguments: {
                    fieldName: targetField.name,
                    organizationId: getFieldsResult.result.organizationId || '905901'
                  }
                }, request)
                
                functionResults.push({
                  name: 'get_field_boundary',
                  result: boundaryResult,
                  callId: `auto_boundary_${Date.now()}`
                })
                                  console.log('✅ Auto-boundary function executed successfully')

                  // ADD DEBUG CODE: Log the full boundary response structure
                  console.log('🔍 FULL BOUNDARY RESPONSE DEBUG:')
                  console.log(JSON.stringify(functionResults.find(r => r.name === 'get_field_boundary'), null, 2))

                  // Check if user wants to download/export the boundary
                  const userWantsDownload = originalUserQuery.toLowerCase().includes('download') ||
                                          originalUserQuery.toLowerCase().includes('export') ||
                                          originalUserQuery.toLowerCase().includes('kml') ||
                                          originalUserQuery.toLowerCase().includes('shapefile')

                  if (userWantsDownload) {
                    console.log('📁 User wants to download/export boundary - auto-triggering export function...')

                    try {
                      // Determine export format based on user query
                      let exportFormat = 'kml' // default
                      if (originalUserQuery.toLowerCase().includes('shapefile')) {
                        exportFormat = 'shapefile'
                      }

                      // Auto-call the export function
                      const exportResult = await executeFunction({
                        name: `export_field_boundary_${exportFormat}`,
                        arguments: {
                          fieldName: targetField.name,
                          platform: 'johndeere'
                        }
                      }, request)

                      functionResults.push({
                        name: `export_field_boundary_${exportFormat}`,
                        result: exportResult,
                        callId: `auto_export_${Date.now()}`
                      })

                      console.log(`✅ Auto-export function executed successfully: ${exportFormat}`)

                    } catch (error) {
                      console.error('❌ Auto-export function failed:', error)
                      functionResults.push({
                        name: `export_field_boundary_kml`, // fallback to KML
                        result: { error: `Auto-export failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
                        callId: `auto_export_${Date.now()}`
                      })
                    }
                  }

                // Extract coordinates and call weather API BEFORE sending to LLM
                if (boundaryResult && !boundaryResult.error && userAskedForLocationData) {
                  console.log('🌦️ Extracting coordinates from boundary data for weather call...')

                  try {
                    // Extract coordinates from boundary data
                    const coordinates = extractCoordinatesFromBoundary(boundaryResult)
                    if (coordinates) {
                      console.log(`📍 Extracted coordinates: ${coordinates.lat}, ${coordinates.lng}`)

                                            // Parse requested days from user query
                      const parseDaysFromQuery = (query: string): number => {
                        console.log(`🔍 Parsing days from query: "${query}"`)

                        // Look for patterns like "6 days", "7-day", "3 day forecast", etc.
                        const dayPatterns = [
                          /(\d+)\s*days?\s*weather/i,
                          /(\d+)[-\s]*days?\s*forecast/i,
                          /(\d+)\s*day\s*weather/i,
                          /(\d+)[-\s]*day\s*forecast/i,
                          /weather\s*for\s*(\d+)\s*days?/i,
                          /forecast\s*for\s*(\d+)\s*days?/i,
                          /(\d+)\s*day/i  // Simple "6 day" pattern
                        ]

                        for (const pattern of dayPatterns) {
                          const match = query.match(pattern)
                          if (match && match[1]) {
                            const days = parseInt(match[1])
                            if (days >= 1 && days <= 10) { // Reasonable range
                              console.log(`✅ Parsed ${days} days from query using pattern: ${pattern}`)
                              return days
                            }
                          }
                        }

                        console.log(`📅 No specific days found in query, defaulting to 5 days`)
                        // Default to 5 if no specific number found
                        return 5
                      }

                      const requestedDays = parseDaysFromQuery(originalUserQuery)
                      console.log(`🌤️ Calling weather API for ${requestedDays} days with extracted coordinates...`)

                      const weatherResult = await executeFunction({
                        name: 'getWeatherForecast',
                        arguments: {
                          latitude: coordinates.lat,
                          longitude: coordinates.lng,
                          days: requestedDays
                        }
                      }, request)

                      if (weatherResult && !weatherResult.error) {
                        functionResults.push({
                          name: 'getWeatherForecast',
                          result: weatherResult,
                          callId: `auto_weather_${Date.now()}`
                        })
                        console.log('✅ Weather API called successfully with extracted coordinates')

                        // Remove the massive boundary data to prevent LLM overload
                        // Keep only essential field info
                        const fieldSummary = {
                          fieldName: targetField?.name || 'Unknown Field',
                          coordinates: coordinates,
                          area: calculateFieldArea(boundaryResult),
                          // Exclude massive geometry data
                        }

                        // Replace boundary result with summary
                        const boundaryIndex = functionResults.findIndex(result => result.name === 'get_field_boundary')
                        if (boundaryIndex !== -1) {
                          functionResults[boundaryIndex] = {
                            name: 'get_field_boundary',
                            result: { success: true, data: fieldSummary },
                            callId: functionResults[boundaryIndex].callId
                          }
                        }
                      } else {
                        console.warn('⚠️ Weather API call failed:', weatherResult?.error)
                      }
                    } else {
                      console.warn('⚠️ Could not extract coordinates from boundary data')
                    }
                  } catch (error) {
                    console.error('❌ Coordinate extraction or weather API call failed:', error)
                  }
                }
              } catch (error) {
                console.error('❌ Auto-boundary function failed:', error)
                functionResults.push({
                  name: 'get_field_boundary',
                  result: { error: `Auto-boundary failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
                  callId: `auto_boundary_${Date.now()}`
                })
              }
            }
          }
        }

        // Add function results to conversation and get final response
        messagesWithFunctions = [
          ...chatMessages,
          // Create a single assistant message with all tool calls
          {
            role: 'assistant' as const,
            content: response.content,
            tool_calls: response.functionCalls.map((functionCall, index) => ({
              id: functionCall.callId || `call_${index}_${Date.now()}`,
              type: 'function' as const,
              function: {
                name: functionCall.name,
                arguments: JSON.stringify(functionCall.arguments)
              }
            }))
          },
          // Add all tool results
          ...functionResults.map(result => ({
            role: 'tool' as const,
            content: JSON.stringify(result.result),
            tool_call_id: result.callId || `call_${functionResults.indexOf(result)}_${Date.now()}`,
          }))
        ]

        console.log('🎯 Getting final response with function results...')

        // Check if we need to enable functions for multi-step workflows
        needsMultiStepFunctions = originalFunctionCalls.some(fc =>
          fc.name === 'get_field_boundary' || fc.name === 'getFields'
        ) && functionResults.some(result =>
          result.result?.success && (result.result?.data || result.result?.fields)
        ) && (userAskedAboutWeather || hasWeather)



        // Only enable functions if we actually have boundary data to work with
        const hasBoundaryData = functionResults.some(result =>
          result.name === 'get_field_boundary' && result.result?.success && result.result?.data
        )
        if (!hasBoundaryData && userAskedAboutWeather) {
          needsMultiStepFunctions = false
        }

        console.log('🔍 Multi-step workflow check:', {
          userAskedAboutWeather,
          hasWeather,
          hasBoundaryCall: originalFunctionCalls.some(fc => fc.name === 'get_field_boundary'),
          hasAutoBoundaryCall: functionResults.some(result => result.name === 'get_field_boundary' && result.callId?.startsWith('auto_boundary_')),
          hasSuccessfulBoundaryData: functionResults.some(result => result.result?.success && result.result?.data),
          needsMultiStepFunctions,
          originalUserQuery: originalUserQuery.substring(0, 100)
        })

        // Prepare enhanced system prompt based on whether there are connection errors
        if (hasConnectionErrors) {
          systemPrompt += `\n\n**IMPORTANT: Some function calls encountered connection/permission errors. Use the userMessage field from the error results to provide helpful guidance to the user. DO NOT show technical error details - only provide user-friendly explanations and guidance.**`
        } else if (needsMultiStepFunctions || functionResults.some(result => result.name === 'get_field_boundary' && result.callId?.startsWith('auto_boundary_'))) {
          // Check if we now have both field and weather data, or if we auto-called boundary
          const hasWeatherData = functionResults.some(result => result.name === 'getWeatherForecast' && result.result?.success)
          const hasFieldData = functionResults.some(result => result.name === 'get_field_boundary' && result.result?.success)
          
          if (hasWeatherData && hasFieldData) {
            systemPrompt += `\n\n**✅ COMPLETE WORKFLOW: You now have BOTH field boundary data AND weather forecast data.
PROVIDE A COMPREHENSIVE RESPONSE that includes:
1. Field information (name, location, size from boundary data)
2. Current weather conditions and forecast (from weather data)
3. Agricultural insights about the weather for this specific field
4. Any recommendations based on the weather data
YOU HAVE ALL THE DATA - PROVIDE A DETAILED, HELPFUL RESPONSE.**`
          } else if (hasWeatherData) {
            systemPrompt += `\n\n**✅ WEATHER DATA AVAILABLE: You now have weather forecast data for the field.

**MANDATORY RESPONSE REQUIREMENTS:**
1. **EXTRACT and DISPLAY weather information** from the function result data
2. **Include field context**: reference the field name and location
3. **Provide comprehensive weather details**: current conditions, forecast, temperature, precipitation
4. **Include agricultural insights**: how weather affects farming operations
5. **Be comprehensive** but user-friendly in your response

**DATA LOCATION**: Look for weather data in the function results under 'getWeatherForecast' result.data

**RESPONSE FORMAT:**
- Start with field identification
- Current weather conditions
- 5-day forecast summary
- Agricultural recommendations based on weather
- Any weather-related alerts or warnings`
          } else {
            systemPrompt += `\n\n**🚀 START WORKFLOW: Begin the step-by-step process to answer the user's question. Make the appropriate function calls and explain your progress.**`
          }
        }

        // Check if we have connection errors for field boundary requests when user asked about weather
        const hasBoundaryConnectionError = functionResults.some(result => 
          result.name === 'get_field_boundary' && 
          (result.result?.error === 'connection_required' || 
           result.result?.error === 'rca_required' || 
           result.result?.error === 'insufficient_permissions' ||
           result.result?.error === 'access_denied' ||
           result.error)
        )
        
        if (userAskedAboutWeather && hasBoundaryConnectionError && hasWeather) {
          systemPrompt += `\n\n**🌤️ WEATHER QUERY WITH FIELD CONNECTION ERROR**

The user asked about weather for a specific field, but there was an authentication/connection error accessing the field data.

**YOU MUST:**
1. Acknowledge that you cannot access the specific field data due to connection issues
2. Offer to provide weather information if the user provides coordinates
3. Suggest they check their John Deere connection
4. Offer general weather information for their location if they provide city/region

**DO NOT return empty responses - always provide helpful alternatives.**`
        } else {
          systemPrompt += `\n\n**CRITICAL: You have just received function results with actual farm data. You MUST provide a detailed response to the user's question using this data. 

**REQUIRED ACTIONS:**
1. Analyze the function results data
2. Extract relevant information for the user's question
3. Provide a comprehensive answer with specific details
4. Include recommendations based on the data

**YOU MUST RESPOND WITH ACTUAL CONTENT - DO NOT RETURN EMPTY RESPONSES.**`
        }

        // 🚨 EARLY WEATHER RESPONSE: Check if we can skip LLM entirely for pure weather queries
        const earlyWeatherData = functionResults.some(result => result.name === 'getWeatherForecast' && result.result?.success)
        const earlyFieldData = functionResults.some(result => result.name === 'get_field_boundary' && result.result?.success)
        const isPureWeatherQuery = originalUserQuery.toLowerCase().includes('weather') ||
                                  originalUserQuery.toLowerCase().includes('forecast') ||
                                  originalUserQuery.toLowerCase().includes('temperature')

        if (earlyWeatherData && earlyFieldData && isPureWeatherQuery && !needsMultiStepFunctions) {
          console.log('🌤️ Pure weather query with complete data - generating direct response')
          response = {
            content: generateWeatherForecastResponse(functionResults, originalUserQuery),
            model: 'direct-generation',
            functionCalls: [],
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
          }
        } else {
          // Call LLM for complex queries or when we need more processing
          try {
            response = await llmService.generateChatCompletion(messagesWithFunctions, {
              maxTokens: options?.maxTokens || 4000,
              temperature: 0.1, // Lower temperature for more consistent function calling
              systemPrompt: systemPrompt,
              enableFunctions: needsMultiStepFunctions, // Enable functions for multi-step workflows
              functions: needsMultiStepFunctions ? relevantFunctions : [], // Use relevant functions for multi-step workflows
            })
          } catch (llmError) {
            console.error('❌ LLM generation failed:', llmError)

            // 🚨 DIRECT WEATHER RESPONSE: When LLMs fail, generate response directly
            const hasWeatherData = functionResults.some(result => result.name === 'getWeatherForecast' && result.result?.success)
            const hasFieldData = functionResults.some(result => result.name === 'get_field_boundary' && result.result?.success)

            if (hasWeatherData && hasFieldData) {
              console.log('🌤️ LLMs failed, generating direct weather response')
              response = {
                content: generateWeatherForecastResponse(functionResults, originalUserQuery),
                model: 'direct-generation',
                functionCalls: [],
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
              }
            } else {
              // Create a fallback response using the available function results
              response = {
                content: generateFallbackResponse(functionResults, originalUserQuery),
                model: 'fallback',
                functionCalls: [],
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
              }
            }
          }
        }

        // Restore the original function calls to the response and add any automatic calls
        const automaticCalls = functionResults
          .filter(result => !originalFunctionCalls.some(original => original.name === result.name))
          .map(result => ({
            name: result.name,
            arguments: result.result?.arguments || {}
          }))
        
        response.functionCalls = [...originalFunctionCalls, ...automaticCalls]
        
        console.log('✅ Function calls in response:', {
          original: originalFunctionCalls.map(fc => fc.name),
          automatic: automaticCalls.map(fc => fc.name),
          total: response.functionCalls.map(fc => fc.name)
        })

        console.log('✅ Final response generated:', {
          model: response.model,
          contentLength: response.content?.length
        })
        
        // 🚨 FINAL FALLBACK: If LLM returns empty content despite having data
        if (!response.content || response.content.trim().length === 0) {
          console.log('🚨 LLM returned empty content - generating fallback response')
          
          const hasWeatherData = functionResults.some(result => result.name === 'getWeatherForecast' && result.result?.success)
          const hasFieldData = functionResults.some(result => result.name === 'get_field_boundary' && result.result?.success)
          
          if (hasWeatherData && hasFieldData) {
            response.content = generateWeatherForecastResponse(functionResults, originalUserQuery)
          } else {
            response.content = generateFallbackResponse(functionResults, originalUserQuery)
          }
        }
      }
    }

    // Clean up raw KML content from LLM response if download is available
    if (response.content && functionResults.some(result =>
      result.name?.startsWith('export_field_boundary_') && result.result?.success
    )) {
      console.log('🧹 Cleaning up raw KML content from response...')
      // Remove raw KML content from response while keeping the summary
      response.content = response.content
        .replace(/```xml[\s\S]*?```/g, '') // Remove XML code blocks
        .replace(/Here is the KML file content[\s\S]*?You can use this file/g, 'You can use this file') // Clean up text around XML
        .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines
        .trim()
      console.log('✅ KML content cleaned up from response')
    }

    // Parse potential visualization data from LLM response
    console.log('🔍 Raw LLM response content:', response.content)

    // Use the new visualization parser - extract visualizations and clean content
    const { visualizations, cleanedContent } = parseVisualizationsFromResponse(response.content, functionResults)

    // 🧹 CLEAN UP: Sanitize content for user-facing output
    const messageContent = sanitizeResponseContent(cleanedContent)
    
    console.log('🧹 Cleaned response content from', cleanedContent.length, 'to', messageContent.length, 'characters')

    console.log('📊 Auto-generated visualizations:', visualizations.length, 'items')
    if (visualizations.length > 0) {
      console.log('📊 Visualization data:', JSON.stringify(visualizations, null, 2))
    }

    // Save assistant message to database
    console.log('💾 Saving message to database...')
    console.log('🔍 About to save visualizations:', visualizations.length, 'items')
    console.log('🔍 Visualization data before saving:', JSON.stringify(visualizations, null, 2))
    
    const metadataToSave = {
      model: response.model,
      usage: response.usage,
      functionCalls: response.functionCalls ? JSON.parse(JSON.stringify(response.functionCalls)) : [],
      visualizations: visualizations.length > 0 ? JSON.parse(JSON.stringify(visualizations)) : undefined,
      reasoning: response.reasoning ? JSON.parse(JSON.stringify(response.reasoning)) : undefined,
    }
    
    console.log('🔍 Complete metadata to save:', JSON.stringify(metadataToSave, null, 2))
    
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId: sessionId,
        role: 'assistant',
        content: messageContent,
        metadata: metadataToSave,
      },
    })

    console.log('✅ Chat completion successful:', assistantMessage.id)

    return NextResponse.json({
      message: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
        metadata: assistantMessage.metadata,
      },
      usage: response.usage,
      model: response.model,
    })
  } catch (error) {
    console.error('❌ Error generating chat completion:', error)
    
    // Return specific error messages for common issues
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'LLM API configuration error. Please check your API keys.' },
          { status: 500 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}

// GET endpoint to check LLM service status
export async function GET(request: NextRequest) {
  try {
    const llmService = getLLMService()
    const providers = llmService.getAvailableProviders()
    const config = llmService.getConfig()

    return NextResponse.json({
      status: 'ok',
      providers,
      config,
    })
  } catch (error) {
    console.error('Error checking LLM service status:', error)
    return NextResponse.json(
      { error: 'Failed to check LLM service status' },
      { status: 500 }
    )
  }
}