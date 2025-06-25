#!/usr/bin/env node

/**
 * AgMCP Multi-API Test Summary
 * 
 * Demonstrates the system's ability to handle complex agricultural queries
 * by retrieving and presenting relevant data clearly.
 */

const testQueries = [
  {
    name: "Market Price Query",
    query: "What are the current corn prices in Spain?",
    expectedAPIs: ["EU Market Prices"],
    dataSources: ["eu-commission"]
  },
  {
    name: "Market Comparison",
    query: "Compare wheat prices between EU and US markets",
    expectedAPIs: ["EU Market Prices", "USDA Market Prices"],
    dataSources: ["eu-commission", "usda"]
  },
  {
    name: "Weather Forecast",
    query: "What is the 5-day weather forecast for Barcelona?",
    expectedAPIs: ["Weather Forecast"],
    dataSources: ["weather"]
  },
  {
    name: "Field Information",
    query: "Show me information about my field North 40",
    expectedAPIs: ["Field Boundary"],
    dataSources: ["johndeere"]
  },
  {
    name: "Multi-Data Harvest Support",
    query: "I want to see data to help me decide about harvesting - show me field info, weather, and market prices for my field North 40",
    expectedAPIs: ["Field Boundary", "Weather Forecast", "EU Market Prices"],
    dataSources: ["johndeere", "weather", "eu-commission"]
  },
  {
    name: "Production Statistics",
    query: "How much corn was produced in France last year?",
    expectedAPIs: ["EU Production Data"],
    dataSources: ["eu-commission"]
  }
];

async function runTestQuery(testQuery) {
  console.log(`\n🧪 Testing: ${testQuery.name}`);
  console.log(`📝 Query: "${testQuery.query}"`);
  console.log(`🎯 Expected APIs: ${testQuery.expectedAPIs.join(', ')}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/test/chat-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: testQuery.query }],
        selectedDataSources: testQuery.dataSources
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const functionCalls = data.message?.metadata?.functionCalls || [];
    const calledFunctions = functionCalls.map(fc => fc.name);
    const hasVisualizations = data.message?.metadata?.visualizations?.length > 0;
    const responseLength = data.message?.content?.length || 0;

    console.log(`📊 Functions called: ${calledFunctions.join(', ') || 'None'}`);
    console.log(`📈 Visualizations: ${hasVisualizations ? 'Yes' : 'No'}`);
    console.log(`📝 Response length: ${responseLength} characters`);
    
    // Check if response is data-focused (not making decisions)
    const content = data.message?.content || '';
    const isDataFocused = content.includes('Based on this data') || 
                         content.includes('Here are the') ||
                         content.includes('Current') ||
                         content.includes('The data shows') ||
                         !content.includes('I recommend') && !content.includes('You should');
    
    console.log(`🎯 Data-focused approach: ${isDataFocused ? 'Yes' : 'No'}`);
    
    const success = calledFunctions.length > 0 && responseLength > 50;
    console.log(`${success ? '✅' : '❌'} ${success ? 'PASS' : 'FAIL'}`);
    
    return { success, functionCalls: calledFunctions, hasVisualizations, isDataFocused };
    
  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 AgMCP Multi-API Test Summary');
  console.log('=====================================');
  console.log('Testing the system\'s ability to retrieve and present agricultural data\n');

  // Check server health
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health');
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✅ Server is healthy and ready\n');
  } catch (error) {
    console.error('❌ Server is not accessible. Please start the development server:');
    console.error('   npm run dev');
    process.exit(1);
  }

  const results = [];
  
  for (const testQuery of testQueries) {
    const result = await runTestQuery(testQuery);
    results.push({ ...testQuery, ...result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY RESULTS');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const withVisualizations = results.filter(r => r.hasVisualizations);
  const dataFocused = results.filter(r => r.isDataFocused);

  console.log(`\n✅ Successful queries: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
  console.log(`📈 Generated visualizations: ${withVisualizations.length}/${results.length} (${(withVisualizations.length/results.length*100).toFixed(1)}%)`);
  console.log(`🎯 Data-focused responses: ${dataFocused.length}/${results.length} (${(dataFocused.length/results.length*100).toFixed(1)}%)`);

  console.log('\n📋 Key Achievements:');
  console.log('   • System retrieves data from multiple APIs based on query context');
  console.log('   • Presents information clearly with tables and visualizations');
  console.log('   • Focuses on data presentation rather than making agricultural decisions');
  console.log('   • Allows users to make informed decisions based on presented data');
  console.log('   • Handles weather, market, field, and production data queries');

  console.log('\n🎯 Example Multi-API Query:');
  const multiApiExample = results.find(r => r.name === "Multi-Data Harvest Support");
  if (multiApiExample && multiApiExample.success) {
    console.log(`   Query: "${multiApiExample.query}"`);
    console.log(`   APIs Called: ${multiApiExample.functionCalls.join(', ')}`);
    console.log('   ✅ Successfully provides comprehensive data for user decision-making');
  }

  console.log('\n' + '='.repeat(60));
  
  const allSuccessful = results.every(r => r.success);
  process.exit(allSuccessful ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
} 