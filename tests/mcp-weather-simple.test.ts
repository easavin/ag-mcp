// Simple standalone test for Weather MCP Server
import { WeatherMCPServer } from '../src/mcp-servers/weather/server'
import { WeatherTools } from '../src/mcp-servers/weather/tools'

console.log('🧪 Running Weather MCP Server basic tests...')

const runBasicTest = async () => {
  try {
    // Test 1: Server Creation
    console.log('\n1. Testing server creation...')
    const server = new WeatherMCPServer()
    console.log('   ✅ Weather MCP Server created successfully')
    
    // Test 2: Tool Discovery
    console.log('\n2. Testing tool discovery...')
    const tools = server.getAvailableTools()
    console.log(`   ✅ Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`)
    
    if (tools.length !== 3) {
      throw new Error(`Expected 3 tools, got ${tools.length}`)
    }
    
    const expectedTools = ['get_current_weather', 'get_weather_forecast', 'search_locations']
    for (const expectedTool of expectedTools) {
      if (!tools.find(t => t.name === expectedTool)) {
        throw new Error(`Missing expected tool: ${expectedTool}`)
      }
    }
    console.log('   ✅ All expected tools found')
    
    // Test 3: Health Check
    console.log('\n3. Testing health check...')
    const health = await server.getHealthCheck()
    console.log(`   ✅ Health check: ${health.status}`)
    
    if (!health.timestamp) {
      throw new Error('Health check missing timestamp')
    }
    console.log('   ✅ Health check format is correct')
    
    // Test 4: Tool Validation
    console.log('\n4. Testing tool validation...')
    const weatherTools = new WeatherTools()
    
    // Test invalid latitude
    const invalidLatResult = await weatherTools.getCurrentWeather({ latitude: 91, longitude: 0 })
    if (!invalidLatResult.success && invalidLatResult.error?.includes('Latitude must be between')) {
      console.log('   ✅ Latitude validation working')
    } else {
      throw new Error('Latitude validation failed')
    }
    
    // Test invalid longitude  
    const invalidLonResult = await weatherTools.getCurrentWeather({ latitude: 0, longitude: 181 })
    if (!invalidLonResult.success && invalidLonResult.error?.includes('Longitude must be between')) {
      console.log('   ✅ Longitude validation working')
    } else {
      throw new Error('Longitude validation failed')
    }
    
    // Test missing parameters
    const missingParamsResult = await weatherTools.getCurrentWeather({})
    if (!missingParamsResult.success && missingParamsResult.error?.includes('Either coordinates')) {
      console.log('   ✅ Missing parameters validation working')
    } else {
      throw new Error('Missing parameters validation failed')
    }
    
    // Test missing required fields for search
    const missingFieldsResult = await weatherTools.searchLocations({} as any)
    if (!missingFieldsResult.success && missingFieldsResult.error?.includes('Missing required fields')) {
      console.log('   ✅ Required fields validation working')
    } else {
      throw new Error('Required fields validation failed')
    }
    
    // Test 5: Server Metrics
    console.log('\n5. Testing server metrics...')
    const metrics = server.getMetrics()
    if (typeof metrics.uptime !== 'number' || metrics.uptime < 0) {
      throw new Error('Invalid uptime metric')
    }
    if (typeof metrics.requestCount !== 'number' || metrics.requestCount < 0) {
      throw new Error('Invalid request count metric')
    }
    console.log('   ✅ Server metrics are valid')
    
    // Test 6: Tool Schema Validation
    console.log('\n6. Testing tool schemas...')
    const getCurrentWeatherTool = tools.find(t => t.name === 'get_current_weather')
    if (!getCurrentWeatherTool) {
      throw new Error('get_current_weather tool not found')
    }
    
    const schema = getCurrentWeatherTool.inputSchema
    if (!schema.properties?.latitude || !schema.properties?.longitude || !schema.properties?.location) {
      throw new Error('Tool schema missing required properties')
    }
    console.log('   ✅ Tool schemas are correct')
    
    console.log('\n🎉 All Weather MCP Server tests passed!')
    console.log('\n📊 Test Summary:')
    console.log('   ✅ Server creation and initialization')
    console.log('   ✅ Tool discovery and registration')
    console.log('   ✅ Health check functionality')
    console.log('   ✅ Input validation and error handling')
    console.log('   ✅ Server metrics collection')
    console.log('   ✅ Tool schema validation')
    
    await server.stop()
    return true
    
  } catch (error) {
    console.error('\n❌ Weather MCP Server test failed:', error)
    return false
  }
}

// Run the test
runBasicTest().then(success => {
  process.exit(success ? 0 : 1)
}) 