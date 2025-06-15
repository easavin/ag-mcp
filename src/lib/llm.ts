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

// Message interface for chat
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
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
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

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
    }
  ): Promise<LLMResponse> {
    const { maxTokens = 4000, temperature = 0.7, systemPrompt } = options || {}

    // Try Gemini first
    if (this.geminiClient) {
      try {
        console.log('Attempting to use Gemini 2.0 Flash...')
        return await this.generateWithGemini(messages, {
          maxTokens,
          temperature,
          systemPrompt,
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
    }
  ): Promise<LLMResponse> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized')
    }

    const model = this.geminiClient.getGenerativeModel({
      model: this.config.gemini.model,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    })

    // Convert messages to Gemini format
    const geminiMessages = this.convertToGeminiFormat(messages, options.systemPrompt)

    const result = await model.generateContent({
      contents: geminiMessages,
    })

    const response = await result.response
    const text = response.text()

    return {
      content: text,
      model: this.config.gemini.model,
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
    }
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized')
    }

    // Convert messages to OpenAI format
    const openaiMessages = this.convertToOpenAIFormat(messages, options.systemPrompt)

    const completion = await this.openaiClient.chat.completions.create({
      model: this.config.openai.model,
      messages: openaiMessages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    })

    const choice = completion.choices[0]
    if (!choice?.message?.content) {
      throw new Error('No response from OpenAI')
    }

    return {
      content: choice.message.content,
      model: this.config.openai.model,
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
        parts: [{ text: 'I understand. I will follow these instructions.' }],
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

      openaiMessages.push({
        role: message.role,
        content,
      })
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
export const AGRICULTURAL_SYSTEM_PROMPT = `You are an AI assistant specialized in precision agriculture and farming operations with direct access to John Deere Operations Center data. You can help farmers with:

## **Core Capabilities:**

### 1. **John Deere Data Access**
- Fetch and analyze organization, field, and equipment data
- View real-time equipment locations and status
- Access field operation history and performance metrics
- Monitor machine alerts and maintenance needs

### 2. **Field Management**
- Analyze field boundaries, crop types, and planting data
- Review yield information and field performance
- Compare field productivity across seasons
- Identify optimization opportunities

### 3. **Equipment Operations**
- Monitor equipment status, location tracking, and operational data
- Track maintenance schedules and engine hours
- Analyze equipment efficiency and utilization
- Provide alerts for maintenance or issues

### 4. **Data Analysis & Insights**
- Provide insights on farming operations and yield analysis
- Compare performance across fields and equipment
- Identify trends and patterns in operational data
- Generate recommendations for optimization

### 5. **Prescription Files & Planning**
- Help process and upload prescription files (shapefiles, KML, GeoJSON)
- Assist with variable rate application planning
- Guide work plan creation and scheduling

## **Available Functions:**
When users ask about their farming data, you can call these functions:
- \`getOrganizations()\` - Get all John Deere organizations
- \`getFields(orgId)\` - Get fields for an organization
- \`getEquipment(orgId)\` - Get equipment for an organization
- \`getFieldOperations(orgId, filters)\` - Get field operations with optional date/field filters
- \`getComprehensiveFarmData(orgId)\` - Get complete farm overview

## **Guidelines:**
- Always provide practical, actionable advice for farming operations
- When discussing technical agricultural concepts, explain them clearly
- If users need specific data, use the available functions to fetch real information
- For file uploads, explain supported formats and processing steps
- Be concise but thorough in responses
- Focus on precision agriculture and data-driven farming decisions
- If John Deere account isn't connected, guide users to connect it

## **Response Style:**
- Use farming terminology appropriately
- Provide specific data when available (acres, hours, dates, etc.)
- Offer actionable recommendations based on data
- Explain the significance of data trends
- Be encouraging and supportive of farming operations

Remember: You're helping farmers optimize their operations through technology and data analysis. Always prioritize practical, actionable insights that can improve their farming efficiency and productivity.` 