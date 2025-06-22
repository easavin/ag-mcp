import { NextRequest, NextResponse } from 'next/server'
import { getLLMService } from '@/lib/llm'
import { AGRICULTURAL_SYSTEM_PROMPT } from '@/lib/llm'
import { ALL_MCP_TOOLS, mcpToolExecutor } from '@/lib/mcp-tools'
import { getJohnDeereClient } from '@/lib/johndeere-client'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
  functionCall?: any
  functionResult?: any
}

interface FunctionCall {
  name: string
  arguments: any
}

// Function execution logic for testing (simplified version without authentication)
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
  
  // For John Deere functions in test mode, return mock data or connection error
  console.log(`⚠️ John Deere function ${name} called in test mode - returning mock response`)
  return {
    success: false,
    error: 'connection_required',
    message: 'John Deere connection required for this function',
    functionName: name,
    arguments: args
  }
}

// TEST ENDPOINT - NO AUTHENTICATION REQUIRED
// This endpoint is for regression testing only and should not be used in production
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test chat completion request started')
    
    const { messages, selectedDataSources, options } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    console.log('📝 Test request data:', {
      messageCount: messages.length,
      selectedDataSources,
      options
    })

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

    // Convert messages to LLM format
    const chatMessages: ChatMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      fileAttachments: msg.fileAttachments || [],
    }))

    console.log('💬 Chat messages prepared:', chatMessages.length)

    // Check if John Deere and Weather are selected as data sources
    const hasJohnDeere = selectedDataSources && selectedDataSources.includes('johndeere')
    const hasWeather = selectedDataSources && selectedDataSources.includes('weather')

    // Prepare context-aware system prompt based on data source selection
    let systemPrompt = AGRICULTURAL_SYSTEM_PROMPT
    
    if (hasJohnDeere) {
      systemPrompt += `\n\n**IMPORTANT CONTEXT:**
The user has John Deere connected as an active data source. When they ask about farm data (fields, equipment, organizations, operations), you MUST immediately use the available John Deere API functions to fetch their data.

**REQUIRED ACTIONS for John Deere data requests:**
- For field questions (count, list, details): Call getFields() - it will auto-fetch organization
- For equipment/machine questions (count, list, details): Call getEquipment() - it will auto-fetch organization  
- For operations questions (recent activity, field operations): Call getOperations() - it will auto-fetch organization
- For comprehensive data: Call getComprehensiveData() with the organization ID
- ALWAYS call the appropriate function when user asks about farm data

Active data sources: ${selectedDataSources?.join(', ') || 'none'}`
    }

    // Generate completion with appropriate function calling
    console.log('🎯 Generating LLM completion...')
    console.log('📋 System prompt length:', systemPrompt.length)
    console.log('📝 Chat messages:', chatMessages.map(m => ({ role: m.role, contentLength: m.content.length })))
    console.log('🔗 Selected data sources:', selectedDataSources || 'none')
    
    // Enable functions for testing
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

    // Handle function calls if present
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log('🔧 Function calls detected:', response.functionCalls.map(fc => fc.name))
      
      // Filter out functions based on selected data sources
      const johnDeereFunctions = ['getOrganizations', 'getFields', 'getEquipment', 'getOperations', 'getComprehensiveData', 'scheduleFieldOperation', 'getFieldRecommendations', 'updateFieldStatus', 'scheduleEquipmentMaintenance', 'getEquipmentAlerts', 'updateEquipmentStatus', 'get_equipment_details', 'get_field_operation_history', 'list_john_deere_files', 'get_field_boundary']
      const euCommissionFunctions = ['getEUMarketPrices', 'getEUProductionData', 'getEUTradeData', 'getEUMarketDashboard']
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
      
      // Filter out EU Commission functions if EU Commission is not selected
      const hasEuCommission = selectedDataSources && selectedDataSources.includes('eu-commission')
      if (!hasEuCommission) {
        const filteredCalls = validFunctionCalls.filter(fc => !euCommissionFunctions.includes(fc.name))
        if (filteredCalls.length !== validFunctionCalls.length) {
          console.log('🚫 Filtered out EU Commission functions (EU Commission not selected)')
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

        // Check if we need to enable functions for multi-step workflows
        const needsMultiStepFunctions = originalFunctionCalls.some(fc => 
          fc.name === 'get_field_boundary' || fc.name === 'getFields'
        ) && functionResults.some(result => 
          result.result?.success && (result.result?.data || result.result?.fields)
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
        
        // Prepare enhanced system prompt for final response
        let finalSystemPrompt = systemPrompt
        if (needsMultiStepFunctions) {
          finalSystemPrompt += `\n\n**IMPORTANT: You have just received field/boundary data. If the user asked about weather for a specific field, you MUST now extract coordinates from the boundary data and call getCurrentWeather or getWeatherForecast. Complete the full workflow - do not stop after getting boundary data.**`
        } else {
          finalSystemPrompt += `\n\n**IMPORTANT: You have just received function results with actual farm data. Use this data to provide a specific, detailed response to the user's question. DO NOT give generic responses.**`
        }
        
        response = await llmService.generateChatCompletion(messagesWithFunctions, {
          maxTokens: options?.maxTokens || 4000,
          temperature: options?.temperature || 0.7,
          systemPrompt: finalSystemPrompt,
          enableFunctions: needsMultiStepFunctions, // Enable functions for multi-step workflows
        })

        // Restore the original function calls to the response
        response.functionCalls = originalFunctionCalls

        console.log('✅ Final response generated:', {
          model: response.model,
          contentLength: response.content?.length
        })
      }
    }

    console.log('✅ Test chat completion successful')

    return NextResponse.json({
      message: {
        id: 'test-message-' + Date.now(),
        role: 'assistant',
        content: response.content,
        createdAt: new Date().toISOString(),
        metadata: {
          model: response.model,
          usage: response.usage,
          functionCalls: response.functionCalls ? JSON.parse(JSON.stringify(response.functionCalls)) : [],
        },
      },
      usage: response.usage,
      model: response.model,
    })
  } catch (error) {
    console.error('❌ Error in test chat completion:', error)
    
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