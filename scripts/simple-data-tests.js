#!/usr/bin/env node

/**
 * Simple Data Retrieval Test Cases
 * 
 * These tests focus on the AI's ability to retrieve and present agricultural data
 * clearly, rather than making complex agronomist-level decisions.
 */

const testCases = [
  {
    id: 'market-prices-1',
    category: 'Market Data',
    name: 'EU Market Prices Query',
    query: "What are the current corn prices in Spain?",
    expectedFunctions: ['getEUMarketPrices'],
    selectedDataSources: ['eu-commission'],
    minResponseLength: 100,
    shouldHaveVisualizations: true
  },
  
  {
    id: 'market-comparison-2',
    category: 'Market Data',
    name: 'EU vs US Market Comparison',
    query: "Compare wheat prices between EU and US markets",
    expectedFunctions: ['getEUMarketPrices', 'getUSDAMarketPrices'],
    selectedDataSources: ['eu-commission', 'usda'],
    minResponseLength: 150,
    shouldHaveVisualizations: true
  },

  {
    id: 'weather-forecast-3',
    category: 'Weather Data',
    name: 'Weather Forecast Query',
    query: "What is the 5-day weather forecast for Barcelona?",
    expectedFunctions: ['getWeatherForecast'],
    selectedDataSources: ['weather'],
    minResponseLength: 100,
    shouldHaveVisualizations: true
  },

  {
    id: 'field-information-4',
    category: 'Field Data',
    name: 'Field Information Query',
    query: "Show me information about my field North 40",
    expectedFunctions: ['get_field_boundary'],
    selectedDataSources: ['johndeere'],
    minResponseLength: 80,
    shouldHaveVisualizations: false
  },

  {
    id: 'field-list-5',
    category: 'Field Data',
    name: 'List All Fields',
    query: "What fields do I have?",
    expectedFunctions: ['getFields'],
    selectedDataSources: ['johndeere'],
    minResponseLength: 50,
    shouldHaveVisualizations: true
  },

  {
    id: 'production-data-6',
    category: 'Production Data',
    name: 'EU Production Statistics',
    query: "How much corn was produced in France last year?",
    expectedFunctions: ['getEUProductionData'],
    selectedDataSources: ['eu-commission'],
    minResponseLength: 100,
    shouldHaveVisualizations: true
  }
];

/**
 * Run a single test case
 */
async function runTestCase(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Query: "${testCase.query}"`);
  console.log(`🔗 Data Sources: ${testCase.selectedDataSources.join(', ')}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/test/chat-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: testCase.query }],
        selectedDataSources: testCase.selectedDataSources
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    
    // Validate response
    const results = validateResponse(testCase, data, duration);
    
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Results: ${results.score}/100`);
    
    if (results.score >= 70) {
      console.log(`✅ PASS: ${testCase.name}`);
    } else {
      console.log(`❌ FAIL: ${testCase.name}`);
      console.log(`   Issues: ${results.issues.join(', ')}`);
    }
    
    return {
      testCase: testCase.id,
      passed: results.score >= 70,
      score: results.score,
      duration,
      issues: results.issues,
      response: data
    };

  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`);
    return {
      testCase: testCase.id,
      passed: false,
      score: 0,
      duration: Date.now() - startTime,
      issues: [error.message],
      response: null
    };
  }
}

/**
 * Validate test response against expected criteria
 */
function validateResponse(testCase, data, duration) {
  const issues = [];
  let score = 0;

  // Check if response exists
  if (!data || !data.message) {
    issues.push('No response message');
    return { score: 0, issues };
  }

  const message = data.message;
  const metadata = message.metadata || {};
  const functionCalls = metadata.functionCalls || [];

  // Check response length (20 points)
  if (message.content && message.content.length >= testCase.minResponseLength) {
    score += 20;
  } else {
    issues.push(`Response too short (${message.content?.length || 0} < ${testCase.minResponseLength})`);
  }

  // Check function calls (40 points - more important for simple data retrieval)
  const calledFunctions = functionCalls.map(fc => fc.name);
  const expectedFunctions = testCase.expectedFunctions;
  const functionsMatched = expectedFunctions.filter(fn => calledFunctions.includes(fn));
  
  if (functionsMatched.length >= expectedFunctions.length) {
    score += 40;
  } else {
    const missing = expectedFunctions.filter(fn => !calledFunctions.includes(fn));
    issues.push(`Missing functions: ${missing.join(', ')}`);
    // Partial credit for some functions
    score += Math.floor((functionsMatched.length / expectedFunctions.length) * 40);
  }

  // Check visualizations (20 points)
  if (testCase.shouldHaveVisualizations) {
    if (metadata.visualizations && metadata.visualizations.length > 0) {
      score += 20;
    } else {
      issues.push('No visualizations generated');
    }
  } else {
    score += 20; // Skip if not expected
  }

  // Check response time (20 points)
  if (duration < 15000) { // Under 15 seconds for simple queries
    score += 20;
  } else {
    issues.push(`Slow response: ${duration}ms`);
  }

  return { score, issues };
}

/**
 * Generate test report
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 SIMPLE DATA RETRIEVAL TEST RESULTS');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`\n📊 Overall Results: ${passed}/${total} tests passed (${passRate}%)`);

  // Group by category
  const categories = {};
  testCases.forEach(tc => {
    if (!categories[tc.category]) categories[tc.category] = [];
    categories[tc.category].push(tc.id);
  });

  console.log('\n📋 Results by Category:');
  Object.entries(categories).forEach(([category, testIds]) => {
    const categoryResults = results.filter(r => testIds.includes(r.testCase));
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
    
    console.log(`   ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });

  // Failed tests details
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(result => {
      const testCase = testCases.find(tc => tc.id === result.testCase);
      console.log(`   ${testCase.name}: Score ${result.score}/100`);
      result.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    });
  }

  // Performance stats
  const durations = results.filter(r => r.duration).map(r => r.duration);
  if (durations.length > 0) {
    const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('\n⏱️  Performance:');
    console.log(`   Average: ${avgDuration}ms`);
    console.log(`   Range: ${minDuration}ms - ${maxDuration}ms`);
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting Simple Data Retrieval Tests...');
  console.log(`📋 Running ${testCases.length} test cases`);

  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health');
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✅ Server is healthy and ready');
  } catch (error) {
    console.error('❌ Server is not accessible. Please start the development server:');
    console.error('   npm run dev');
    process.exit(1);
  }

  const results = [];
  
  // Run tests sequentially to avoid overwhelming the system
  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate final report
  generateReport(results);
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results/simple-data-${timestamp}.json`;
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Ensure directory exists
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        passRate: ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1)
      },
      results
    }, null, 2));
    
    console.log(`💾 Detailed results saved to: ${filename}`);
  } catch (error) {
    console.warn(`⚠️  Could not save results: ${error.message}`);
  }

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testCases, runTestCase, validateResponse }; 