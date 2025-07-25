import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
  fileAttachments?: {
    filename: string
    fileType: string
    fileSize: number
  }[]
  functionCall?: FunctionCall
  functionResult?: any
}

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  functionCalls?: FunctionCall[]
  reasoning?: {
    isValid: boolean
    confidence: number
    explanation: string
    suggestions?: string[]
  }
}

export interface FunctionCall {
  name: string
  arguments: any
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

interface LLMConfig {
  gemini: {
    apiKey: string
    model: string
  }
  openai: {
    apiKey: string
    model: string
  }
}

// John Deere specific functions
const JOHN_DEERE_FUNCTIONS: LLMFunction[] = [
  {
    name: 'getOrganizations',
    description: 'Get all organizations for the authenticated user',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getFields',
    description: 'Get all fields for an organization. Automatically fetches organization if needed.',
    parameters: {
      type: 'object',
      properties: {
        orgId: {
          type: 'string',
          description: 'Organization ID (optional - will auto-fetch if not provided)'
        }
      },
      required: []
    }
  },
  {
    name: 'getEquipment',
    description: 'Get all equipment/machines for an organization. Automatically fetches organization if needed.',
    parameters: {
      type: 'object',
      properties: {
        orgId: {
          type: 'string',
          description: 'Organization ID (optional - will auto-fetch if not provided)'
        }
      },
      required: []
    }
  },
  {
    name: 'getOperations',
    description: 'Get all field operations for the user. Automatically fetches organization if needed.',
    parameters: {
      type: 'object',
      properties: {
        orgId: {
          type: 'string',
          description: 'Organization ID (optional - will auto-fetch if not provided)'
        }
      },
      required: []
    }
  },
  {
    name: 'getComprehensiveData',
    description: 'Get comprehensive farm data including fields, equipment, and operations for an organization',
    parameters: {
      type: 'object',
      properties: {
        orgId: {
          type: 'string',
          description: 'Organization ID'
        }
      },
      required: ['orgId']
    }
  }
]

// Import MCP tools (will be added via imports in the actual file)
let ALL_MCP_TOOLS: any[] = []
try {
  const mcpModule = require('@/lib/mcp-tools')
  ALL_MCP_TOOLS = mcpModule.ALL_MCP_TOOLS || []
} catch (error) {
  console.warn('⚠️ MCP tools not available:', error)
}

// Convert MCP tools to function format for LLM
function convertMCPToolsToFunctions(mcpTools: any[]): LLMFunction[] {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }))
}

// All available functions (John Deere + MCP Tools)
const ALL_FUNCTIONS = [
  ...JOHN_DEERE_FUNCTIONS,
  ...convertMCPToolsToFunctions(ALL_MCP_TOOLS)
]

export class LLMService {
  private geminiClient: GoogleGenerativeAI | null = null
  private openaiClient: OpenAI | null = null
  private config: LLMConfig

