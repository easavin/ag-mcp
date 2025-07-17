import { NextRequest, NextResponse } from 'next/server'
import { getLLMService, AGRICULTURAL_SYSTEM_PROMPT, ChatMessage, FunctionCall } from '@/lib/llm'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { mcpToolExecutor, ALL_MCP_TOOLS } from '@/lib/mcp-tools'
import { JohnDeereConnectionError, JohnDeereRCAError, JohnDeerePermissionError } from '@/lib/johndeere-api'
import { parseVisualizationsFromResponse } from '@/lib/visualization-parser'

// Function to execute John Deere API calls
async function executeJohnDeereFunction(functionCall: FunctionCall, request: NextRequest): Promise<any> {
  const { name, arguments: args } = functionCall
  
  console.log(`🔧 Executing John Deere function: ${name}`, args)
  
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    let url: string
    
    // Helper function to make authenticated internal API calls
    const makeAuthenticatedCall = async (apiUrl: string) => {
      return await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Forward the original request cookies for authentication
          'Cookie': request.headers.get('cookie') || '',
        },
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
  
  // Check if it's an MCP tool
  const mcpTool = ALL_MCP_TOOLS.find(tool => tool.name === name)
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

    // Convert database messages to LLM format
    const chatMessages: ChatMessage[] = messages.map((msg: any) => ({
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
    
    let response = await llmService.generateChatCompletion(chatMessages, {
      maxTokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.7,
      systemPrompt: systemPrompt,
      enableFunctions: enableFunctions,
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
              error: result.error ? result.error : undefined
            }
          })
        )

        console.log('✅ All function calls completed:', functionResults.map(fr => ({ name: fr.name, hasError: !!fr.error })))

        // Preserve the original function calls before getting final response
        const originalFunctionCalls = response.functionCalls

        // Check if any function results contain connection errors
        const hasConnectionErrors = functionResults.some(result => 
          result.result?.error === 'connection_required' || 
          result.result?.error === 'rca_required' || 
          result.result?.error === 'insufficient_permissions' ||
          result.result?.error === 'access_denied'
        )

        // Add function results to conversation and get final response
        const messagesWithFunctions: ChatMessage[] = [
          ...chatMessages,
          {
            role: 'assistant',
            content: response.content,
            functionCall: response.functionCalls[0], // For simplicity, use first function call
          },
          ...functionResults.map(result => ({
            role: 'function' as const,
            content: JSON.stringify(result.result),
            functionResult: result,
          }))
        ]

        console.log('🎯 Getting final response with function results...')
        console.log('📝 Messages being sent to LLM:', messagesWithFunctions.map(m => ({
          role: m.role,
          contentLength: m.content?.length || 0,
          contentPreview: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : '')
        })))
        
        // Check if user asked about weather (needed for auto-completion)
        const userAskedAboutWeather = originalUserQuery.toLowerCase().includes('weather') || 
          originalUserQuery.toLowerCase().includes('forecast') ||
          originalUserQuery.toLowerCase().includes('temperature') ||
          originalUserQuery.toLowerCase().includes('rain') ||
          originalUserQuery.toLowerCase().includes('wind')
        
        // Debug: Check if we have boundary data with coordinates
        const boundaryResult = functionResults.find(fr => fr.name === 'get_field_boundary')
        if (boundaryResult && boundaryResult.result?.data?.values?.[0]) {
          console.log('🔍 Sample boundary data structure:', JSON.stringify(boundaryResult.result.data.values[0], null, 2).substring(0, 500) + '...')
          
          // 🚨 AUTOMATIC WEATHER COMPLETION: Since LLM consistently fails to follow instructions,
          // automatically extract coordinates and call weather API when user asks about weather
          if (userAskedAboutWeather && hasWeather) {
            console.log('🌤️ LLM failed to continue workflow - automatically extracting coordinates and calling weather API')
            
            const fieldData = boundaryResult.result.data.values[0]
            let latitude, longitude
            
            // Extract coordinates from multipolygons structure
            if (fieldData.multipolygons?.[0]?.rings?.[0]?.points) {
              const points = fieldData.multipolygons[0].rings[0].points
              if (points.length > 0) {
                                 // Calculate center point from all coordinates
                 const lats = points.map((p: any) => p.lat).filter((lat: any) => lat !== undefined)
                 const lons = points.map((p: any) => p.lon).filter((lon: any) => lon !== undefined)
                 
                 if (lats.length > 0 && lons.length > 0) {
                   latitude = lats.reduce((sum: number, lat: number) => sum + lat, 0) / lats.length
                   longitude = lons.reduce((sum: number, lon: number) => sum + lon, 0) / lons.length
                  console.log(`🌤️ Extracted center coordinates: ${latitude}, ${longitude}`)
                }
              }
            }
            
            // If we have coordinates, make the weather call
            if (latitude && longitude) {
              try {
                console.log('🌤️ Automatically calling weather API...')
                const weatherResult = await executeFunction({
                  name: 'getWeatherForecast',
                  arguments: { latitude, longitude }
                }, request)
                
                // Add weather result to function results
                functionResults.push({
                  name: 'getWeatherForecast',
                  result: weatherResult,
                  error: weatherResult.error ? weatherResult.error : undefined
                })
                
                console.log('✅ Automatic weather API call completed')
              } catch (error) {
                console.error('❌ Failed to automatically call weather API:', error)
              }
            } else {
              console.warn('⚠️ Could not extract coordinates from boundary data')
            }
          }
        }
        
        // Check if we need to enable functions for multi-step workflows
        
        const needsMultiStepFunctions = originalFunctionCalls.some(fc => 
          fc.name === 'get_field_boundary' || fc.name === 'getFields'
        ) && functionResults.some(result => 
          result.result?.success && (result.result?.data || result.result?.fields)
                ) && (userAskedAboutWeather || hasWeather)

        console.log('🔍 Multi-step workflow check:', {
          userAskedAboutWeather,
          hasWeather,
          hasBoundaryCall: originalFunctionCalls.some(fc => fc.name === 'get_field_boundary'),
          hasSuccessfulBoundaryData: functionResults.some(result => result.result?.success && result.result?.data),
          needsMultiStepFunctions,
          originalUserQuery: originalUserQuery.substring(0, 100)
        })

        
        
        // Prepare enhanced system prompt based on whether there are connection errors
        let finalSystemPrompt = systemPrompt
        if (hasConnectionErrors) {
          finalSystemPrompt += `\n\n**IMPORTANT: Some function calls encountered connection/permission errors. Use the userMessage field from the error results to provide helpful guidance to the user. DO NOT show technical error details - only provide user-friendly explanations and guidance.**`
        } else if (needsMultiStepFunctions) {
          // Check if we now have both field and weather data
          const hasWeatherData = functionResults.some(result => result.name === 'getWeatherForecast' && result.result?.success)
          const hasFieldData = functionResults.some(result => result.name === 'get_field_boundary' && result.result?.success)
          
          if (hasWeatherData && hasFieldData) {
            finalSystemPrompt += `\n\n**✅ COMPLETE WORKFLOW: You now have BOTH field boundary data AND weather forecast data. 
PROVIDE A COMPREHENSIVE RESPONSE that includes:
1. Field information (name, location, size from boundary data)
2. Current weather conditions and forecast (from weather data)
3. Agricultural insights about the weather for this specific field
4. Any recommendations based on the weather data
YOU HAVE ALL THE DATA - PROVIDE A DETAILED, HELPFUL RESPONSE.**`
          } else if (hasFieldData) {
            finalSystemPrompt += `\n\n**🚨 CRITICAL: CONTINUE WEATHER WORKFLOW**

You just received field boundary data and the user asked about WEATHER for this field.

**MANDATORY NEXT STEPS:**
1. Look at the field boundary data in the function result
2. Find coordinates (lat/lon) in the boundary data
3. IMMEDIATELY call getWeatherForecast(latitude, longitude) with those coordinates
4. Provide a comprehensive weather report for the field

**COORDINATE EXTRACTION HELP:**
- Look for "lat" and "lon" values in the boundary data
- Or look for "latitude" and "longitude" 
- Or look for geometry coordinates
- Use the first coordinate pair you find

**EXAMPLE:** If you see lat: 41.628, lon: -3.587, then call getWeatherForecast(41.628, -3.587)

**ABSOLUTELY FORBIDDEN:**
- Returning empty responses
- Stopping after getting boundary data
- Not calling the weather function

**YOU MUST CALL getWeatherForecast() NOW - DO NOT STOP HERE**`
          } else {
            finalSystemPrompt += `\n\n**🚀 START WORKFLOW: Begin the step-by-step process to answer the user's question. Make the appropriate function calls and explain your progress.**`
          }
        } else {
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
            finalSystemPrompt += `\n\n**🌤️ WEATHER QUERY WITH FIELD CONNECTION ERROR**

The user asked about weather for a specific field, but there was an authentication/connection error accessing the field data.

**YOU MUST:**
1. Acknowledge that you cannot access the specific field data due to connection issues
2. Offer to provide weather information if the user provides coordinates
3. Suggest they check their John Deere connection
4. Offer general weather information for their location if they provide city/region

**EXAMPLE RESPONSE:**
"I'm unable to access the boundary data for field '14ha' due to a connection issue with your farm management system. However, I can still provide weather information! 

You can:
1. Provide coordinates (latitude, longitude) for the field
2. Tell me the city/region where the field is located
3. Check your John Deere connection in the integrations settings

Would you like me to get weather information using coordinates or a location name?"

**DO NOT return empty responses - always provide helpful alternatives.**`
          } else {
            finalSystemPrompt += `\n\n**CRITICAL: You have just received function results with actual farm data. You MUST provide a detailed response to the user's question using this data. 

**REQUIRED ACTIONS:**
1. Analyze the function results data
2. Extract relevant information for the user's question
3. Provide a comprehensive answer with specific details
4. Include recommendations based on the data

**EXAMPLES:**
- If field boundary data: Describe the field size, location, and provide harvesting recommendations
- If weather data: Analyze conditions and give farming advice
- If market data: Explain prices and market trends

**YOU MUST RESPOND WITH ACTUAL CONTENT - DO NOT RETURN EMPTY RESPONSES.**`
          }
        }
        
        console.log('🎯 Enhanced system prompt being sent:', finalSystemPrompt.substring(finalSystemPrompt.length - 500))
        console.log('🔧 Functions enabled for multi-step:', needsMultiStepFunctions)
        
        response = await llmService.generateChatCompletion(messagesWithFunctions, {
          maxTokens: options?.maxTokens || 4000,
          temperature: 0.1, // Lower temperature for more consistent function calling
          systemPrompt: finalSystemPrompt,
          enableFunctions: needsMultiStepFunctions, // Enable functions for multi-step workflows
        })

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
        
        // 🚨 FINAL FALLBACK: If LLM returns empty content despite having both field and weather data,
        // generate the response at code level
        if ((!response.content || response.content.trim().length === 0) && needsMultiStepFunctions) {
          const hasWeatherData = functionResults.some(result => result.name === 'getWeatherForecast' && result.result?.success)
          const hasFieldData = functionResults.some(result => result.name === 'get_field_boundary' && result.result?.success)
          
          if (hasWeatherData && hasFieldData && userAskedAboutWeather) {
            console.log('🚨 LLM returned empty content despite having complete data - generating fallback response')
            
            const fieldResult = functionResults.find(result => result.name === 'get_field_boundary')
            const weatherResult = functionResults.find(result => result.name === 'getWeatherForecast')
            
            if (fieldResult?.result?.data?.values?.[0] && weatherResult?.result?.data) {
              const fieldData = fieldResult.result.data.values[0]
              const weatherData = weatherResult.result.data
              
              const fieldName = fieldData.name || 'Unknown Field'
              const fieldArea = fieldData.area?.valueAsDouble ? `${fieldData.area.valueAsDouble.toFixed(1)} ${fieldData.area.unit}` : 'Unknown area'
              
              const current = weatherData.current
              const forecast = weatherData.forecast?.daily?.[0]
              const agriculture = weatherData.agriculture
              
              // Check if user asked for multi-day forecast
              const isMultiDayForecast = originalUserQuery.toLowerCase().includes('forecast') || 
                originalUserQuery.toLowerCase().includes('days') ||
                originalUserQuery.toLowerCase().includes('week') ||
                originalUserQuery.match(/\d+\s*day/i)
              
              console.log('🔍 Multi-day forecast requested:', isMultiDayForecast)
              
              if (isMultiDayForecast && weatherData.forecast?.daily) {
                // Generate multi-day forecast with visualizations
                const dailyForecast = weatherData.forecast.daily.slice(0, 4) // Get 4 days
                
                response.content = `# 4-Day Weather Forecast for Field "${fieldName}"

## Field Information
- **Name**: ${fieldName}
- **Area**: ${fieldArea}
- **Location**: ${weatherData.location?.latitude?.toFixed(3)}, ${weatherData.location?.longitude?.toFixed(3)}

## 4-Day Forecast Summary

\`\`\`json
{
  "type": "table",
  "title": "4-Day Weather Forecast",
  "data": [
    {
      "Day": "Today",
      "High/Low (°C)": "${current?.temperature}° / ${current?.temperature}°",
      "Weather": "${current?.weatherCondition}",
      "Precipitation (mm)": "${current?.precipitation || 0}",
      "Wind (km/h)": "${current?.windSpeed}",
      "Humidity (%)": "${current?.humidity}"
         }${dailyForecast.map((day: any, index: number) => `,
     {
       "Day": "Day ${index + 1}",
      "High/Low (°C)": "${day.maxTemp || 'N/A'}° / ${day.minTemp || 'N/A'}°",
      "Weather": "${day.weatherCondition || 'Clear'}",
      "Precipitation (mm)": "${day.precipitation || 0}",
      "Wind (km/h)": "${day.windSpeed || 'N/A'}",
      "Humidity (%)": "N/A"
    }`).join('')}
  ]
}
\`\`\`

\`\`\`json
{
  "type": "line",
  "title": "Temperature Trend (4 Days)",
  "data": [
    {
      "day": "Today",
      "high": ${current?.temperature || 0},
             "low": ${current?.temperature || 0}
     }${dailyForecast.map((day: any, index: number) => `,
     {
       "day": "Day ${index + 1}",
       "high": ${day.maxTemp || 0},
      "low": ${day.minTemp || 0}
    }`).join('')}
  ],
  "xAxis": "day",
  "yAxis": "high",
  "lines": [
    {"key": "high", "color": "#ff6b6b", "label": "High °C"},
    {"key": "low", "color": "#4ecdc4", "label": "Low °C"}
  ]
}
\`\`\`

\`\`\`json
{
  "type": "bar",
  "title": "Precipitation Forecast (4 Days)",
  "data": [
    {
      "day": "Today",
             "precipitation": ${current?.precipitation || 0}
     }${dailyForecast.map((day: any, index: number) => `,
     {
       "day": "Day ${index + 1}",
       "precipitation": ${day.precipitation || 0}
    }`).join('')}
  ],
  "xAxis": "day",
  "yAxis": "precipitation",
  "color": "#45b7d1"
}
\`\`\`

## Agricultural Recommendations
${agriculture ? `- **Soil Temperature**: ${agriculture.soilTemperature?.surface}°C (surface), ${agriculture.soilTemperature?.depth6cm}°C (6cm depth)
- **Soil Moisture**: ${agriculture.soilMoisture?.surface?.toFixed(3)} (surface)
- **Spraying Conditions**: ${agriculture.sprayConditions?.suitable ? 'Currently suitable' : 'Currently not suitable'}` : 'Agricultural data not available'}

## Planning Recommendations
Based on the 4-day forecast for your ${fieldArea} field:
- **Today**: ${current?.weatherCondition?.toLowerCase()}, ${current?.temperature}°C
- **Best Days for Field Work**: ${dailyForecast.filter((day: any) => (day.precipitation || 0) < 2).length > 0 ? 'Days with low precipitation' : 'Monitor weather closely'}
- **Irrigation Planning**: ${dailyForecast.some((day: any) => (day.precipitation || 0) > 5) ? 'Rain expected - reduce irrigation' : 'Consider irrigation needs'}
- **Spray Applications**: Plan for days with low wind and no precipitation

*4-day weather forecast provided by AgMCP Weather Service*`
              } else {
                // Generate current weather report
                response.content = `# Weather Report for Field "${fieldName}"

## Field Information
- **Name**: ${fieldName}
- **Area**: ${fieldArea}
- **Location**: ${weatherData.location?.latitude?.toFixed(3)}, ${weatherData.location?.longitude?.toFixed(3)}

## Current Weather Conditions
- **Temperature**: ${current?.temperature}°C
- **Weather**: ${current?.weatherCondition}
- **Humidity**: ${current?.humidity}%
- **Wind**: ${current?.windSpeed} km/h from ${current?.windDirection}°
- **Pressure**: ${current?.pressure} hPa
- **Precipitation**: ${current?.precipitation} mm

## Tomorrow's Forecast
${forecast ? `- **High/Low**: ${forecast.temperatureMax || forecast.temperature2mMax}°C / ${forecast.temperatureMin || forecast.temperature2mMin}°C
- **Precipitation**: ${forecast.precipitationSum || forecast.precipitationSum || 0} mm (${forecast.precipitationProbabilityMax || forecast.precipitationProbabilityMean || 0}% chance)
- **Wind**: Up to ${forecast.windSpeedMax || forecast.windSpeed10mMax || 'N/A'} km/h` : 'Forecast data not available'}

## Agricultural Conditions
${agriculture ? `- **Soil Temperature**: ${agriculture.soilTemperature?.surface}°C (surface), ${agriculture.soilTemperature?.depth6cm}°C (6cm depth)
- **Soil Moisture**: ${agriculture.soilMoisture?.surface?.toFixed(3)} (surface)
- **Evapotranspiration**: ${agriculture.evapotranspiration} mm
- **UV Index**: ${agriculture.uvIndex}
- **Spraying Conditions**: ${agriculture.sprayConditions?.suitable ? 'Suitable' : 'Not suitable'}` : 'Agricultural data not available'}

## Recommendations
Based on the current weather conditions for your ${fieldArea} field:
- Current conditions are ${current?.weatherCondition?.toLowerCase()}
- ${agriculture?.sprayConditions?.suitable ? 'Good conditions for spraying operations' : 'Consider waiting for better spraying conditions'}
- Monitor soil moisture levels for irrigation planning
- ${forecast?.precipitationSum > 5 ? 'Significant rain expected tomorrow - plan field operations accordingly' : 'Dry conditions expected - consider irrigation needs'}

*Weather data provided by AgMCP Weather Service*`
              }

              console.log('✅ Generated fallback weather response:', response.content.length, 'characters')
            }
          }
        }
      }
    }

    // 🤔 REASONING VALIDATION SYSTEM (Optional)
    const enableReasoning = process.env.ENABLE_REASONING_VALIDATION === 'true'
    
    if (enableReasoning) {
      console.log('🤔 Starting reasoning validation...')
      const validation = await llmService.validateResponse(
        originalUserQuery,
        response,
        functionResults
      )

      // Add reasoning to response metadata
      response.reasoning = validation

      // If validation fails and confidence is low, attempt correction
      if (!validation.isValid && validation.confidence < 0.7) {
        console.log('🔄 Response validation failed, attempting correction...')
        console.log('❌ Validation issue:', validation.explanation)
        
        try {
          const correctedResponse = await llmService.generateCorrectedResponse(
            chatMessages,
            response,
            validation,
            {
              maxTokens: options?.maxTokens || 4000,
              temperature: options?.temperature || 0.7,
              systemPrompt: systemPrompt,
              enableFunctions: enableFunctions,
            }
          )
          
          // Keep original function calls and results but use corrected content
          correctedResponse.functionCalls = response.functionCalls
          correctedResponse.reasoning = {
            ...validation,
            explanation: `Original response corrected: ${validation.explanation}`
          }
          
          response = correctedResponse
          console.log('✅ Response corrected successfully')
        } catch (correctionError) {
          console.error('❌ Failed to generate correction:', correctionError)
          // Keep original response if correction fails
          console.log('⚠️ Using original response despite validation failure')
        }
      } else if (validation.isValid) {
        console.log('✅ Response validation passed:', validation.explanation)
      } else {
        console.log('⚠️ Response validation failed but confidence too high for auto-correction:', validation.confidence)
      }
    } else {
      console.log('⚠️ Reasoning validation disabled')
    }

    // Parse potential visualization data from LLM response
    console.log('🔍 Raw LLM response content:', response.content)
    
    // Use the new visualization parser - extract visualizations and clean content
    const { visualizations, cleanedContent } = parseVisualizationsFromResponse(response.content, functionResults)
    const messageContent = cleanedContent
    
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