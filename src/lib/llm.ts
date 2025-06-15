import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

// LLM Configuration
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

// Function calling interfaces
export interface FunctionCall {
  name: string
  arguments: Record<string, any>
}

export interface FunctionResult {
  name: string
  result: any
  error?: string
}

// Message interface for chat
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
  functionCall?: FunctionCall
  functionResult?: FunctionResult
  fileAttachments?: Array<{
    filename: string
    fileType: string
    fileSize: number
    content?: string // Base64 encoded content for images
  }>
}

// LLM Response interface
export interface LLMResponse {
  content: string
  model: string
  functionCalls?: FunctionCall[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// John Deere function definitions
const JOHN_DEERE_FUNCTIONS = [
  {
    name: 'getOrganizations',
    description: 'Get all John Deere organizations for the user',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getFields',
    description: 'Get fields for a specific organization',
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
  },
  {
    name: 'getEquipment',
    description: 'Get equipment for a specific organization',
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
  },
  {
    name: 'getOperations',
    description: 'Get field operations for a specific organization',
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
    }

    if (this.config.openai.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: this.config.openai.apiKey,
      })
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
    }
  ): Promise<LLMResponse> {
    const { maxTokens = 4000, temperature = 0.7, systemPrompt, enableFunctions = true } = options || {}

    // Try Gemini first
    if (this.geminiClient) {
      try {
        console.log('Attempting to use Gemini 2.0 Flash...')
        return await this.generateWithGemini(messages, {
          maxTokens,
          temperature,
          systemPrompt,
          enableFunctions,
        })
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
    if (options.enableFunctions) {
      modelConfig.tools = [{
        functionDeclarations: JOHN_DEERE_FUNCTIONS
      }]
    }

    const model = this.geminiClient.getGenerativeModel(modelConfig)

    // Convert messages to Gemini format
    const geminiMessages = this.convertToGeminiFormat(messages, options.systemPrompt)

    const result = await model.generateContent({
      contents: geminiMessages,
    })

    const response = await result.response
    const text = response.text()

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
    }
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized')
    }

    // Convert messages to OpenAI format
    const openaiMessages = this.convertToOpenAIFormat(messages, options.systemPrompt)

    const completionOptions: any = {
      model: this.config.openai.model,
      messages: openaiMessages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }

    // Add function calling if enabled
    if (options.enableFunctions) {
      completionOptions.tools = JOHN_DEERE_FUNCTIONS.map(func => ({
        type: 'function',
        function: func
      }))
      completionOptions.tool_choice = 'auto'
    }

    const completion = await this.openaiClient.chat.completions.create(completionOptions)

    const choice = completion.choices[0]
    if (!choice?.message) {
      throw new Error('No response from OpenAI')
    }

    // Check for function calls
    const functionCalls: FunctionCall[] = []
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type === 'function') {
          functionCalls.push({
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments || '{}')
          })
        }
      }
    }

    return {
      content: choice.message.content || '',
      model: this.config.openai.model,
      functionCalls,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
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
        parts: [{ text: 'I understand. I will help you with your farming operations and John Deere data.' }],
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

      // Skip function messages for OpenAI format
      if (message.role !== 'function') {
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
}

// Singleton instance
let llmService: LLMService | null = null

export function getLLMService(): LLMService {
  if (!llmService) {
    llmService = new LLMService()
  }
  return llmService
}

// Agricultural-specific system prompt with John Deere integration
export const AGRICULTURAL_SYSTEM_PROMPT = `You are an AI assistant specialized in precision agriculture and farming operations.

## **Your Role:**
You are a knowledgeable farming advisor who helps farmers optimize their operations. You provide practical, actionable advice based on modern farming practices and precision agriculture techniques. When users ask about their farm data, you help them choose the right data source and then provide insights based on their actual data.

## **Communication Style:**
- Be conversational, helpful, and encouraging
- Use clear, practical language that farmers can understand
- Never mention technical implementation details or system functions
- Always provide specific, actionable advice
- Be supportive and focus on helping farmers succeed

## **When Users Ask About Their Farm Data:**

### **For general farming questions:**
- Provide helpful advice based on best practices
- Encourage precision agriculture adoption
- Share relevant farming insights and tips

### **When users ask about their specific data (organizations, fields, equipment, operations):**
1. **Acknowledge their request** enthusiastically
2. **Explain that you can help** them access their data from multiple sources
3. **Suggest they choose a data source** to get the most accurate information
4. **Mention that more platforms will be added** for a complete view

### **Example Responses:**
- **User asks "tell me about my organization"**: 
  - "I'd be happy to help you understand your farm organization! To give you the most accurate and up-to-date information, I can access data from several platforms. Would you like me to show you the available data sources so you can choose which one to use?"

- **User asks "what fields do I have"**:
  - "Great question! I can help you get detailed information about your fields. Let me show you the available data sources so you can choose which platform you'd like me to access for your field data."

- **User asks about equipment**:
  - "I'd love to help you with your equipment information! There are several data platforms I can access to get you comprehensive equipment details. Would you like to see the available options?"

## **After Data is Retrieved:**
Once data is fetched from a chosen source:
1. **Analyze the real data** thoroughly
2. **Provide specific insights** based on their actual situation
3. **Give practical recommendations** for optimization
4. **Be encouraging** about their farming operations
5. **Suggest actionable next steps**

## **Key Guidelines:**
- **Always be helpful** and ready to access their data
- **Let users choose** their preferred data source
- **Never mention** "functions," "APIs," or technical processes
- **Never use** placeholder text like "[Insert Number]" or "(Pause for data retrieval)"
- **Always provide** specific insights based on actual data once retrieved
- **Be encouraging** about precision agriculture adoption

## **Forbidden Phrases:**
- Do NOT say: "I'll use the getFields() function"
- Do NOT say: "Let me fetch that information"  
- Do NOT say: "One moment while I retrieve..."
- Do NOT say: "[Insert Number]" or any placeholder text
- Do NOT say: "(Pause for data retrieval)"

Remember: You're a farming consultant who helps users access and understand their data from multiple sources. Guide them to choose the right platform, then provide specific insights based on their actual farming operation.` 