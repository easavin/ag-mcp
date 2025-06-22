import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_SESSION_ID = 'test-session-' + Date.now()

interface TestMessage {
  question: string
  expectedFunctions: string[]
  description: string
  category: 'johndeere' | 'weather' | 'combined'
  minResponseLength?: number
  shouldContain?: string[]
  shouldNotContain?: string[]
}

// Comprehensive test scenarios
const TEST_SCENARIOS: TestMessage[] = [
  // === JOHN DEERE API TESTS ===
  {
    question: "How many fields do I have?",
    expectedFunctions: ['getFields'],
    description: "Basic field count query",
    category: 'johndeere',
    minResponseLength: 50,
    shouldContain: ['field']
  },
  {
    question: "List all my equipment",
    expectedFunctions: ['getEquipment'],
    description: "Equipment listing query",
    category: 'johndeere',
    minResponseLength: 50,
    shouldContain: ['equipment']
  },
  {
    question: "Show me my organizations",
    expectedFunctions: ['getOrganizations'],
    description: "Organization listing query",
    category: 'johndeere',
    minResponseLength: 30,
    shouldContain: ['organization']
  },
  {
    question: "What operations have been performed recently?",
    expectedFunctions: ['getOperations'],
    description: "Operations history query",
    category: 'johndeere',
    minResponseLength: 50,
    shouldContain: ['operation']
  },
  {
    question: "Give me comprehensive data about my farm",
    expectedFunctions: ['getComprehensiveData'],
    description: "Comprehensive farm data query",
    category: 'johndeere',
    minResponseLength: 100,
    shouldContain: ['farm', 'data']
  },
  {
    question: "Show me boundary data for field 4 caminos",
    expectedFunctions: ['get_field_boundary'],
    description: "Field boundary data query",
    category: 'johndeere',
    minResponseLength: 50,
    shouldContain: ['boundary', '4 caminos']
  },

  // === WEATHER API TESTS ===
  {
    question: "What's the current weather at coordinates 41.6, -91.5?",
    expectedFunctions: ['getCurrentWeather'],
    description: "Current weather query with coordinates",
    category: 'weather',
    minResponseLength: 50,
    shouldContain: ['weather']
  },
  {
    question: "Give me the weather forecast for coordinates 41.6, -91.5",
    expectedFunctions: ['getWeatherForecast'],
    description: "Weather forecast query with coordinates",
    category: 'weather',
    minResponseLength: 100,
    shouldContain: ['forecast']
  },
  {
    question: "What's the weather at latitude 41.6, longitude -91.5?",
    expectedFunctions: ['getCurrentWeather'],
    description: "Location-specific weather query with coordinates",
    category: 'weather',
    minResponseLength: 50,
    shouldContain: ['weather']
  },
  {
    question: "Should I spray today? Check the weather conditions",
    expectedFunctions: [], // LLM should ask for location clarification, not call function immediately
    description: "Spray conditions weather query without location",
    category: 'weather',
    minResponseLength: 50,
    shouldContain: ['location', 'coordinates'], // Should ask for location/coordinates
    shouldNotContain: ['temperature', 'humidity'] // Should not provide weather data without location
  },
  {
    question: "Get weather forecast for coordinates 41.6, -91.5",
    expectedFunctions: ['getWeatherForecast'],
    description: "Coordinate-based weather forecast",
    category: 'weather',
    minResponseLength: 100,
    shouldContain: ['forecast', 'temperature']
  },
  {
    question: "What's the current weather?",
    expectedFunctions: [], // LLM should ask for location clarification
    description: "Ambiguous weather query without location",
    category: 'weather',
    minResponseLength: 30,
    shouldContain: ['location', 'provide'],
    shouldNotContain: ['temperature', 'humidity', 'wind']
  },

  // === COMBINED MULTI-SOURCE TESTS ===
  {
    question: "What's the weather at my field 4 caminos?",
    expectedFunctions: ['get_field_boundary', 'getCurrentWeather'],
    description: "Field-specific weather query (orchestrated)",
    category: 'combined',
    minResponseLength: 150,
    shouldContain: ['4 caminos', 'weather', 'temperature']
  },
  {
    question: "Show me my fields and current weather conditions",
    expectedFunctions: ['getFields', 'getCurrentWeather'],
    description: "Fields list with weather",
    category: 'combined',
    minResponseLength: 150,
    shouldContain: ['field', 'weather', 'temperature']
  },
  {
    question: "Can I do field operations today? Check my equipment and weather",
    expectedFunctions: ['getEquipment', 'getCurrentWeather'],
    description: "Equipment and weather for operations",
    category: 'combined',
    minResponseLength: 150,
    shouldContain: ['equipment', 'weather', 'operation']
  },
  {
    question: "What's the forecast for my farm operations this week?",
    expectedFunctions: ['getFields', 'getWeatherForecast'],
    description: "Farm overview with weather forecast",
    category: 'combined',
    minResponseLength: 200,
    shouldContain: ['farm', 'forecast', 'week']
  },
  {
    question: "Should I spray field 4 caminos today based on weather?",
    expectedFunctions: ['get_field_boundary', 'getCurrentWeather'],
    description: "Field-specific spray decision query",
    category: 'combined',
    minResponseLength: 150,
    shouldContain: ['4 caminos', 'spray', 'weather']
  }
]

