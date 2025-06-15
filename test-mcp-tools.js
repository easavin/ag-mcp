// Test script for MCP Tools
const baseUrl = 'http://localhost:3000'

async function testMCPTools() {
  console.log('🧪 Testing MCP Tools Implementation...\n')
  
  try {
    // Test 1: Get available MCP tools
    console.log('📋 Test 1: Getting available MCP tools...')
    const toolsResponse = await fetch(`${baseUrl}/api/mcp/tools`)
    const toolsData = await toolsResponse.json()
    
    if (toolsData.success) {
      console.log(`✅ Found ${toolsData.tools.length} MCP tools:`)
      toolsData.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`)
      })
    } else {
      console.log('❌ Failed to get MCP tools:', toolsData.error)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Test 2: Schedule a field operation
    console.log('🌾 Test 2: Scheduling a field operation...')
    const scheduleResponse = await fetch(`${baseUrl}/api/mcp/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolName: 'scheduleFieldOperation',
        parameters: {
          fieldId: 'field_001',
          operationType: 'planting',
          scheduledDate: '2024-04-15',
          equipmentId: 'planter_001',
          notes: 'Spring corn planting - optimal soil conditions',
          priority: 'high'
        }
      })
    })
    
    const scheduleData = await scheduleResponse.json()
    
    if (scheduleData.success) {
      console.log('✅ Field operation scheduled successfully!')
      console.log(`   Message: ${scheduleData.message}`)
      console.log(`   Action: ${scheduleData.actionTaken}`)
      console.log(`   Operation ID: ${scheduleData.data.id}`)
    } else {
      console.log('❌ Failed to schedule operation:', scheduleData.error)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Test 3: Get field recommendations
    console.log('🤖 Test 3: Getting AI field recommendations...')
    const recommendationsResponse = await fetch(`${baseUrl}/api/mcp/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolName: 'getFieldRecommendations',
        parameters: {
          fieldId: 'field_001',
          season: 'spring',
          cropType: 'corn'
        }
      })
    })
    
    const recommendationsData = await recommendationsResponse.json()
    
    if (recommendationsData.success) {
      console.log('✅ Field recommendations generated!')
      console.log(`   Message: ${recommendationsData.message}`)
      console.log('   Recommendations:')
      recommendationsData.data.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.type.toUpperCase()}: ${rec.recommendation}`)
        console.log(`      Priority: ${rec.priority}, Confidence: ${(rec.confidence * 100).toFixed(0)}%`)
      })
    } else {
      console.log('❌ Failed to get recommendations:', recommendationsData.error)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Test 4: Schedule equipment maintenance
    console.log('🔧 Test 4: Scheduling equipment maintenance...')
    const maintenanceResponse = await fetch(`${baseUrl}/api/mcp/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolName: 'scheduleEquipmentMaintenance',
        parameters: {
          equipmentId: 'tractor_001',
          maintenanceType: 'routine',
          scheduledDate: '2024-04-10',
          priority: 'medium',
          description: 'Pre-season maintenance check',
          estimatedCost: 450
        }
      })
    })
    
    const maintenanceData = await maintenanceResponse.json()
    
    if (maintenanceData.success) {
      console.log('✅ Equipment maintenance scheduled!')
      console.log(`   Message: ${maintenanceData.message}`)
      console.log(`   Maintenance ID: ${maintenanceData.data.id}`)
      console.log(`   Estimated Cost: $${maintenanceData.data.estimatedCost}`)
    } else {
      console.log('❌ Failed to schedule maintenance:', maintenanceData.error)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Test 5: Get equipment alerts
    console.log('⚠️ Test 5: Getting equipment alerts...')
    const alertsResponse = await fetch(`${baseUrl}/api/mcp/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolName: 'getEquipmentAlerts',
        parameters: {}
      })
    })
    
    const alertsData = await alertsResponse.json()
    
    if (alertsData.success) {
      console.log('✅ Equipment alerts retrieved!')
      console.log(`   Message: ${alertsData.message}`)
      console.log('   Active Alerts:')
      alertsData.data.forEach((alert, index) => {
        console.log(`   ${index + 1}. ${alert.alertType.toUpperCase()}: ${alert.message}`)
        console.log(`      Equipment: ${alert.equipmentId}, Severity: ${alert.severity}`)
      })
    } else {
      console.log('❌ Failed to get alerts:', alertsData.error)
    }
    
    console.log('\n🎉 MCP Tools testing completed!')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testMCPTools() 