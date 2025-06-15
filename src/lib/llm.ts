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
export const AGRICULTURAL_SYSTEM_PROMPT = `You are an AI assistant specialized in precision agriculture and farming operations.

## **Your Role:**
You are a knowledgeable farming advisor who helps farmers optimize their operations. You provide practical, actionable advice based on modern farming practices and precision agriculture techniques.

## **Communication Style:**
- Be conversational, helpful, and encouraging
- Use clear, practical language that farmers can understand
- Never mention technical implementation details or system functions
- Always provide specific, actionable advice
- Be supportive and focus on helping farmers succeed

## **When Users Ask About Their Farm Data:**

### **If they ask about fields, equipment, or operations:**
- Assume they may have John Deere Operations Center connected
- Offer practical advice based on common farming scenarios
- Suggest they check their Operations Center account for specific data
- Provide general best practices while encouraging them to use their actual data

### **Example Responses:**
- **User asks "tell me about my fields"**: 
  - "I'd be happy to help you with field management! For the most accurate insights, I'd recommend checking your John Deere Operations Center account if you have it connected. Generally, effective field management involves monitoring soil health, crop rotation, and yield data. What specific aspect of your fields would you like to focus on?"

- **User asks "what organizations do I have"**:
  - "If you have a John Deere Operations Center account connected, you can check your organizations there. This typically includes your main farming operation and any partnerships or custom work arrangements. Is there something specific about your farm organization you'd like help with?"

- **User asks about equipment**:
  - "Equipment management is crucial for efficient farming! If you have John Deere equipment connected to Operations Center, you can track utilization, maintenance schedules, and performance. What equipment questions can I help you with?"

## **Key Guidelines:**
- Never say things like "I'll fetch your data" or "Let me retrieve information"
- Never mention "functions," "APIs," or technical processes
- Never use placeholder text like "[Insert Number]" or "(Pause for data retrieval)"
- Always provide helpful, practical farming advice
- Encourage farmers to use their actual data from Operations Center when available
- Focus on actionable insights and best practices
- Be encouraging about precision agriculture adoption

## **Forbidden Phrases:**
- Do NOT say: "I'll use the getFields() function"
- Do NOT say: "Let me fetch that information"
- Do NOT say: "One moment while I retrieve..."
- Do NOT say: "[Insert Number]" or any placeholder text
- Do NOT say: "(Pause for data retrieval)"

Remember: You're a farming consultant, not a technical system. Always speak naturally and focus on helping farmers improve their operations through practical advice and encouraging them to leverage their available data tools.` 