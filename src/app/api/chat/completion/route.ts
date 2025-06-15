import { NextRequest, NextResponse } from 'next/server'
import { getLLMService, AGRICULTURAL_SYSTEM_PROMPT, ChatMessage, FunctionCall } from '@/lib/llm'
import { prisma } from '@/lib/prisma'

// Function to execute John Deere API calls
async function executeJohnDeereFunction(functionCall: FunctionCall): Promise<any> {
  const { name, arguments: args } = functionCall
  
  try {
    switch (name) {
      case 'getOrganizations':
        const orgResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/johndeere/organizations`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        return await orgResponse.json()

      case 'getFields':
        const fieldsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/johndeere/organizations/${args.orgId}/fields`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        return await fieldsResponse.json()

      case 'getEquipment':
        const equipmentResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/johndeere/organizations/${args.orgId}/equipment`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        return await equipmentResponse.json()

      case 'getOperations':
        const operationsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/johndeere/organizations/${args.orgId}/operations`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        return await operationsResponse.json()

      case 'getComprehensiveData':
        const comprehensiveResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/johndeere/organizations/${args.orgId}/comprehensive`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        return await comprehensiveResponse.json()

      default:
        throw new Error(`Unknown function: ${name}`)
    }
  } catch (error) {
    console.error(`Error executing function ${name}:`, error)
    return { error: `Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, messages, options } = await request.json()

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, messages' },
        { status: 400 }
      )
    }

    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      )
    }

    // Get LLM service
    const llmService = getLLMService()

    // Check available providers
    const providers = llmService.getAvailableProviders()
    if (!providers.gemini && !providers.openai) {
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

    // Generate completion with function calling enabled
    let response = await llmService.generateChatCompletion(chatMessages, {
      maxTokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.7,
      systemPrompt: AGRICULTURAL_SYSTEM_PROMPT,
      enableFunctions: true,
    })

    // Handle function calls if present
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log('Function calls detected:', response.functionCalls)
      
      // Execute all function calls
      const functionResults = await Promise.all(
        response.functionCalls.map(async (functionCall) => {
          const result = await executeJohnDeereFunction(functionCall)
          return {
            name: functionCall.name,
            result,
            error: result.error ? result.error : undefined
          }
        })
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

      // Get final response with function results
      response = await llmService.generateChatCompletion(messagesWithFunctions, {
        maxTokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        systemPrompt: AGRICULTURAL_SYSTEM_PROMPT,
        enableFunctions: false, // Disable functions for final response
      })
    }

    // Save assistant message to database
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
    console.error('Error generating chat completion:', error)
    
    // Return specific error messages for common issues
    if (error instanceof Error) {
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