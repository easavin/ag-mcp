import { NextRequest, NextResponse } from 'next/server'
import { getLLMService, AGRICULTURAL_SYSTEM_PROMPT } from '@/lib/llm'

export async function POST(request: NextRequest) {
  try {
    const { userQuery, llmResponse, functionResults } = await request.json()

    if (!userQuery || !llmResponse) {
      return NextResponse.json(
        { error: 'userQuery and llmResponse are required' },
        { status: 400 }
      )
    }

    console.log('🧪 Testing reasoning validation...')

    const llmService = getLLMService()
    
    // Test the validation system
    const validation = await llmService.validateResponse(
      userQuery,
      { content: llmResponse, functionCalls: [], model: 'debug' },
      functionResults || []
    )

    console.log('✅ Validation result:', validation)

    return NextResponse.json({
      userQuery,
      llmResponse,
      validation,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in reasoning validation test:', error)
    return NextResponse.json(
      { error: 'Failed to test reasoning validation' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'LLM Response Debug Endpoint',
    usage: 'POST with { userQuery, llmResponse, functionResults? } to test reasoning validation',
    example: {
      userQuery: 'what is the price per ton of corn in spain?',
      llmResponse: 'I retrieved EU production data showing corn production volumes.',
      functionResults: [{ name: 'getEUProductionData', result: { data: [] } }]
    }
  })
} 