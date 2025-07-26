import OpenAI from 'openai'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  fileAttachments?: string[]
}

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  functionCalls?: {
    name: string
    arguments: any
  }[]
  reasoning?: {
    isValid: boolean
    confidence: number
    explanation: string
    suggestions?: string[]
  }
}

export interface LLMFunction {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface FunctionCall {
  name: string
  arguments: any
}

export class LLMService {
  private openai: OpenAI | null = null

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      console.log('✅ OpenAI initialized')
    } else {
      console.warn('⚠️ OpenAI API key not found')
      throw new Error('OpenAI API key is required')
    }
  }

  getAvailableProviders(): string[] {
    const providers = []
    if (this.openai) providers.push('openai')
    return providers
  }

  getConfig() {
    return {
      preferredProvider: 'openai',
      availableProviders: this.getAvailableProviders(),
    }
  }

  /**
   * Generate chat completion using OpenAI
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    options?: {
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
      enableFunctions?: boolean
      functions?: LLMFunction[]
    }
  ): Promise<LLMResponse> {
    const maxTokens = options?.maxTokens || 4000
    const temperature = options?.temperature || 0.7
    const systemPrompt = options?.systemPrompt
    const enableFunctions = options?.enableFunctions || false
    const functions = options?.functions || []

    console.log('🤖 Generating chat completion...', {
      provider: 'openai',
      messageCount: messages.length,
      maxTokens,
      temperature,
      enableFunctions,
      functionCount: functions.length
    })

    if (!this.openai) {
      throw new Error('OpenAI not initialized')
    }

    return await this.generateOpenAICompletion(messages, {
      maxTokens,
      temperature,
      systemPrompt,
      enableFunctions,
      functions
    })
  }

  /**
   * Generate completion using OpenAI
   */
  private async generateOpenAICompletion(
    messages: ChatMessage[],
    options: {
      maxTokens: number
      temperature: number
      systemPrompt?: string
      enableFunctions: boolean
      functions: LLMFunction[]
    }
  ): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized')
    }

    // Prepare messages for OpenAI format
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

    // Add system prompt if provided
    if (options.systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: options.systemPrompt
      })
    }

    // Add chat messages
    messages.forEach(msg => {
      openaiMessages.push({
        role: msg.role,
        content: msg.content
      })
    })

    // Prepare function calling if enabled
    const completionOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: openaiMessages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }

    // Add functions if enabled and available
    if (options.enableFunctions && options.functions.length > 0) {
      completionOptions.tools = options.functions.map(func => ({
        type: 'function',
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters
        }
      }))
      completionOptions.tool_choice = 'auto'
    }

    console.log('🤖 OpenAI request:', {
      model: completionOptions.model,
      messageCount: openaiMessages.length,
      toolCount: completionOptions.tools?.length || 0
    })

    const response = await this.openai.chat.completions.create(completionOptions)

    const choice = response.choices[0]
    if (!choice) {
      throw new Error('No response from OpenAI')
    }

    // Extract function calls if present
    const functionCalls: { name: string; arguments: any }[] = []
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type === 'function') {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            functionCalls.push({
              name: toolCall.function.name,
              arguments: args
            })
          } catch (error) {
            console.warn('Failed to parse function arguments:', toolCall.function.arguments)
          }
        }
      }
    }

    return {
      content: choice.message.content || '',
      model: response.model,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      } : undefined,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined
    }
  }

  /**
   * Validate LLM response quality and appropriateness
   */
  async validateResponse(
    userQuery: string,
    llmResponse: LLMResponse,
    functionResults: any[]
  ): Promise<{ isValid: boolean; confidence: number; explanation: string; suggestions?: string[] }> {
    console.log('🤔 Validating LLM response against user query...')

    const validationPrompt = `**INTERNAL VALIDATION TASK - DO NOT INCLUDE THIS CONTENT IN USER RESPONSES**

You are validating an AI response for quality. This validation is INTERNAL ONLY and should NEVER appear in user-facing responses.

**USER QUERY:** "${userQuery}"

**LLM RESPONSE:** "${llmResponse.content}"

**FUNCTION CALLS:** ${llmResponse.functionCalls ? 
      JSON.stringify(llmResponse.functionCalls.map(fc => ({ name: fc.name, args: fc.arguments })), null, 2) : 'None'}

**FUNCTION RESULTS:** ${functionResults ? JSON.stringify(functionResults, null, 2) : 'None'}

**CRITICAL: This is an internal validation check. The user should NEVER see validation text, confidence scores, or technical explanations. The actual response to the user should only contain relevant agricultural information.**

**VALIDATION TASK:**
1. Does the LLM response directly answer what the user asked for?
2. Are the function calls appropriate for the user's query?
3. Is the data presented in the most useful format for the user?
4. Are there any obvious mismatches between query intent and response?
5. Does the response avoid technical jargon and validation information?

**CRITICAL EXAMPLES:**
- User asks for "price per ton of corn" → Should call getEUMarketPrices, NOT getEUProductionData
- User asks for "weather forecast" → Should include precipitation data for farmers
- User asks for "monthly data" → Should provide time-series information
- Response should NEVER include "Response Validation X% confidence" or similar technical text

**RESPOND WITH JSON ONLY:**
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation of validation result (internal use only)",
  "suggestions": ["suggestion1", "suggestion2"] // Only if isValid is false
}

**VALIDATION RESULT:**`

    try {
      const validationResponse = await this.generateChatCompletion([{
        role: 'user',
        content: validationPrompt,
        fileAttachments: []
      }], {
        maxTokens: 300,
        temperature: 0.2, // Low temperature for consistent validation
        enableFunctions: false,
        systemPrompt: "You are an internal validation system. Your output is for system use only and should never be shown to end users. Respond only with the requested JSON format. Never include validation text or confidence scores in user responses."
      })

      // Parse JSON response
      const jsonMatch = validationResponse.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0])
        console.log('✅ Validation completed:', validation)
        return validation
      } else {
        console.warn('⚠️ Could not parse validation JSON, assuming valid')
        return {
          isValid: true,
          confidence: 0.5,
          explanation: 'Validation parsing failed, assuming response is valid'
        }
      }
    } catch (error) {
      console.error('❌ Validation failed:', error)
      return {
        isValid: true,
        confidence: 0.5,
        explanation: 'Validation system error, assuming response is valid'
      }
    }
  }

  /**
   * Generate a corrected response based on validation feedback
   */
  async generateCorrectedResponse(
    originalMessages: ChatMessage[],
    originalResponse: LLMResponse,
    validation: { isValid: boolean; confidence: number; explanation: string; suggestions?: string[] },
    options?: {
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
      enableFunctions?: boolean
    }
  ): Promise<LLMResponse> {
    console.log('🔄 Generating corrected response based on validation feedback...')
    
    const correctionPrompt = `**CORRECTION REQUIRED**

The previous response did not fully align with user intent. Here's the validation feedback:

**VALIDATION RESULT:**
- Valid: ${validation.isValid}
- Confidence: ${validation.confidence}
- Issue: ${validation.explanation}
${validation.suggestions ? `\n**SUGGESTIONS:**\n${validation.suggestions.map(s => `- ${s}`).join('\n')}` : ''}

**INSTRUCTIONS:**
1. Review the original user query carefully
2. Consider the validation feedback
3. Generate a corrected response that better addresses the user's actual intent
4. If needed, make different function calls that are more appropriate
5. Present the information in the most useful format for the user
6. NEVER include validation text, confidence scores, or technical system information

**ORIGINAL USER QUERY:** "${originalMessages[originalMessages.length - 1]?.content}"

**PROVIDE A BETTER RESPONSE:**`

    // Add the correction prompt as a new message
    const correctionMessages: ChatMessage[] = [
      ...originalMessages,
      {
        role: 'assistant',
        content: originalResponse.content,
        fileAttachments: []
      },
      {
        role: 'user',
        content: correctionPrompt,
        fileAttachments: []
      }
    ]

    return await this.generateChatCompletion(correctionMessages, {
      ...options,
      systemPrompt: (options?.systemPrompt || '') + '\n\n**IMPORTANT: This is a correction attempt. Focus on addressing the user\'s actual intent based on the validation feedback provided. Never include validation text or technical system information in your response.**'
    })
  }
}

