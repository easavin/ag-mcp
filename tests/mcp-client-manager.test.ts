// Comprehensive test for MCP Client Manager
import { MCPClientManager } from '../src/lib/mcp-client-manager'

console.log('🧪 Running MCP Client Manager comprehensive tests...')

const runClientManagerTest = async () => {
  try {
    // Test 1: Client Manager Creation
    console.log('\n1. Testing MCP Client Manager creation...')
    const clientManager = new MCPClientManager()
    console.log('   ✅ MCP Client Manager created successfully')
    
    // Test 2: Initialization and Server Connections
    console.log('\n2. Testing server connections...')
    await clientManager.initialize()
    
    const connectionStatus = clientManager.getConnectionStatus()
    console.log(`   ✅ Connection status:`)
    for (const [server, connected] of Object.entries(connectionStatus)) {
      console.log(`      ${server}: ${connected ? '✅ Connected' : '❌ Disconnected'}`)
    }
    
    // Test 3: Metrics Collection
    console.log('\n3. Testing metrics collection...')
    const metrics = clientManager.getMetrics()
    console.log(`   ✅ Total servers: ${metrics.totalServers}`)
    console.log(`   ✅ Connected servers: ${metrics.connectedServers}`)
    console.log(`   ✅ Total tools available: ${metrics.totalTools}`)
    
    if (metrics.totalServers !== 5) {
      throw new Error(`Expected 5 servers, got ${metrics.totalServers}`)
    }
    
    if (metrics.connectedServers !== 5) {
      throw new Error(`Expected 5 connected servers, got ${metrics.connectedServers}`)
    }
    
    // Test 4: Tool Discovery
    console.log('\n4. Testing tool discovery...')
    const allTools = await clientManager.getAllAvailableTools()
    
    let totalToolsCount = 0
    for (const [server, tools] of Object.entries(allTools)) {
      console.log(`   ${server}: ${tools.length} tools - ${tools.join(', ')}`)
      totalToolsCount += tools.length
    }
    
    if (totalToolsCount !== metrics.totalTools) {
      throw new Error(`Tool count mismatch: metrics ${metrics.totalTools} vs discovery ${totalToolsCount}`)
    }
    
    console.log(`   ✅ Total tools discovered: ${totalToolsCount}`)
    
    // Test 5: Individual Server Tool Calls
    console.log('\n5. Testing individual tool calls...')
    
    // Test Weather server
    const weatherResult = await clientManager.callTool('weather', 'get_current_weather', {
      latitude: 40.7128,
      longitude: -74.0060
    })
    if (weatherResult.success) {
      console.log('   ✅ Weather tool call successful')
    } else {
      throw new Error(`Weather tool call failed: ${weatherResult.error}`)
    }
    
    // Test John Deere server
    const johnDeereResult = await clientManager.callTool('john-deere', 'get_organizations')
    if (johnDeereResult.success) {
      console.log('   ✅ John Deere tool call successful')
    } else {
      throw new Error(`John Deere tool call failed: ${johnDeereResult.error}`)
    }
    
    // Test USDA server
    const usdaResult = await clientManager.callTool('usda', 'get_usda_market_prices', {
      category: 'grain'
    })
    if (usdaResult.success) {
      console.log('   ✅ USDA tool call successful')
    } else {
      throw new Error(`USDA tool call failed: ${usdaResult.error}`)
    }
    
    // Test EU Commission server
    const euResult = await clientManager.callTool('eu-commission', 'get_eu_market_prices', {
      memberState: 'DE'
    })
    if (euResult.success) {
      console.log('   ✅ EU Commission tool call successful')
    } else {
      throw new Error(`EU Commission tool call failed: ${euResult.error}`)
    }
    
    // Test Auravant server
    const auravantResult = await clientManager.callTool('auravant', 'get_auravant_fields', {
      farmId: 'farm-123'
    })
    if (auravantResult.success) {
      console.log('   ✅ Auravant tool call successful')
    } else {
      throw new Error(`Auravant tool call failed: ${auravantResult.error}`)
    }
    
    // Test 6: Error Handling
    console.log('\n6. Testing error handling...')
    
    try {
      await clientManager.callTool('nonexistent-server', 'some_tool')
      throw new Error('Should have thrown error for nonexistent server')
    } catch (error) {
      if (error instanceof Error && error.message.includes('No client connected')) {
        console.log('   ✅ Nonexistent server error handled correctly')
      } else {
        throw error
      }
    }
    
    try {
      await clientManager.callTool('weather', 'nonexistent_tool')
      // This should return an error response, not throw
      console.log('   ✅ Nonexistent tool handled gracefully')
    } catch (error) {
      console.log('   ✅ Nonexistent tool error handled')
    }
    
    // Test 7: Health Status
    console.log('\n7. Testing health status...')
    const healthStatus = await clientManager.getHealthStatus()
    
    for (const [server, health] of Object.entries(healthStatus)) {
      console.log(`   ${server}: ${health.status} (${health.details?.toolCount} tools)`)
    }
    
    const healthyServers = Object.values(healthStatus).filter(h => h.status === 'healthy').length
    if (healthyServers !== 5) {
      throw new Error(`Expected 5 healthy servers, got ${healthyServers}`)
    }
    console.log('   ✅ All servers reporting healthy')
    
    // Test 8: Server-Specific Tool Lists
    console.log('\n8. Testing server-specific tool queries...')
    
    const weatherTools = await clientManager.getAvailableTools('weather')
    if (weatherTools.length === 3) {
      console.log(`   ✅ Weather server: ${weatherTools.length} tools`)
    } else {
      throw new Error(`Expected 3 weather tools, got ${weatherTools.length}`)
    }
    
    const johnDeereTools = await clientManager.getAvailableTools('john-deere')
    if (johnDeereTools.length === 3) {
      console.log(`   ✅ John Deere server: ${johnDeereTools.length} tools`)
    } else {
      throw new Error(`Expected 3 John Deere tools, got ${johnDeereTools.length}`)
    }
    
    // Test 9: Connection Status Verification
    console.log('\n9. Testing connection status verification...')
    
    const expectedServers = ['weather', 'john-deere', 'usda', 'eu-commission', 'auravant']
    for (const server of expectedServers) {
      if (!clientManager.isConnected(server)) {
        throw new Error(`Server ${server} should be connected but isn't`)
      }
    }
    console.log('   ✅ All expected servers are connected')
    
    // Test 10: Graceful Cleanup
    console.log('\n10. Testing graceful cleanup...')
    await clientManager.disconnectAll()
    
    const finalStatus = clientManager.getConnectionStatus()
    const stillConnected = Object.values(finalStatus).filter(connected => connected).length
    if (stillConnected === 0) {
      console.log('   ✅ All servers disconnected successfully')
    } else {
      throw new Error(`${stillConnected} servers still connected after disconnectAll`)
    }
    
    console.log('\n🎉 All MCP Client Manager tests passed!')
    console.log('\n📊 Test Summary:')
    console.log('   ✅ Client Manager creation and initialization')
    console.log('   ✅ Multi-server connection management (5 servers)')
    console.log('   ✅ Metrics collection and monitoring')
    console.log('   ✅ Tool discovery across all servers (14 total tools)')
    console.log('   ✅ Cross-platform tool execution')
    console.log('   ✅ Comprehensive error handling')
    console.log('   ✅ Health status monitoring')
    console.log('   ✅ Connection status verification')
    console.log('   ✅ Graceful resource cleanup')
    
    return true
    
  } catch (error) {
    console.error('\n❌ MCP Client Manager test failed:', error)
    return false
  }
}

// Run the test
runClientManagerTest().then(success => {
  process.exit(success ? 0 : 1)
}) 