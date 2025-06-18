const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test scenarios that simulate real user interactions
const TEST_SCENARIOS = [
  {
    name: 'Organization Access',
    userMessage: 'What organizations do I have access to?',
    expectedFunctions: ['getOrganizations'],
    expectedDataTypes: ['organizations']
  },
  {
    name: 'Fields Information',
    userMessage: 'Tell me about my fields',
    expectedFunctions: ['getFields'],
    expectedDataTypes: ['fields']
  },
  {
    name: 'Equipment Information',
    userMessage: 'What equipment do I have?',
    expectedFunctions: ['getEquipment'],
    expectedDataTypes: ['equipment']
  },
  {
    name: 'Files Access',
    userMessage: 'Show me my files',
    expectedFunctions: ['list_john_deere_files'],
    expectedDataTypes: ['files']
  },
  {
    name: 'Field Operations',
    userMessage: 'What operations have been performed on my fields?',
    expectedFunctions: ['getOperations'],
    expectedDataTypes: ['operations']
  },
  {
    name: 'Comprehensive Data',
    userMessage: 'Give me a complete overview of my farm data',
    expectedFunctions: ['getComprehensiveData', 'getOrganizations'],
    expectedDataTypes: ['fields', 'equipment', 'operations']
  },
  {
    name: 'Field Boundary',
    userMessage: 'Show me the boundary for Field 2',
    expectedFunctions: ['get_field_boundary'],
    expectedDataTypes: ['boundary']
  },
  {
    name: 'Equipment Details',
    userMessage: 'Give me details about equipment ID 123456',
    expectedFunctions: ['get_equipment_details'],
    expectedDataTypes: ['equipment']
  }
];

// Helper function to create a chat session
async function createChatSession() {
  const response = await fetch(`${BASE_URL}/api/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'John Deere API Integration Test',
      dataSource: 'johndeere'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create chat session: ${response.status}`);
  }
  
  const data = await response.json();
  return data.id;
}

// Helper function to send a message and get response with retry
async function sendMessage(sessionId, message, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      // First, add the message
      const messageResponse = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          role: 'user'
        })
      });
      
      if (messageResponse.status === 429) {
        console.log(`Rate limited on message send, waiting ${(i + 1) * 3} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 3000));
        continue;
      }
      
      if (!messageResponse.ok) {
        throw new Error(`Failed to send message: ${messageResponse.status}`);
      }
      
      // Get all messages for the session
      const messagesResponse = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}/messages`);
      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }
      
      const messagesData = await messagesResponse.json();
      const messages = messagesData.messages || [];
      
      // Then get the completion with the messages
      const completionResponse = await fetch(`${BASE_URL}/api/chat/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          messages: messages,
          currentDataSource: 'johndeere'
        })
      });
      
      if (completionResponse.status === 429) {
        console.log(`Rate limited on completion, waiting ${(i + 1) * 3} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 3000));
        continue;
      }
      
      if (!completionResponse.ok) {
        const errorText = await completionResponse.text();
        throw new Error(`Failed to get completion: ${completionResponse.status} - ${errorText}`);
      }
      
      return await completionResponse.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Helper function to check connection status with retry
