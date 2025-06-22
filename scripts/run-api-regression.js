#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class APIRegressionTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const startTime = Date.now();
    
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      const result = {
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        responseTime,
        data: response.ok ? data : null,
        error: response.ok ? null : data
      };

      this.testResults.push(result);
      this.logResult(result);
      return result;
    } catch (error) {
      const result = {
        endpoint,
        method,
        status: 0,
        success: false,
        responseTime: Date.now() - startTime,
        data: null,
        error: error.message
      };
      
      this.testResults.push(result);
      this.logResult(result);
      return result;
    }
  }

  logResult(result) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.method} ${result.endpoint} (${result.responseTime}ms)`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  }

  async testHealthChecks() {
    console.log('\n🏥 Testing Health Checks...');
    await this.makeRequest('/api/health');
  }

  async testConnectionManagement() {
    console.log('\n📡 Testing Connection Management...');
    await this.makeRequest('/api/johndeere/connection-status');
  }

  async testOrganizationsAPI() {
    console.log('\n🏢 Testing Organizations API...');
    const orgResult = await this.makeRequest('/api/johndeere/organizations');
    
    if (orgResult.success && orgResult.data && orgResult.data.length > 0) {
      const orgId = orgResult.data[0].id;
      console.log(`Using organization ID: ${orgId}`);
      
      // Test organization-specific endpoints
      await this.makeRequest(`/api/johndeere/organizations/${orgId}/fields`);
      await this.makeRequest(`/api/johndeere/organizations/${orgId}/equipment`);
      await this.makeRequest(`/api/johndeere/organizations/${orgId}/farms`);
      await this.makeRequest(`/api/johndeere/organizations/${orgId}/operations`);
      await this.makeRequest(`/api/johndeere/organizations/${orgId}/assets`);
      await this.makeRequest(`/api/johndeere/organizations/${orgId}/comprehensive`);
    }
  }

  async testMCPTools() {
    console.log('\n🔧 Testing MCP Tools...');
    
    // Get available tools
    await this.makeRequest('/api/mcp/tools');
    
    // Test tool execution
    await this.makeRequest('/api/mcp/tools', 'POST', {
      toolName: 'getFieldRecommendations',
      parameters: {
        fieldId: 'test-field',
        season: 'spring',
        cropType: 'corn'
      }
    });
    
    await this.makeRequest('/api/mcp/tools', 'POST', {
      toolName: 'scheduleFieldOperation',
      parameters: {
        fieldId: 'test-field',
        operationType: 'planting',
        scheduledDate: '2024-03-15T10:00:00Z'
      }
    });
    
    await this.makeRequest('/api/mcp/tools', 'POST', {
      toolName: 'getEquipmentAlerts',
      parameters: {}
    });
  }

  async testChatAPI() {
    console.log('\n💬 Testing Chat API...');
    
    // Create session
    const sessionResult = await this.makeRequest('/api/chat/sessions', 'POST', {
      title: 'Regression Test Session',
      dataSource: 'johndeere'
    });
    
    // Test other chat endpoints
    await this.makeRequest('/api/chat/johndeere-data');
    
    if (sessionResult.success && sessionResult.data.id) {
      const sessionId = sessionResult.data.id;
      await this.makeRequest(`/api/chat/sessions/${sessionId}`);
      await this.makeRequest(`/api/chat/sessions/${sessionId}/messages`);
    }
  }

  async testAuthenticationAPI() {
    console.log('\n🔐 Testing Authentication...');
    await this.makeRequest('/api/auth/user');
    await this.makeRequest('/api/auth/johndeere/status');
  }

  async testFilesAPI() {
    console.log('\n📁 Testing Files API...');
    await this.makeRequest('/api/files/upload', 'POST', {
      filename: 'test.txt',
      content: 'test content'
    });
  }

  async testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling...');
    
    // Test 404
    await this.makeRequest('/api/nonexistent');
    
    // Test malformed requests
    await this.makeRequest('/api/mcp/tools', 'POST', 'invalid-json');
    
    // Test invalid organization
    await this.makeRequest('/api/johndeere/organizations/invalid-org/fields');
  }

  async testAllAPIsFromDocumentation() {
    console.log('\n📚 Testing APIs from Documentation...');
    
    // Based on John Deere API Reference documentation
    const documentedEndpoints = [
      // Connection Management
      { category: 'Connection Management', endpoint: '/api/johndeere/connection-status' },
      
      // Organizations
      { category: 'Organizations', endpoint: '/api/johndeere/organizations' },
      
      // Setup/Plan APIs (ag1+ scope)
      { category: 'Boundaries', endpoint: '/api/johndeere/organizations/test/boundaries' },
      { category: 'Crop Types', endpoint: '/api/johndeere/organizations/test/crop-types' },
      { category: 'Farms', endpoint: '/api/johndeere/organizations/test/farms' },
      { category: 'Fields', endpoint: '/api/johndeere/organizations/test/fields' },
      
      // Equipment APIs (eq1+ scope)
      { category: 'Equipment', endpoint: '/api/johndeere/organizations/test/equipment' },
      
      // Work Results APIs (ag2+ scope)
      { category: 'Field Operations', endpoint: '/api/johndeere/organizations/test/operations' },
      { category: 'Files', endpoint: '/api/johndeere/organizations/test/files' },
      
      // Insights & Monitoring APIs (ag3 scope)
      { category: 'Assets', endpoint: '/api/johndeere/organizations/test/assets' },
      
      // Application APIs
      { category: 'MCP Tools', endpoint: '/api/mcp/tools' },
      { category: 'Chat', endpoint: '/api/chat/sessions' },
      
      // Health & Debug
      { category: 'Health', endpoint: '/api/health' },
      { category: 'Debug', endpoint: '/api/debug/env' }
    ];

    console.log(`Testing ${documentedEndpoints.length} documented API endpoints...`);
    
    for (const { category, endpoint } of documentedEndpoints) {
      console.log(`\n${category}:`);
      await this.makeRequest(endpoint);
    }
  }

  generateReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;
    
    const avgResponseTime = Math.round(
      this.testResults.reduce((sum, r) => sum + r.responseTime, 0) / total
    );
    
    const report = `