// Singleton instance
let llmService: LLMService | null = null

export function getLLMService(): LLMService {
  if (!llmService) {
    llmService = new LLMService()
  }
  return llmService
}

// Agricultural-specific system prompt with John Deere integration and MCP tools
export const AGRICULTURAL_SYSTEM_PROMPT = `You are an AI assistant specialized in precision agriculture and farming operations with access to John Deere APIs, weather data, EU agricultural market data, and farming tools.

## **🚨 ABSOLUTE RULES FOR USER RESPONSES:**

**FORBIDDEN CONTENT - NEVER include in responses:**
- ❌ "Response Validation" followed by percentages
- ❌ "X% confidence" or any confidence scores  
- ❌ "The LLM response accurately..." or validation explanations
- ❌ Technical system information or internal processing details
- ❌ Function names like "getCurrentWeather()" in user-facing text
- ❌ API endpoints, server names, or technical implementation details
- ❌ Internal validation results or reasoning explanations
- ❌ Any text about "validation passed" or "confidence levels"

**REQUIRED CONTENT - Always include:**
- ✅ Direct, clear answers to the user's agricultural questions
- ✅ Specific data from function calls when available
- ✅ Actionable farming recommendations
- ✅ User-friendly explanations without technical jargon
- ✅ Clear next steps or suggestions for the farmer

## **🚨 CRITICAL FUNCTION SELECTION RULES:**

**PRICE QUERIES → getEUMarketPrices**
- "price per ton" → getEUMarketPrices
- "cost of corn" → getEUMarketPrices  
- "monthly prices" → getEUMarketPrices
- "price over the year" → getEUMarketPrices
- "what does X cost" → getEUMarketPrices

**PRODUCTION QUERIES → getEUProductionData**
- "how much was produced" → getEUProductionData
- "production volume" → getEUProductionData
- "harvest amounts" → getEUProductionData

**❌ NEVER use getEUProductionData for price questions**
**❌ NEVER use getEUMarketPrices for production volume questions**

## **🚨 DATA RETRIEVAL RULES:**

**I am a data assistant, not an agronomist. I provide relevant agricultural data and let you make the decisions.**

**WEATHER QUERIES:**
- Always call weather functions for current/forecast data
- Never guess or estimate weather conditions
- Include agricultural relevance (spray conditions, harvest timing, etc.)

**FIELD QUERIES:**
- Always use field boundary data for location-specific questions
- Combine field data with weather when relevant
- Provide specific field-based recommendations

**MARKET QUERIES:**
- Use correct function: prices vs production data
- Always specify units (€/ton, hectares, etc.)
- Include trend information when available

**EQUIPMENT QUERIES:**
- Call equipment functions for machinery information
- Link equipment capabilities to field operations
- Consider seasonal maintenance and operation windows

## **COMMUNICATION STYLE:**

**RESPONSE STYLE:**
- Write like a knowledgeable farm advisor, not a technical system
- Focus on practical farming value and actionable insights
- Use simple, clear language that farmers can understand
- Present data in contexts that help with farming decisions

**EXAMPLE OF GOOD RESPONSE:**
"Based on current market data, corn prices in Spain are €245 per ton this month. This represents a 3% increase from last month, making it a favorable time to sell if you're ready for harvest."

**EXAMPLE OF BAD RESPONSE:**
"Response Validation 95% confidence. The LLM response accurately provides current pricing data. Based on getEUMarketPrices() function results..."

## **WEATHER INTEGRATION:**
- For harvest timing: Include precipitation forecasts and field conditions
- For spraying: Check wind speed, humidity, and rain forecasts
- For planting: Consider soil temperature and moisture outlook
- Always specify the time horizon (today, this week, next 7 days)

## **HELPFUL ENGAGEMENT:**
- Ask clarifying questions when intent is unclear:
  - "Are you looking for current conditions or a forecast?"
  - "Would you like me to check spray conditions for today?"
  - "Do you want weather data combined with your field information?"

## **TECHNICAL RULES:**
- **Never mention function names** like "getCurrentWeather()" in responses
- **Never show API endpoints or technical details**
- **Always provide user-friendly explanations**
- **Focus on farming value, not technical implementation**
- **Never output code or programming syntax**
- **Perform calculations directly, not as function calls**

## **FORBIDDEN PHRASES:**
- "Let me fetch..." (without actually fetching)
- "You probably have..." (no assumptions)
- "Based on typical farms..." (only their specific data)
- "I'll check..." (unless you actually call the function)
- Any specific numbers without function verification
- Weather estimates without calling weather functions
- Code output like "print(function_name())"
- Trying to call non-existent functions for calculations

## **SUCCESS CRITERIA:**
✅ Every data response is backed by actual function results  
✅ Weather information includes specific agricultural insights  
✅ Multi-source queries combine relevant data intelligently  
✅ No made-up numbers or assumptions  
✅ Clear communication when data is not available  
✅ Helpful suggestions for next steps  
✅ Focus on actionable farming insights  
✅ Unit conversions performed directly with clear explanations  
✅ Mathematical calculations done without function calls  
✅ No technical validation text or confidence scores in responses

Remember: You are a farm advisor using advanced tools, not a technical system showing its work. Keep responses focused on farming value, never on technical validation or system confidence. Accuracy and honesty are more valuable than appearing knowledgeable. If you don't have the data, say so clearly and help the user get the information they need. Always use actual weather and farm data to provide specific, actionable farming advice. For calculations and conversions, work directly with the numbers rather than trying to call functions.`