async function checkConnectionStatus(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/johndeere/connection-status`);
      
      if (response.status === 429) {
        console.log(`Rate limited, waiting ${(i + 1) * 2} seconds before retry ${i + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Connection status check failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Helper function to get available MCP tools
async function getAvailableMCPTools() {
  const response = await fetch(`${BASE_URL}/api/mcp/tools`);
  
  if (!response.ok) {
    throw new Error(`Failed to get MCP tools: ${response.status}`);
  }
  
  return await response.json();
}

// Main test function
async function runComprehensiveTest() {
  console.log('🚀 Starting John Deere LLM Integration Test');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check connection status
    console.log('\n📡 Step 1: Checking John Deere Connection Status');
    const connectionStatus = await checkConnectionStatus();
    console.log(`Connection Status: ${connectionStatus.status}`);
    
    if (connectionStatus.status !== 'connected') {
      console.log('❌ John Deere connection is not fully connected');
      console.log('Connection details:', JSON.stringify(connectionStatus, null, 2));
      return;
    }
    
    console.log('✅ John Deere connection is fully connected');
    if (connectionStatus.testResults) {
      console.log('API Test Results:');
      Object.entries(connectionStatus.testResults).forEach(([api, result]) => {
        console.log(`  ${api}: ${result.success ? '✅' : '❌'} (${result.count || 0} items)`);
      });
    }
    
    // Step 2: Check available MCP tools
    console.log('\n🛠️ Step 2: Checking Available MCP Tools');
    const mcpTools = await getAvailableMCPTools();
    console.log(`Available MCP Tools: ${mcpTools.tools.length}`);
    mcpTools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    
    // Step 3: Create chat session
    console.log('\n💬 Step 3: Creating Chat Session');
    const sessionId = await createChatSession();
    console.log(`Created session: ${sessionId}`);
    
    // Step 4: Run test scenarios
    console.log('\n🧪 Step 4: Running Test Scenarios');
    const results = [];
    
    for (const scenario of TEST_SCENARIOS) {
      console.log(`\n--- Testing: ${scenario.name} ---`);
      console.log(`User message: "${scenario.userMessage}"`);
      
      try {
        const startTime = Date.now();
        const response = await sendMessage(sessionId, scenario.userMessage);
        const duration = Date.now() - startTime;
        
        // Analyze the response
        const content = response.message?.content || response.content || '';
        const functionCalls = response.message?.metadata?.functionCalls || response.functionCalls || [];
        
        const analysis = {
          name: scenario.name,
          success: !!content,
          duration: duration,
          hasContent: !!content,
          contentLength: content.length,
          functionCalls: functionCalls,
          errors: response.error ? [response.error] : []
        };
        
        // Check if expected functions were called
        const expectedFunctions = scenario.expectedFunctions || [];
        const calledFunctions = analysis.functionCalls.map(fc => fc.name);
        const functionsMatched = expectedFunctions.some(expected => 
          calledFunctions.includes(expected)
        );
        
        analysis.functionsMatched = functionsMatched;
        analysis.expectedFunctions = expectedFunctions;
        analysis.calledFunctions = calledFunctions;
        
        results.push(analysis);
        
        console.log(`Response: ${analysis.success ? '✅' : '❌'}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Content length: ${analysis.contentLength} chars`);
        console.log(`Functions called: ${calledFunctions.join(', ') || 'none'}`);
        console.log(`Expected functions: ${expectedFunctions.join(', ')}`);
        console.log(`Functions matched: ${functionsMatched ? '✅' : '❌'}`);
        
        if (analysis.errors.length > 0) {
          console.log(`Errors: ${analysis.errors.join(', ')}`);
        }
        
        // Show a snippet of the response
        if (content) {
          const snippet = content.substring(0, 200);
          console.log(`Response snippet: "${snippet}${content.length > 200 ? '...' : ''}"`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.push({
          name: scenario.name,
          success: false,
          error: error.message,
          duration: 0
        });
      }
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Step 5: Generate summary report
    console.log('\n📊 Step 5: Summary Report');
    console.log('=' .repeat(60));
    
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success).length;
    const functionsMatchedTests = results.filter(r => r.functionsMatched).length;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful Responses: ${successfulTests}/${totalTests} (${Math.round(successfulTests/totalTests*100)}%)`);
    console.log(`Function Calls Matched: ${functionsMatchedTests}/${totalTests} (${Math.round(functionsMatchedTests/totalTests*100)}%)`);
    console.log(`Average Response Time: ${Math.round(averageDuration)}ms`);
    
    console.log('\nDetailed Results:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const functions = result.functionsMatched ? '✅' : '❌';
      console.log(`  ${status} ${functions} ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    // Step 6: API Coverage Analysis
    console.log('\n🔍 Step 6: API Coverage Analysis');
    const allFunctionsCalled = [...new Set(results.flatMap(r => r.calledFunctions || []))];
    const availableFunctions = mcpTools.tools.map(t => t.name);
    const johnDeereFunctions = ['getOrganizations', 'getFields', 'getEquipment', 'getOperations', 'getComprehensiveData'];
    
    console.log('Functions Called During Tests:');
    allFunctionsCalled.forEach(func => {
      console.log(`  ✅ ${func}`);
    });
    
    console.log('\nUncalled Functions:');
    availableFunctions.forEach(func => {
      if (!allFunctionsCalled.includes(func)) {
        console.log(`  ⚠️ ${func}`);
      }
    });
    
    // Final assessment
    console.log('\n🎯 Final Assessment');
    console.log('=' .repeat(60));
    
    if (successfulTests === totalTests && functionsMatchedTests >= totalTests * 0.8) {
      console.log('🎉 EXCELLENT: LLM has full access to John Deere APIs and responds appropriately!');
    } else if (successfulTests >= totalTests * 0.8) {
      console.log('✅ GOOD: Most tests passed, minor issues may exist');
    } else {
      console.log('⚠️ NEEDS IMPROVEMENT: Several tests failed, integration needs work');
    }
    
    console.log('\nRecommendations:');
    if (functionsMatchedTests < totalTests) {
      console.log('- Some expected functions were not called by the LLM');
      console.log('- Consider improving function descriptions or system prompts');
    }
    
    if (allFunctionsCalled.length < availableFunctions.length * 0.7) {
      console.log('- Many available functions were not tested');
      console.log('- Consider adding more diverse test scenarios');
    }
    
    console.log('\n✅ Comprehensive test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = {
  runComprehensiveTest,
  TEST_SCENARIOS
}; 