  constructor() {
    this.config = {
      gemini: {
        apiKey: process.env.GOOGLE_API_KEY || '',
        model: 'gemini-2.0-flash-exp', // Latest Gemini 2.0 Flash model
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o-mini', // OpenAI GPT-4o-mini as fallback
      },
    }

    // Initialize clients if API keys are available
    if (this.config.gemini.apiKey) {
      this.geminiClient = new GoogleGenerativeAI(this.config.gemini.apiKey)
      console.log('✅ Gemini initialized')
    } else {
      console.warn('⚠️ Google API key not found')
    }

    if (this.config.openai.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: this.config.openai.apiKey,
      })
      console.log('✅ OpenAI initialized')
    } else {
      console.warn('⚠️ OpenAI API key not found')
    }
  }

  /**
   * Generate a chat completion using Gemini as primary, OpenAI as fallback
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
    const { maxTokens = 4000, temperature = 0.7, systemPrompt, enableFunctions = true, functions } = options || {}

    // Use provided functions or default to all functions
    const functionsToUse = functions || ALL_FUNCTIONS

    console.log('🤖 Generating chat completion...', {
      messageCount: messages.length,
      maxTokens,
      temperature,
      enableFunctions,
      functionCount: functionsToUse.length
    })

    // Try Gemini first for all requests (including function calls)
    // Gemini 2.0 Flash has excellent function calling capabilities
    if (this.geminiClient) {
      try {
        console.log('Attempting to use Gemini 2.0 Flash...')
        const result = await this.generateWithGemini(messages, {
          maxTokens,
          temperature,
          systemPrompt,
          enableFunctions,
          functions: functionsToUse,
        })
        
        // Check if Gemini returned an empty response
        if (!result.content && (!result.functionCalls || result.functionCalls.length === 0)) {
          console.warn('⚠️ Gemini returned empty response, falling back to OpenAI')
          throw new Error('Gemini returned empty response')
        }
        
        return result
      } catch (error) {
        console.warn('Gemini failed, falling back to OpenAI:', error)
      }
    }

    // Fallback to OpenAI
    if (this.openaiClient) {
      try {
        console.log('Using OpenAI GPT-4o-mini as fallback...')
        return await this.generateWithOpenAI(messages, {
          maxTokens,
          temperature,
          systemPrompt,
          enableFunctions,
          functions: functionsToUse,
        })
      } catch (error) {
        console.error('OpenAI also failed:', error)
        throw new Error('Both LLM providers failed')
      }
    }

    throw new Error('No LLM providers configured')
  }

  /**
   * Generate response using Google Gemini
   */
  private async generateWithGemini(
    messages: ChatMessage[],
    options: {
      maxTokens: number
      temperature: number
      systemPrompt?: string
      enableFunctions?: boolean
      functions: LLMFunction[]
    }
  ): Promise<LLMResponse> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized')
    }

    const modelConfig: any = {
      model: this.config.gemini.model,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    }

    // Add function calling if enabled
    if (options.enableFunctions && options.functions.length > 0) {
      console.log('🔧 Adding functions to Gemini:', options.functions.length)
      modelConfig.tools = [{
        functionDeclarations: options.functions
      }]
    }

    const model = this.geminiClient.getGenerativeModel(modelConfig)

    // Convert messages to Gemini format
    const geminiMessages = this.convertToGeminiFormat(messages, options.systemPrompt)
    console.log('📤 Sending to Gemini:', geminiMessages.length, 'messages')

    const result = await model.generateContent({
      contents: geminiMessages,
    })

    const response = await result.response
    console.log('📥 Gemini response status:', response)
    
    const text = response.text()
    console.log('📝 Gemini response text length:', text?.length || 0)

    // Check for function calls
    const functionCalls: FunctionCall[] = []
    if (response.functionCalls && Array.isArray(response.functionCalls) && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        functionCalls.push({
          name: call.name,
          arguments: call.args || {}
        })
      }
    }

    return {
      content: text,
      model: this.config.gemini.model,
      functionCalls,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    }
  }

  /**
   * Generate response using OpenAI
   */
  private async generateWithOpenAI(
    messages: ChatMessage[],
    options: {
      maxTokens: number
      temperature: number
      systemPrompt?: string
      enableFunctions?: boolean
      functions: LLMFunction[]
    }
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized')
    }

    // Prepare messages for OpenAI format
    const openaiMessages = this.convertToOpenAIFormat(messages, options.systemPrompt)

    // Prepare function calling if enabled
    const completionOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: this.config.openai.model,
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

    const response = await this.openaiClient.chat.completions.create(completionOptions)

    const choice = response.choices[0]
    if (!choice) {
      throw new Error('No response from OpenAI')
    }

    // Extract function calls if present
    const functionCalls: FunctionCall[] = []
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
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined
    }
  }

  /**
   * Convert messages to Gemini format
   */
  private convertToGeminiFormat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    const geminiMessages: Array<{ role: string; parts: Array<{ text: string }> }> = []

    // Add system prompt as first user message if provided
    if (systemPrompt) {
      geminiMessages.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      })
      geminiMessages.push({
        role: 'model',
        parts: [{ text: 'I understand. I will help you with your farming operations and data analysis.' }],
      })
    }

    // Convert chat messages
    for (const message of messages) {
      let content = message.content

      // Add file attachment information if present
      if (message.fileAttachments && message.fileAttachments.length > 0) {
        const fileInfo = message.fileAttachments
          .map(file => `[File: ${file.filename} (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)}KB)]`)
          .join('\n')
        content = `${content}\n\n${fileInfo}`
      }

      // Handle function messages - convert to user messages with clear function result formatting
      if (message.role === 'function') {
        content = `Function result: ${content}`
      }

      geminiMessages.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }],
      })
    }

    return geminiMessages
  }

  /**
   * Convert messages to OpenAI format
   */
  private convertToOpenAIFormat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

    // Add system prompt if provided
    if (systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    // Convert chat messages
    for (const message of messages) {
      let content = message.content

      // Add file attachment information if present
      if (message.fileAttachments && message.fileAttachments.length > 0) {
        const fileInfo = message.fileAttachments
          .map(file => `[File: ${file.filename} (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)}KB)]`)
          .join('\n')
        content = `${content}\n\n${fileInfo}`
      }

      // Convert function messages to user messages with clear formatting
      if (message.role === 'function') {
        openaiMessages.push({
          role: 'user',
          content: `Function result: ${content}`,
        })
      } else {
        openaiMessages.push({
          role: message.role as 'user' | 'assistant' | 'system',
          content,
        })
      }
    }

    return openaiMessages
  }

  /**
   * Check which LLM providers are available
   */
  getAvailableProviders(): { gemini: boolean; openai: boolean } {
    return {
      gemini: !!this.geminiClient,
      openai: !!this.openaiClient,
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): LLMConfig {
    return {
      ...this.config,
      gemini: {
        ...this.config.gemini,
        apiKey: this.config.gemini.apiKey ? '[REDACTED]' : '',
      },
      openai: {
        ...this.config.openai,
        apiKey: this.config.openai.apiKey ? '[REDACTED]' : '',
      },
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