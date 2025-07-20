// Simple standalone test for John Deere MCP Server
import { JohnDeereMCPServer } from '../src/mcp-servers/john-deere/server'
import { JohnDeereTokens } from '../src/mcp-servers/john-deere/types'

console.log('🧪 Running John Deere MCP Server basic tests...')

const runBasicTest = async () => {
  try {
    // Test 1: Server Creation
    console.log('\n1. Testing server creation...')
    const server = new JohnDeereMCPServer()
    console.log('   ✅ John Deere MCP Server created successfully')
    
    // Test 2: Tool Discovery
    console.log('\n2. Testing tool discovery...')
    const tools = server.getAvailableTools()
    console.log(`   ✅ Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`)
    
    if (tools.length !== 3) {
      throw new Error(`Expected 3 tools, got ${tools.length}`)
    }
    
    const expectedTools = ['get_organizations', 'get_fields', 'get_equipment']
    for (const expectedTool of expectedTools) {
      if (!tools.find(t => t.name === expectedTool)) {
        throw new Error(`Missing expected tool: ${expectedTool}`)
      }
    }
    console.log('   ✅ All expected tools found')
    
    // Test 3: Health Check (without auth)
    console.log('\n3. Testing health check without authentication...')
    const healthNoAuth = await server.getHealthCheck()
    console.log(`   ✅ Health check: ${healthNoAuth.status}`)
    console.log(`   ✅ Authentication status: ${healthNoAuth.details?.authentication || 'disconnected'}`)
    
    // Test 4: Set Mock Authentication
    console.log('\n4. Testing mock authentication...')
    const mockTokens: JohnDeereTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
      scope: 'ag1 ag2 ag3'
    }
    
    server.setMockTokens(mockTokens)
    console.log('   ✅ Mock tokens set')
    
    // Test 5: Health Check with Authentication
    console.log('\n5. Testing health check with authentication...')
    const healthWithAuth = await server.getHealthCheck()
    console.log(`   ✅ Health check: ${healthWithAuth.status}`)
    console.log(`   ✅ Authentication status: ${healthWithAuth.details?.authentication || 'disconnected'}`)
    
    // Test 6: Tool Execution - Get Organizations
    console.log('\n6. Testing tool execution - get_organizations...')
    const orgsResult = await server.testTool('get_organizations', {})
    if (orgsResult.success) {
      console.log('   ✅ Organizations tool executed successfully')
      console.log(`   ✅ Found ${orgsResult.data?.count || 0} organizations`)
    } else {
      throw new Error(`Organizations tool failed: ${orgsResult.error}`)
    }
    
    // Test 7: Tool Execution - Get Fields
    console.log('\n7. Testing tool execution - get_fields...')
    const fieldsResult = await server.testTool('get_fields', { organizationId: 'org-123' })
    if (fieldsResult.success) {
      console.log('   ✅ Fields tool executed successfully')
      console.log(`   ✅ Found ${fieldsResult.data?.count || 0} fields`)
    } else {
      throw new Error(`Fields tool failed: ${fieldsResult.error}`)
    }
    
    // Test 8: Tool Execution - Get Equipment
    console.log('\n8. Testing tool execution - get_equipment...')
    const equipmentResult = await server.testTool('get_equipment', { organizationId: 'org-123' })
    if (equipmentResult.success) {
      console.log('   ✅ Equipment tool executed successfully')
      console.log(`   ✅ Found ${equipmentResult.data?.count || 0} equipment items`)
    } else {
      throw new Error(`Equipment tool failed: ${equipmentResult.error}`)
    }
    
    // Test 9: Tool Validation - Missing Required Fields
    console.log('\n9. Testing input validation...')
    const invalidFieldsResult = await server.testTool('get_fields', {})
    if (!invalidFieldsResult.success && invalidFieldsResult.error?.includes('Missing required fields')) {
      console.log('   ✅ Input validation working correctly')
    } else {
      throw new Error('Input validation not working properly')
    }
    
    // Test 10: Server Metrics
    console.log('\n10. Testing server metrics...')
    const metrics = server.getMetrics()
    if (typeof metrics.uptime !== 'number' || metrics.uptime < 0) {
      throw new Error('Invalid uptime metric')
    }
    if (typeof metrics.requestCount !== 'number' || metrics.requestCount < 0) {
      throw new Error('Invalid request count metric')
    }
    console.log('   ✅ Server metrics are valid')
    console.log(`   ✅ Requests processed: ${metrics.requestCount}`)
    
    console.log('\n🎉 All John Deere MCP Server tests passed!')
    console.log('\n📊 Test Summary:')
    console.log('   ✅ Server creation and initialization')
    console.log('   ✅ Tool discovery and registration')
    console.log('   ✅ Health check functionality')
    console.log('   ✅ Mock authentication setup')
    console.log('   ✅ Tool execution (organizations, fields, equipment)')
    console.log('   ✅ Input validation and error handling')
    console.log('   ✅ Server metrics collection')
    
    await server.stop()
    return true
    
  } catch (error) {
    console.error('\n❌ John Deere MCP Server test failed:', error)
    return false
  }
}

// Run the test
runBasicTest().then(success => {
  process.exit(success ? 0 : 1)
}) 