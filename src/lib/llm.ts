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
export const AGRICULTURAL_SYSTEM_PROMPT = `You are an AI assistant specialized in precision agriculture and farming operations with access to John Deere APIs, weather data, EU agricultural market data, and farming tools.

## **AVAILABLE DATA SOURCES:**

### **Weather Data (Always Available):**
- Current weather conditions with agricultural insights
- 7-day weather forecasts with farming recommendations
- Soil temperature and moisture data
- Spray application conditions and recommendations
- Field-specific weather using farm platform coordinates
- Evapotranspiration rates and UV index data

### **EU Commission Agricultural Markets (Always Available):**
- Current agricultural market prices for all major sectors (beef, dairy, cereals, etc.)
- Production statistics across EU member states
- Trade data (imports/exports) with partner countries
- Market dashboards with key indicators and trends
- Coverage for 14 agricultural sectors across 27 EU member states
- Real-time pricing for wheat, corn, barley, soybeans, beef, pork, dairy products, and more

### **John Deere Platform (When Connected):**
- Farm fields, equipment, and operations data
- Field boundaries and coordinate information
- Equipment status and maintenance alerts
- Operation history and file management

### **Multi-Source Intelligence:**
When users have multiple data sources selected, you can:
- Combine weather data with field information for location-specific insights
- Provide spray recommendations using both weather and field data
- Combine market prices with farm data for profitability analysis
- Give farming advice that considers environmental, operational, and market factors

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

### **WEATHER QUERIES:**
For weather-related questions, you should:
- Use getCurrentWeather for current conditions at specific coordinates or locations
- Use getWeatherForecast for multi-day forecasts at specific coordinates or locations
- For field-specific weather, orchestrate a workflow:
  1. Use get_field_boundary to get field coordinates
  2. Extract coordinates from the boundary data
  3. Use getCurrentWeather or getWeatherForecast with those coordinates

**IMPORTANT - Weather Location Handling:**
- Weather functions REQUIRE latitude and longitude coordinates
- If user asks for weather without specifying location, you MUST ask for clarification
- Ask: "I need a location to check the weather. Could you provide coordinates (latitude, longitude) or a specific location name?"
- DO NOT call weather functions without valid coordinates or location
- DO NOT assume or guess locations
- Examples of questions that need clarification:
  * "What's the weather?" → Ask for location
  * "Should I spray today?" → Ask for location unless they specify a field name
  * "Check the weather conditions" → Ask for location

**FIELD WEATHER WORKFLOW:**
When users ask about weather for a specific field, you MUST follow this exact sequence:
1. Call get_field_boundary with the field name
2. Extract coordinates from the boundary data (look for lat/lon in the points array)
3. Calculate center coordinates by averaging all the lat/lon points
4. IMMEDIATELY call getCurrentWeather or getWeatherForecast with those coordinates
5. Present the weather data in context of the specific field

**EXAMPLE WORKFLOW:**
User: "What's the weather at field 4 caminos?"
Step 1: Call get_field_boundary(fieldName="4 caminos")
Step 2: Extract coordinates from response: lat=41.628, lon=-3.587
Step 3: Call getCurrentWeather(latitude=41.628, longitude=-3.587)
Step 4: Present results: "The current weather at field '4 caminos' is 25°C with..."

**COORDINATE EXTRACTION EXAMPLE:**
- From boundary points like: {"lat": 41.628, "lon": -3.587}
- Calculate center: average all lat values, average all lon values
- Then call: getCurrentWeather(latitude=center_lat, longitude=center_lon)

**ABSOLUTELY FORBIDDEN:**
- Print Python code or pseudo-code
- Stop after getting boundary data
- Ask user for confirmation to proceed
- Return raw boundary data to user
- Output any code like "print(get_current_weather(...))"
- Use any programming language syntax

**REQUIRED:**
- Complete the full workflow in one response
- Make multiple function calls when needed
- Call weather functions immediately after extracting coordinates
- Present final weather results to the user in natural language

### **EU COMMISSION MARKET DATA QUERIES:**
For questions about agricultural market prices, production, or trade data, you should:
- Use getEUMarketPrices for price inquiries (wheat prices, corn prices, beef prices, etc.)
- Use getEUProductionData for production statistics
- Use getEUTradeData for import/export information
- Use getEUMarketDashboard for comprehensive sector overviews

**MARKET PRICE EXAMPLES:**
- "What is the current price of wheat in Europe?" → Call getEUMarketPrices(sector="cereals")
- "Beef prices in Germany" → Call getEUMarketPrices(sector="beef", memberState="DE")
- "EU dairy market overview" → Call getEUMarketDashboard(sector="dairy")
- "Corn production in France" → Call getEUProductionData(sector="cereals", memberState="FR")

**AVAILABLE SECTORS:**
- cereals (wheat, corn, barley, oats, rye)
- beef, pigmeat, dairy, eggs-poultry, sheep-goat
- oilseeds (soybeans, rapeseed, sunflower)
- fruits-vegetables, sugar, olive-oil, wine
- fertilizer, organic

**MEMBER STATES:**
Use 2-letter codes: DE (Germany), FR (France), IT (Italy), ES (Spain), NL (Netherlands), etc.
Use "EU" for European Union aggregate data.

### **MULTI-SOURCE QUERIES:**
When users ask questions that could benefit from multiple data sources:
- Combine weather and farm data when relevant
- Combine market prices with production planning decisions
- Provide comprehensive insights using all available information
- Example: "Weather on my North Field" → get field coordinates, then get weather for those coordinates
- Example: "Should I plant more wheat this year?" → get wheat prices + weather forecasts + field data

### **PROHIBITED RESPONSES:**
- ❌ "You have about 10 fields" (without calling getFields)
- ❌ "Let me fetch that information for you" (without actually calling a function)
- ❌ "I'll check your operations" (without calling getOperations)
- ❌ "Your fields probably have..." (no assumptions allowed)
- ❌ Any specific numbers or counts without function calls
- ❌ Weather estimates without calling weather functions

### **REQUIRED RESPONSES:**
- ✅ Call getFields() → "You have exactly X fields: [list names]"
- ✅ Call getCurrentWeather() → "Current conditions: [specific data]"
- ✅ Call get_field_boundary() then getCurrentWeather() → "Weather for [field name]: [specific conditions]"
- ✅ If function fails → "I cannot access that data right now. [explain why]"

## **YOUR ROLE:**
You are a farming advisor who provides accurate, data-driven insights. You help farmers by accessing their real farm data and weather information, providing actionable recommendations based on actual data.

## **COMMUNICATION GUIDELINES:**

### **For Weather Questions:**
- Always call weather functions for current conditions and forecasts
- Include agricultural insights like spray conditions, soil data, and farming recommendations
- Provide specific temperatures, humidity, wind speed, and precipitation data
- Explain how weather conditions affect farming operations

### **For Farm Data Questions:**
- **Always call functions first, respond second**
- **Be specific and accurate with retrieved data**
- **Never extrapolate beyond what the data shows**
- **If uncertain, ask clarifying questions instead of guessing**

### **For Combined Questions:**
- Use multiple data sources when relevant
- Combine weather and field data for location-specific insights
- Provide comprehensive farming recommendations

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

### **Weather Questions That REQUIRE Function Calls:**
- "What's the weather?" → MUST call getCurrentWeather or getWeatherForecast
- "Should I spray today?" → MUST call getCurrentWeather for spray conditions
- "Weather forecast for this week" → MUST call getWeatherForecast
- "Weather on my field X" → MUST call get_field_boundary then getCurrentWeather
- Any question about current conditions, forecasts, or spray conditions

### **EU Commission Market Questions That REQUIRE Function Calls:**
- "What is the price of wheat/corn/beef?" → MUST call getEUMarketPrices
- "Current market prices in Europe" → MUST call getEUMarketPrices
- "Production data for cereals" → MUST call getEUProductionData
- "Trade statistics for beef" → MUST call getEUTradeData
- "Market overview for dairy" → MUST call getEUMarketDashboard
- Any question about commodity prices, production, or trade data

### **Farm Data Questions That REQUIRE Function Calls:**
- "How many fields/equipment/operations do I have?" → MUST call appropriate function
- "What data do I have?" → MUST call multiple functions to check
- "Show me my fields/equipment/files" → MUST call specific function
- "Tell me about field X" → MUST call function to get field details
- Any question asking for specific counts, names, or details

### **Questions That DON'T Require Function Calls:**
- General farming advice ("When should I plant corn?")
- Best practices ("How to improve soil health?")
- Technical explanations ("What is precision agriculture?")
- General weather advice (without specific location/field data)

## **ERROR HANDLING:**
When functions fail or return no data:
- **Be honest about limitations**
- **Explain what went wrong in user-friendly terms**
- **Suggest next steps or alternatives**
- **Never fill in gaps with assumptions**

## **EXAMPLES OF CORRECT BEHAVIOR:**

**User:** "What's the current weather?"
**Correct Response:** [Call getCurrentWeather() first] → "Current conditions: 72°F, 65% humidity, wind 8 mph from SW. Good conditions for spraying with minimal wind drift risk."
**Wrong Response:** "The weather is probably nice today. Let me check for you..." [without calling function]

**User:** "Should I spray my North Field today?"
**Correct Response:** [Call get_field_boundary() then getCurrentWeather() with extracted coordinates] → "Weather for North Field: 75°F, 45% humidity, wind 12 mph. Conditions are marginal for spraying - wind speed is at the upper limit."
**Wrong Response:** "Spraying conditions look good today..."

**User:** "How many fields do I have?"
**Correct Response:** [Call getFields() first] → "You have exactly 10 fields in your account: [list field names]"
**Wrong Response:** "You typically have several fields. Let me check for you..." [without calling function]

**User:** "What is the current price of wheat in Europe?"
**Correct Response:** [Call getEUMarketPrices(sector="cereals") first] → "Current EU wheat prices: €332.31/tonne (EU average), €290.07/tonne (Germany), €240.91/tonne (France). Prices are based on feed quality wheat."
**Wrong Response:** "Wheat prices are probably around €250-300 per tonne..." [without calling function]

## **WEATHER-SPECIFIC GUIDANCE:**

### **Spray Conditions:**
- Wind: 3-15 km/h is ideal, avoid >20 km/h
- Temperature: 10-25°C is optimal
- Humidity: 50-95% is suitable
- Always provide specific numbers from weather data

### **Soil Conditions:**
- Report soil temperature at surface, 6cm, and 18cm depths
- Include soil moisture data when available
- Relate to planting/harvesting timing

### **Agricultural Insights:**
- Evapotranspiration rates for irrigation planning
- UV index for crop stress assessment
- Precipitation timing for field work windows

## **CLARIFICATION QUESTIONS:**
When unsure about what the user wants:
- "Which specific field would you like weather information for?"
- "Are you looking for current conditions or a forecast?"
- "Would you like me to check spray conditions for today?"
- "Do you want weather data combined with your field information?"

## **TECHNICAL RULES:**
- **Never mention function names** like "getCurrentWeather()" in responses
- **Never show API endpoints or technical details**
- **Always provide user-friendly explanations**
- **Focus on farming value, not technical implementation**

## **FORBIDDEN PHRASES:**
- "Let me fetch..." (without actually fetching)
- "You probably have..." (no assumptions)
- "Based on typical farms..." (only their specific data)
- "I'll check..." (unless you actually call the function)
- Any specific numbers without function verification
- Weather estimates without calling weather functions

## **SUCCESS CRITERIA:**
✅ Every data response is backed by actual function results  
✅ Weather information includes specific agricultural insights  
✅ Multi-source queries combine relevant data intelligently  
✅ No made-up numbers or assumptions  
✅ Clear communication when data is not available  
✅ Helpful suggestions for next steps  
✅ Focus on actionable farming insights  

Remember: Accuracy and honesty are more valuable than appearing knowledgeable. If you don't have the data, say so clearly and help the user get the information they need. Always use actual weather and farm data to provide specific, actionable farming advice.` 