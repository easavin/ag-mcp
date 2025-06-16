import { NextRequest, NextResponse } from 'next/server'
import { getLLMService, AGRICULTURAL_SYSTEM_PROMPT, ChatMessage, FunctionCall } from '@/lib/llm'
import { prisma } from '@/lib/prisma'
import { mcpToolExecutor, ALL_MCP_TOOLS } from '@/lib/mcp-tools'

// Function to execute John Deere API calls
async function executeJohnDeereFunction(functionCall: FunctionCall): Promise<any> {
  const { name, arguments: args } = functionCall
  
  console.log(`🔧 Executing John Deere function: ${name}`, args)
  
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    let url: string
    
    switch (name) {
      case 'getOrganizations':
        url = `${baseUrl}/api/johndeere/organizations`
        break
      case 'getFields':
        if (!args.orgId) {
          // Auto-fetch organization first
          console.log('🔄 No orgId provided, fetching organizations first...')
          const orgResponse = await fetch(`${baseUrl}/api/johndeere/organizations`)
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
          const orgResponse = await fetch(`${baseUrl}/api/johndeere/organizations`)
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
          const orgResponse = await fetch(`${baseUrl}/api/johndeere/organizations`)
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
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`📡 API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API call failed: ${response.status} - ${errorText}`)
      throw new Error(`API call failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ John Deere function ${name} completed successfully`, { dataKeys: Object.keys(data) })
    
    return data
  } catch (error) {
    console.error(`❌ Error executing John Deere function ${name}:`, error)
    return { 
      error: `Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      functionName: name,
      arguments: args
    }
  }
}

// Unified function executor that handles both John Deere functions and MCP tools
async function executeFunction(functionCall: FunctionCall): Promise<any> {
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
  return executeJohnDeereFunction(functionCall)
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

    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

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

    // Prepare context-aware system prompt
    let systemPrompt = AGRICULTURAL_SYSTEM_PROMPT
    if (currentDataSource) {
      systemPrompt += `\n\n**IMPORTANT CONTEXT:**
The user has already selected "${currentDataSource}" as their active data source. When they ask about farm data (fields, equipment, organizations, operations), you MUST immediately use the available John Deere API functions to fetch their data.

**REQUIRED ACTIONS for John Deere data requests:**
- For field questions (count, list, details): Call getFields() - it will auto-fetch organization
- For equipment/machine questions (count, list, details): Call getEquipment() - it will auto-fetch organization  
- For operations questions (recent activity, field operations): Call getOperations() - it will auto-fetch organization
- For comprehensive data: Call getComprehensiveData() with the organization ID
- ALWAYS call the appropriate function when user asks about farm data

**EXAMPLES:** 
- User: "how many fields do I have" → IMMEDIATELY call getFields() → count the returned fields
- User: "how many machines do I have" → IMMEDIATELY call getEquipment() → count the returned equipment
- User: "operations on field X" → IMMEDIATELY call getOperations() → show the operations data

**DO NOT:**
- Show data source selection options
- Give generic responses without calling functions
- Ask the user to provide organization IDs manually

**DO:**
- Automatically fetch the organization first, then use its ID for subsequent calls
- Provide specific data-driven responses based on actual API results

Current active data source: ${currentDataSource}`
    }

    // Generate completion with function calling enabled
    console.log('🎯 Generating LLM completion...')
    console.log('📋 System prompt:', systemPrompt.substring(0, 200) + '...')
    console.log('📝 Chat messages:', chatMessages.map(m => ({ role: m.role, contentLength: m.content.length })))
    
    let response = await llmService.generateChatCompletion(chatMessages, {
      maxTokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.7,
      systemPrompt: systemPrompt,
      enableFunctions: true, // Enable both John Deere functions and MCP tools
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
      
      // Execute all function calls (both John Deere and MCP tools)
      console.log('⚡ Executing function calls...')
      const functionResults = await Promise.all(
        response.functionCalls.map(async (functionCall, index) => {
          console.log(`🔧 Executing function ${index + 1}/${response.functionCalls!.length}: ${functionCall.name}`)
          const result = await executeFunction(functionCall)
          return {
            name: functionCall.name,
            result,
            error: result.error ? result.error : undefined
          }
        })
      )

      console.log('✅ All function calls completed:', functionResults.map(fr => ({ name: fr.name, hasError: !!fr.error })))

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
      // Get final response with function results (use the same context-aware system prompt)
      const finalSystemPrompt = systemPrompt + `\n\n**IMPORTANT: You have just received function results with actual farm data. Use this data to provide a specific, detailed response to the user's question. DO NOT give generic responses.**`
      
      response = await llmService.generateChatCompletion(messagesWithFunctions, {
        maxTokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        systemPrompt: finalSystemPrompt,
        enableFunctions: false, // Disable functions for final response
      })

      console.log('✅ Final response generated:', {
        model: response.model,
        contentLength: response.content?.length
      })
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