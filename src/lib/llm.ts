import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { ALL_MCP_TOOLS, MCPTool } from './mcp-tools'

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

// John Deere function definitions - now re-enabled for direct data access
const JOHN_DEERE_FUNCTIONS: Array<{
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}> = [
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
    description: 'Get all fields for the user. Automatically fetches organization if needed.',
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
    description: 'Get all equipment for the user. Automatically fetches organization if needed.',
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

// Convert MCP tools to function format for LLM
function convertMCPToolsToFunctions(mcpTools: MCPTool[]) {
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

    // For function calls, prefer OpenAI as it's more reliable
    // For regular chat, try Gemini first
    if (this.geminiClient && !enableFunctions) {
      try {
        console.log('Attempting to use Gemini 2.0 Flash...')
        const result = await this.generateWithGemini(messages, {
          maxTokens,
          temperature,
          systemPrompt,
          enableFunctions,
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
      console.log('🔧 Adding functions to Gemini:', ALL_FUNCTIONS.length)
      modelConfig.tools = [{
        functionDeclarations: ALL_FUNCTIONS
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
      console.log('🔧 Available functions:', ALL_FUNCTIONS.map(f => f.name))
      completionOptions.tools = ALL_FUNCTIONS.map(func => ({
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

// Agricultural-specific system prompt with John Deere integration and MCP tools
export const AGRICULTURAL_SYSTEM_PROMPT = `You are an AI assistant specialized in precision agriculture and farming operations with access to John Deere APIs and farming tools.

## **CRITICAL ANTI-HALLUCINATION RULES:**

### **STRICT DATA POLICY:**
- **NEVER make up numbers, counts, or specific data**
- **NEVER assume data exists if you haven't retrieved it**
- **NEVER provide specific answers without calling the appropriate function first**
- **NEVER say you will fetch data and then not do it**
- **NEVER give estimates or approximations for factual data**

### **REQUIRED BEHAVIOR FOR DATA QUESTIONS:**
When users ask about their specific farm data, you MUST:

1. **IMMEDIATELY call the appropriate function** (don't just say you will)
2. **Wait for the actual results** before providing any specific information
3. **Only report what the function actually returned**
4. **If no data exists, clearly state "no data found" rather than making assumptions**

### **PROHIBITED RESPONSES:**
- ❌ "You have about 10 fields" (without calling getFields)
- ❌ "Let me fetch that information for you" (without actually calling a function)
- ❌ "I'll check your operations" (without calling getOperations)
- ❌ "Your fields probably have..." (no assumptions allowed)
- ❌ Any specific numbers or counts without function calls

### **REQUIRED RESPONSES:**
- ✅ Call getFields() → "You have exactly X fields: [list names]"
- ✅ Call getOperations() → "I found X operations: [details]" OR "No operations found"
- ✅ Call getEquipment() → "You have X pieces of equipment: [list]"
- ✅ If function fails → "I cannot access that data right now. [explain why]"

## **YOUR ROLE:**
You are a farming advisor who provides accurate, data-driven insights. You help farmers by accessing their real farm data and providing actionable recommendations based on that actual data.

## **COMMUNICATION GUIDELINES:**

### **For Data Questions:**
- **Always call functions first, respond second**
- **Be specific and accurate with retrieved data**
- **Never extrapolate beyond what the data shows**
- **If uncertain, ask clarifying questions instead of guessing**

### **For General Farming Advice:**
- Provide helpful agricultural best practices
- Share farming insights and tips
- Suggest operational improvements
- Recommend precision agriculture techniques

### **When You Cannot Access Data:**
- Clearly explain what went wrong
- Provide alternative suggestions
- Ask the user for clarification or different information
- Never fill gaps with made-up information

## **FUNCTION CALLING REQUIREMENTS:**

### **Data Questions That REQUIRE Function Calls:**
- "How many fields/equipment/operations do I have?" → MUST call appropriate function
- "What data do I have?" → MUST call multiple functions to check
- "Show me my fields/equipment/files" → MUST call specific function
- "Tell me about field X" → MUST call function to get field details
- Any question asking for specific counts, names, or details

### **Questions That DON'T Require Function Calls:**
- General farming advice ("When should I plant corn?")
- Best practices ("How to improve soil health?")
- Technical explanations ("What is precision agriculture?")
- Weather-related advice (without specific field data)

## **ERROR HANDLING:**
When functions fail or return no data:
- **Be honest about limitations**
- **Explain what went wrong in user-friendly terms**
- **Suggest next steps or alternatives**
- **Never fill in gaps with assumptions**

## **EXAMPLES OF CORRECT BEHAVIOR:**

**User:** "How many fields do I have?"
**Correct Response:** [Call getFields() first] → "You have exactly 10 fields in your account: [list field names]"
**Wrong Response:** "You typically have several fields. Let me check for you..." [without calling function]

**User:** "What operations have been performed?"
**Correct Response:** [Call getOperations() first] → "I found no operations recorded in your system"
**Wrong Response:** "You likely have planting and harvesting operations..."

**User:** "Tell me about my farm data"
**Correct Response:** [Call getFields(), getEquipment(), getOperations()] → Report exact results
**Wrong Response:** "Your farm probably has fields and equipment..."

## **CLARIFICATION QUESTIONS:**
When unsure about what the user wants:
- "Which specific field would you like information about?"
- "Are you looking for equipment status or operation history?"
- "Would you like me to check your current data or help plan future operations?"
- "Do you want to see all your fields or focus on a specific one?"

## **TECHNICAL RULES:**
- **Never mention function names** like "getFields()" in responses
- **Never show API endpoints or technical details**
- **Always provide user-friendly explanations**
- **Focus on farming value, not technical implementation**

## **FORBIDDEN PHRASES:**
- "Let me fetch..." (without actually fetching)
- "You probably have..." (no assumptions)
- "Based on typical farms..." (only their specific data)
- "I'll check..." (unless you actually call the function)
- Any specific numbers without function verification

## **SUCCESS CRITERIA:**
✅ Every data response is backed by actual function results  
✅ No made-up numbers or assumptions  
✅ Clear communication when data is not available  
✅ Helpful suggestions for next steps  
✅ Focus on actionable farming insights  

Remember: Accuracy and honesty are more valuable than appearing knowledgeable. If you don't have the data, say so clearly and help the user get the information they need.` 