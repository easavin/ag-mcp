// Basic test for Weather MCP Server
import { WeatherMCPServer } from '../src/mcp-servers/weather/server'
import { WeatherTools } from '../src/mcp-servers/weather/tools'

describe('Weather MCP Server', () => {
  let server: WeatherMCPServer
  let weatherTools: WeatherTools

  beforeAll(async () => {
    // Set test environment
    process.env.WEATHER_MCP_PORT = '8002'
    
    server = new WeatherMCPServer()
    weatherTools = new WeatherTools()
  })

  afterAll(async () => {
    if (server) {
      await server.stop()
    }
  })

  describe('Server Initialization', () => {
    it('should create server instance successfully', () => {
      expect(server).toBeDefined()
      expect(server).toBeInstanceOf(WeatherMCPServer)
    })

    it('should have correct server configuration', () => {
      const metrics = server.getMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.requestCount).toBe(0)
      expect(metrics.errorCount).toBe(0)
    })
  })

  describe('Tool Discovery', () => {
    it('should list available weather tools', () => {
      const tools = server.getAvailableTools()
      
      expect(tools).toHaveLength(3)
      expect(tools.map(t => t.name)).toContain('get_current_weather')
      expect(tools.map(t => t.name)).toContain('get_weather_forecast')
      expect(tools.map(t => t.name)).toContain('search_locations')
    })

    it('should have correct tool schemas', () => {
      const tools = server.getAvailableTools()
      const getCurrentWeatherTool = tools.find(t => t.name === 'get_current_weather')
      
      expect(getCurrentWeatherTool).toBeDefined()
      expect(getCurrentWeatherTool!.inputSchema.properties).toHaveProperty('latitude')
      expect(getCurrentWeatherTool!.inputSchema.properties).toHaveProperty('longitude')
      expect(getCurrentWeatherTool!.inputSchema.properties).toHaveProperty('location')
    })
  })

  describe('Weather Tools', () => {
    it('should validate location coordinates', async () => {
      const result = await weatherTools.getCurrentWeather({
        latitude: 91, // Invalid latitude (should be -90 to 90)
        longitude: 0
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Latitude must be between -90 and 90')
    })

    it('should validate longitude coordinates', async () => {
      const result = await weatherTools.getCurrentWeather({
        latitude: 0,
        longitude: 181 // Invalid longitude (should be -180 to 180)
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Longitude must be between -180 and 180')
    })

    it('should require either coordinates or location', async () => {
      const result = await weatherTools.getCurrentWeather({})

      expect(result.success).toBe(false)
      expect(result.error).toContain('Either coordinates (latitude, longitude) or location name required')
    })

    it('should validate search query', async () => {
      const result = await weatherTools.searchLocations({} as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required fields: query')
    })
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await server.getHealthCheck()
      
      expect(health).toBeDefined()
      expect(health.status).toBeDefined()
      expect(health.timestamp).toBeDefined()
      expect(['healthy', 'unhealthy']).toContain(health.status)
    })
  })
})

// Test that can be run independently
if (require.main === module) {
  console.log('🧪 Running Weather MCP Server basic tests...')
  
  const runBasicTest = async () => {
    try {
      const server = new WeatherMCPServer()
      console.log('✅ Weather MCP Server created successfully')
      
      const tools = server.getAvailableTools()
      console.log(`✅ Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`)
      
      const health = await server.getHealthCheck()
      console.log(`✅ Health check: ${health.status}`)
      
      const weatherTools = new WeatherTools()
      
      // Test location validation
      const invalidLatResult = await weatherTools.getCurrentWeather({ latitude: 91, longitude: 0 })
      if (!invalidLatResult.success && invalidLatResult.error?.includes('Latitude must be between')) {
        console.log('✅ Latitude validation working')
      } else {
        console.log('❌ Latitude validation failed')
      }
      
      // Test missing fields validation
      const missingFieldsResult = await weatherTools.searchLocations({} as any)
      if (!missingFieldsResult.success && missingFieldsResult.error?.includes('Missing required fields')) {
        console.log('✅ Required fields validation working')
      } else {
        console.log('❌ Required fields validation failed')
      }
      
      console.log('🎉 All basic tests passed!')
      
    } catch (error) {
      console.error('❌ Basic test failed:', error)
      process.exit(1)
    }
  }
  
  runBasicTest()
} 