// Test helper functions
async function sendChatMessage(question: string, selectedDataSources: string[] = ['weather', 'johndeere']) {
  // Use the test endpoint that bypasses authentication
  const response = await fetch(`${BASE_URL}/api/test/chat-completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: question }],
      selectedDataSources
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`)
  }

  return await response.json()
}

async function createTestSession() {
  // Skip session creation for regression tests since it requires authentication
  // The completion endpoint will handle session validation
  console.log(`📝 Using test session ID: ${TEST_SESSION_ID}`)
  return { id: TEST_SESSION_ID, title: 'API Regression Test Session' }
}

async function checkJohnDeereConnection() {
  try {
    const response = await fetch(`${BASE_URL}/api/johndeere/connection-status`)
    const data = await response.json()
    return data.connected === true
  } catch (error) {
    console.warn('Could not check John Deere connection status:', error)
    return false
  }
}

async function checkWeatherAPI() {
  try {
    const response = await fetch(`${BASE_URL}/api/weather?latitude=41.6&longitude=-91.5`)
    return response.ok
  } catch (error) {
    console.warn('Could not check Weather API status:', error)
    return false
  }
}

// Main test suite
describe('API Regression Test Suite', () => {
  let johnDeereConnected = false
  let weatherAvailable = false

  beforeAll(async () => {
    console.log('🚀 Starting API Regression Test Suite')
    console.log(`📍 Testing against: ${BASE_URL}`)
    
    // Check API availability
    johnDeereConnected = await checkJohnDeereConnection()
    weatherAvailable = await checkWeatherAPI()
    
    console.log(`🚜 John Deere API: ${johnDeereConnected ? '✅ Connected' : '❌ Not Connected'}`)
    console.log(`🌤️  Weather API: ${weatherAvailable ? '✅ Available' : '❌ Not Available'}`)
    
    // Create test session
    await createTestSession()
    console.log(`📝 Created test session: ${TEST_SESSION_ID}`)
  }, 30000)

  afterAll(async () => {
    console.log('🏁 API Regression Test Suite completed')
  })

  // Individual John Deere API tests
  describe('John Deere API Tests', () => {
    const johnDeereTests = TEST_SCENARIOS.filter(t => t.category === 'johndeere')

    test.each(johnDeereTests)('$description', async (scenario) => {
      if (!johnDeereConnected) {
        console.log(`⏭️  Skipping John Deere test: ${scenario.description} (not connected)`)
        return
      }

      console.log(`🚜 Testing: ${scenario.question}`)
      
      const result = await sendChatMessage(scenario.question, ['johndeere'])
      
      // Basic response validation
      expect(result).toBeDefined()
      expect(result.message).toBeDefined()
      expect(result.message.content).toBeDefined()
      
      const content = result.message.content
      const metadata = result.message.metadata || {}
      const functionCalls = metadata.functionCalls || []
      
      // Check minimum response length
      if (scenario.minResponseLength) {
        expect(content.length).toBeGreaterThanOrEqual(scenario.minResponseLength)
      }
      
      // Check expected function calls
      const calledFunctions = functionCalls.map((fc: any) => fc.name)
      for (const expectedFunc of scenario.expectedFunctions) {
        expect(calledFunctions).toContain(expectedFunc)
      }
      
      // Check content requirements
      if (scenario.shouldContain) {
        for (const term of scenario.shouldContain) {
          expect(content.toLowerCase()).toContain(term.toLowerCase())
        }
      }
      
      if (scenario.shouldNotContain) {
        for (const term of scenario.shouldNotContain) {
          expect(content.toLowerCase()).not.toContain(term.toLowerCase())
        }
      }
      
      console.log(`✅ John Deere test passed: ${scenario.description}`)
    }, 15000)
  })

  // Individual Weather API tests
  describe('Weather API Tests', () => {
    const weatherTests = TEST_SCENARIOS.filter(t => t.category === 'weather')

    test.each(weatherTests)('$description', async (scenario) => {
      if (!weatherAvailable) {
        console.log(`⏭️  Skipping Weather test: ${scenario.description} (not available)`)
        return
      }

      console.log(`🌤️  Testing: ${scenario.question}`)
      
      const result = await sendChatMessage(scenario.question, ['weather'])
      
      // Basic response validation
      expect(result).toBeDefined()
      expect(result.message).toBeDefined()
      expect(result.message.content).toBeDefined()
      
      const content = result.message.content
      const metadata = result.message.metadata || {}
      const functionCalls = metadata.functionCalls || []
      
      // Check minimum response length
      if (scenario.minResponseLength) {
        expect(content.length).toBeGreaterThanOrEqual(scenario.minResponseLength)
      }
      
      // Check expected function calls
      const calledFunctions = functionCalls.map((fc: any) => fc.name)
      for (const expectedFunc of scenario.expectedFunctions) {
        expect(calledFunctions).toContain(expectedFunc)
      }
      
      // Check content requirements
      if (scenario.shouldContain) {
        for (const term of scenario.shouldContain) {
          expect(content.toLowerCase()).toContain(term.toLowerCase())
        }
      }
      
      if (scenario.shouldNotContain) {
        for (const term of scenario.shouldNotContain) {
          expect(content.toLowerCase()).not.toContain(term.toLowerCase())
        }
      }
      
      console.log(`✅ Weather test passed: ${scenario.description}`)
    }, 15000)
  })

  // Combined multi-source API tests
  describe('Combined Multi-Source API Tests', () => {
    const combinedTests = TEST_SCENARIOS.filter(t => t.category === 'combined')

    test.each(combinedTests)('$description', async (scenario) => {
      if (!johnDeereConnected || !weatherAvailable) {
        console.log(`⏭️  Skipping Combined test: ${scenario.description} (missing connections)`)
        return
      }

      console.log(`🔗 Testing: ${scenario.question}`)
      
      const result = await sendChatMessage(scenario.question, ['weather', 'johndeere'])
      
      // Basic response validation
      expect(result).toBeDefined()
      expect(result.message).toBeDefined()
      expect(result.message.content).toBeDefined()
      
      const content = result.message.content
      const metadata = result.message.metadata || {}
      const functionCalls = metadata.functionCalls || []
      
      // Check minimum response length
      if (scenario.minResponseLength) {
        expect(content.length).toBeGreaterThanOrEqual(scenario.minResponseLength)
      }
      
      // Check expected function calls
      const calledFunctions = functionCalls.map((fc: any) => fc.name)
      for (const expectedFunc of scenario.expectedFunctions) {
        expect(calledFunctions).toContain(expectedFunc)
      }
      
      // Check content requirements
      if (scenario.shouldContain) {
        for (const term of scenario.shouldContain) {
          expect(content.toLowerCase()).toContain(term.toLowerCase())
        }
      }
      
      if (scenario.shouldNotContain) {
        for (const term of scenario.shouldNotContain) {
          expect(content.toLowerCase()).not.toContain(term.toLowerCase())
        }
      }
      
      console.log(`✅ Combined test passed: ${scenario.description}`)
    }, 20000)
  })

  // Special test for the field weather orchestration workflow
  describe('Field Weather Orchestration', () => {
    test('Field weather workflow should complete successfully', async () => {
      if (!johnDeereConnected || !weatherAvailable) {
        console.log('⏭️  Skipping Field Weather Orchestration test (missing connections)')
        return
      }

      console.log('🌾 Testing field weather orchestration workflow')
      
      const result = await sendChatMessage(
        "What's the weather at field 4 caminos right now?",
        ['weather', 'johndeere']
      )
      
      const content = result.message.content
      const metadata = result.message.metadata || {}
      const functionCalls = metadata.functionCalls || []
      const calledFunctions = functionCalls.map((fc: any) => fc.name)
      
      // Should call both boundary and weather functions
      expect(calledFunctions).toContain('get_field_boundary')
      expect(calledFunctions).toContain('getCurrentWeather')
      
      // Should mention the specific field and weather data
      expect(content.toLowerCase()).toContain('4 caminos')
      expect(content.toLowerCase()).toContain('temperature')
      
      // Should not contain Python code or error messages
      expect(content).not.toContain('print(')
      expect(content).not.toContain('get_current_weather(')
      expect(content.toLowerCase()).not.toContain('boundary data not available')
      
      // Should be a substantial response
      expect(content.length).toBeGreaterThan(100)
      
      console.log('✅ Field weather orchestration test passed')
    }, 25000)
  })

  // Error handling tests
  describe('Error Handling Tests', () => {
    test('Should handle invalid field names gracefully', async () => {
      if (!johnDeereConnected) {
        console.log('⏭️  Skipping error handling test (John Deere not connected)')
        return
      }

      const result = await sendChatMessage(
        "Show me boundary data for field NonExistentField123",
        ['johndeere']
      )
      
      const content = result.message.content
      
      // Should not crash and should provide helpful message
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(20)
      expect(content.toLowerCase()).toContain('field')
      
      console.log('✅ Error handling test passed')
    }, 15000)

    test('Should handle weather API with invalid coordinates', async () => {
      if (!weatherAvailable) {
        console.log('⏭️  Skipping weather error handling test (Weather API not available)')
        return
      }

      const result = await sendChatMessage(
        "Get weather for coordinates 999, 999",
        ['weather']
      )
      
      const content = result.message.content
      
      // Should not crash and should provide some response
      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(20)
      
      console.log('✅ Weather error handling test passed')
    }, 15000)
  })
}) 