╔══════════════════════════════════════════════════════════════╗
║                    REGRESSION TEST REPORT                    ║
╚══════════════════════════════════════════════════════════════╝

📊 SUMMARY:
  Total Tests: ${total}
  ✅ Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)
  ❌ Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)
  ⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s
  📈 Avg Response: ${avgResponseTime}ms

🔍 DETAILED RESULTS:

✅ SUCCESSFUL TESTS:
${this.testResults
  .filter(r => r.success)
  .map(r => `  ✓ ${r.method} ${r.endpoint} (${r.responseTime}ms)`)
  .join('\n') || '  None'}

❌ FAILED TESTS:
${this.testResults
  .filter(r => !r.success)
  .map(r => `  ✗ ${r.method} ${r.endpoint} - ${r.error}`)
  .join('\n') || '  None'}

📋 API COVERAGE ANALYSIS:
Based on John Deere API Reference Documentation:

✅ TESTED CATEGORIES:
  • Connection Management API
  • Organizations API  
  • Authentication & OAuth
  • Setup/Plan APIs (Fields, Farms, Boundaries)
  • Equipment APIs
  • Work Results APIs (Field Operations, Files)
  • Insights & Monitoring APIs (Assets)
  • Application APIs (MCP Tools, Chat)
  • Health & Debug APIs

🔗 SCOPE REQUIREMENTS TESTED:
  • Basic Access (Organizations)
  • ag1 Scope (Fields, Farms listing)
  • ag2 Scope (Field Operations)
  • ag3 Scope (Assets, Full data management)
  • eq1 Scope (Equipment listing)
  • files Scope (File operations)

⚠️  EXPECTED BEHAVIORS:
  • 403 Forbidden: Expected for unconnected organizations
  • 401 Unauthorized: Expected without valid authentication
  • Scope errors: Expected when insufficient permissions

🎯 RECOMMENDATIONS:
${failed === 0 
  ? '  All tests passed! API is functioning correctly.'
  : `  ${failed} test(s) failed. Review connection status and authentication.`
}

${passed / total < 0.5 
  ? '⚠️  SUCCESS RATE BELOW 50% - Check connection and authentication setup'
  : passed / total < 0.8 
    ? '⚠️  SUCCESS RATE MODERATE - Some connection/scope issues detected'
    : '✅ SUCCESS RATE GOOD - Most APIs responding correctly'
}
`;

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      avgResponseTime,
      testResults: this.testResults,
      report
    };
  }

  async runFullTest() {
    console.log('🚀 STARTING JOHN DEERE API REGRESSION TEST');
    console.log('=' .repeat(60));
    console.log('Based on John Deere API Reference Documentation');
    console.log('Testing all documented endpoints and error conditions\n');

    try {
      await this.testHealthChecks();
      await this.testConnectionManagement();
      await this.testAuthenticationAPI();
      await this.testOrganizationsAPI();
      await this.testMCPTools();
      await this.testChatAPI();
      await this.testFilesAPI();
      await this.testErrorHandling();
      await this.testAllAPIsFromDocumentation();
    } catch (error) {
      console.error(`💥 Critical error: ${error.message}`);
    }

    const results = this.generateReport();
    console.log(results.report);
    
    // Save results to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `regression-results-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${filename}`);
    
    return results;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new APIRegressionTester();
  tester.runFullTest()
    .then(results => {
      console.log('\n🏁 Regression test completed!');
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { APIRegressionTester }; 