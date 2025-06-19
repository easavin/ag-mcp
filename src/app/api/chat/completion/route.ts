import { NextRequest, NextResponse } from 'next/server'
import { getLLMService, AGRICULTURAL_SYSTEM_PROMPT, ChatMessage, FunctionCall } from '@/lib/llm'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { mcpToolExecutor, ALL_MCP_TOOLS } from '@/lib/mcp-tools'
import { JohnDeereConnectionError, JohnDeereRCAError, JohnDeerePermissionError } from '@/lib/johndeere-api'

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
    const { sessionId, messages, options, currentDataSource } = await request.json()
    console.log('📝 Request data:', { sessionId, messageCount: messages?.length, options, currentDataSource })

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

    // Prepare context-aware system prompt based on data source selection
    let systemPrompt = AGRICULTURAL_SYSTEM_PROMPT
    
    if (currentDataSource) {
      // User has selected a data source - immediately call functions for data requests
      systemPrompt += `\n\n**IMPORTANT CONTEXT:**
The user has selected "${currentDataSource}" as their active data source. When they ask about farm data (fields, equipment, organizations, operations), you MUST immediately use the available John Deere API functions to fetch their data.

**REQUIRED ACTIONS for John Deere data requests:**
- For field questions (count, list, details): Call getFields() - it will auto-fetch organization
- For equipment/machine questions (count, list, details): Call getEquipment() - it will auto-fetch organization  
- For operations questions (recent activity, field operations): Call getOperations() - it will auto-fetch organization
- For comprehensive data: Call getComprehensiveData() with the organization ID
- ALWAYS call the appropriate function when user asks about farm data

**SPECIAL REPROCESSING CONTEXT:**
If you see previous messages in the conversation where the user asked about farm data (fields, equipment, machines, operations) but you couldn't access the data due to no data source being selected, you should now immediately process those requests with the current data source.

Look for patterns like:
- "my machines", "my equipment", "how many machines"
- "my fields", "how many fields"  
- "my operations", "recent operations"
- Any previous farm data questions

**EXAMPLES:** 
- User: "how many fields do I have" → IMMEDIATELY call getFields() → count the returned fields
- User: "how many machines do I have" → IMMEDIATELY call getEquipment() → count the returned equipment
- User: "tell me about my machines" → IMMEDIATELY call getEquipment() → provide detailed equipment information
- User: "operations on field X" → IMMEDIATELY call getOperations() → show the operations data

**DO:**
- Automatically fetch the organization first, then use its ID for subsequent calls
- Provide specific data-driven responses based on actual API results
- Process any previous farm data questions in the conversation now that you have data source access

**DO NOT:**
- Give generic responses without calling functions
- Ask the user to provide organization IDs manually
- Ignore previous farm data questions in the conversation

Current active data source: ${currentDataSource}`
    } else {
      // No data source selected - offer selection for data requests
      systemPrompt += `\n\n**IMPORTANT CONTEXT:**
The user has NOT selected a data source yet. When they ask about specific farm data (fields, equipment, organizations, operations), you should offer them data source selection options in a helpful way.

**REQUIRED ACTIONS for farm data requests:**
- For questions about "my fields", "my equipment", "my operations", etc. → Offer data source selection
- For general farming advice → Answer directly without data source selection
- For MCP tool actions (scheduling, recommendations) → Execute directly without data source selection

**EXAMPLES:** 
- User: "how many fields do I have" → "I can help you check your field count! To access your field data, please select a data source. You can connect to your John Deere Operations Center to view your fields, equipment, and operations data."
- User: "what's the best time to plant corn" → Answer directly with farming advice
- User: "schedule planting for next week" → Use MCP tools directly

**DATA SOURCE SELECTION RESPONSE FORMAT:**
When user asks for farm data without selecting a source, respond with:
"I can help you with [their request]! To access your farm data, you'll need to select a data source first. 

**Available Data Sources:**
🚜 **John Deere Operations Center** - Access your fields, equipment, operations, and farm management data

You can select a data source using the dropdown in the top-left corner of the interface, or let me know which data source you'd like to use."

**DO:**
- Offer helpful data source selection for specific data requests
- Provide general farming advice without requiring data source selection
- Use MCP tools for farming actions without requiring data source selection
- Be encouraging and helpful about the data source selection process

**DO NOT:**
- Call John Deere API functions when no data source is selected
- Give generic responses without explaining the data source selection`
    }

    // Generate completion with appropriate function calling
    console.log('🎯 Generating LLM completion...')
    console.log('📋 System prompt:', systemPrompt.substring(0, 200) + '...')
    console.log('📝 Chat messages:', chatMessages.map(m => ({ role: m.role, contentLength: m.content.length })))
    console.log('🔗 Current data source:', currentDataSource || 'none')
    
    // Enable functions based on data source selection
    // - If data source selected: enable all functions (John Deere + MCP tools)
    // - If no data source: enable only MCP tools (no John Deere functions)
    const enableFunctions = true // Always enable some functions (at least MCP tools)
    
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

    // Handle function calls if present
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log('🔧 Function calls detected:', response.functionCalls.map(fc => fc.name))
      
      // Filter out John Deere functions if no data source is selected
      const johnDeereFunctions = ['getOrganizations', 'getFields', 'getEquipment', 'getOperations', 'getComprehensiveData']
      let validFunctionCalls = response.functionCalls
      
      if (!currentDataSource) {
        const filteredCalls = response.functionCalls.filter(fc => !johnDeereFunctions.includes(fc.name))
        if (filteredCalls.length !== response.functionCalls.length) {
          console.log('🚫 Filtered out John Deere functions (no data source selected)')
          console.log('🔧 Original functions:', response.functionCalls.map(fc => fc.name))
          console.log('🔧 Filtered functions:', filteredCalls.map(fc => fc.name))
        }
        validFunctionCalls = filteredCalls
      }
      
      if (validFunctionCalls.length === 0) {
        console.log('⚠️  No valid function calls to execute')
      } else {
        // Execute valid function calls
        console.log('⚡ Executing function calls...')
        const functionResults = await Promise.all(
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
        
        // Prepare enhanced system prompt based on whether there are connection errors
        let finalSystemPrompt = systemPrompt
        if (hasConnectionErrors) {
          finalSystemPrompt += `\n\n**IMPORTANT: Some function calls encountered connection/permission errors. Use the userMessage field from the error results to provide helpful guidance to the user. DO NOT show technical error details - only provide user-friendly explanations and guidance.**`
        } else {
          finalSystemPrompt += `\n\n**IMPORTANT: You have just received function results with actual farm data. Use this data to provide a specific, detailed response to the user's question. DO NOT give generic responses.**`
        }
        
        response = await llmService.generateChatCompletion(messagesWithFunctions, {
          maxTokens: options?.maxTokens || 4000,
          temperature: options?.temperature || 0.7,
          systemPrompt: finalSystemPrompt,
          enableFunctions: false, // Disable functions for final response
        })

        // Restore the original function calls to the response
        response.functionCalls = originalFunctionCalls

        console.log('✅ Final response generated:', {
          model: response.model,
          contentLength: response.content?.length
        })
      }
    }

    // Save assistant message to database
    console.log('💾 Saving message to database...')
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId: sessionId,
        role: 'assistant',
        content: response.content,
        metadata: {
          model: response.model,
          usage: response.usage,
          functionCalls: response.functionCalls ? JSON.parse(JSON.stringify(response.functionCalls)) : [],
        },
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