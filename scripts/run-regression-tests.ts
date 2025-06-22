#!/usr/bin/env tsx

import { JohnDeereAPIClient } from '../src/lib/johndeere-api'
import { mcpToolExecutor } from '../src/lib/mcp-tools'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

interface APITestResult {
  endpoint: string
  method: string
  status: number
  success: boolean
  errorType?: string
  responseTime: number
  data?: any
  category: string
}

interface RegressionTestResults {
  totalTests: number
  passed: number
  failed: number
  testResults: APITestResult[]
  coverage: Record<string, boolean>
  summary: string
}

class JohnDeereRegressionTester {
  private apiClient: JohnDeereAPIClient
  private testResults: APITestResult[] = []
  private testOrganizationId?: string

  constructor() {
    this.apiClient = new JohnDeereAPIClient('sandbox')
  }

  private async makeAPIRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    headers?: Record<string, string>,
    category: string = 'general'
  ): Promise<APITestResult> {
    const startTime = Date.now()
    
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      })
      
      const responseTime = Date.now() - startTime
      const success = response.ok
      let data
      
      try {
        data = await response.json()
      } catch {
        data = await response.text()
      }

      return {
        endpoint,
        method,
        status: response.status,
        success,
        responseTime,
        data,
        category,
        errorType: success ? undefined : data?.error || data?.message || 'Unknown error'
      }
    } catch (error) {
      return {
        endpoint,
        method,
        status: 0,
        success: false,
        responseTime: Date.now() - startTime,
        errorType: error instanceof Error ? error.message : 'Network error',
        category
      }
    }
  }

  private recordTestResult(result: APITestResult) {
    this.testResults.push(result)
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.method} ${result.endpoint} (${result.responseTime}ms) [${result.category}]`)
    if (!result.success) {
      console.log(`   Error: ${result.errorType}`)
    }
  }

  async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...')
    
    try {
      const orgs = await this.apiClient.getOrganizations()
      if (orgs.length > 0) {
        this.testOrganizationId = orgs[0].id
        console.log(`✅ Using test organization: ${this.testOrganizationId}`)
      } else {
        console.warn('⚠️  No organizations found - some tests may be skipped')
      }
    } catch (error) {
      console.warn(`⚠️  Could not fetch organizations: ${error}`)
    }
  }

  // ===== CONNECTION MANAGEMENT API TESTS =====
  async testConnectionManagement(): Promise<void> {
    console.log('\n📡 Testing Connection Management API...')
    
    // Test connection status endpoint
    const statusResult = await this.makeAPIRequest(
      '/api/johndeere/connection-status',
      'GET',
      undefined,
      undefined,
      'connection-management'
    )
    this.recordTestResult(statusResult)

    // Test connection error handling
    try {
      if (this.testOrganizationId) {
        const connectionStatus = await this.apiClient.checkOrganizationConnection(this.testOrganizationId)
        console.log(`✅ Connection check completed: ${connectionStatus.isConnected ? 'Connected' : 'Not Connected'}`)
      }
    } catch (error) {
      console.log(`ℹ️  Connection check error (expected): ${error}`)
    }
  }

  // ===== ORGANIZATIONS API TESTS =====
  async testOrganizationsAPI(): Promise<void> {
    console.log('\n🏢 Testing Organizations API...')
    
    // Test get organizations
    const orgsResult = await this.makeAPIRequest(
      '/api/johndeere/organizations',
      'GET',
      undefined,
      undefined,
      'organizations'
    )
    this.recordTestResult(orgsResult)

    // Test organization data access
    if (this.testOrganizationId) {
      try {
        const dataAccess = await this.apiClient.testDataAccess(this.testOrganizationId)
        console.log(`✅ Data access test completed`)
        console.log(`   Fields: ${dataAccess.testResults.fields.success ? '✅' : '❌'} (${dataAccess.testResults.fields.count} items)`)
        console.log(`   Equipment: ${dataAccess.testResults.equipment.success ? '✅' : '❌'} (${dataAccess.testResults.equipment.count} items)`)
        console.log(`   Farms: ${dataAccess.testResults.farms.success ? '✅' : '❌'} (${dataAccess.testResults.farms.count} items)`)
        console.log(`   Files: ${dataAccess.testResults.files.success ? '✅' : '❌'} (${dataAccess.testResults.files.count} items)`)
      } catch (error) {
        console.log(`ℹ️  Data access test error (expected): ${error}`)
      }
    }
  }

  // ===== SETUP/PLAN APIs TESTS =====
  async testSetupPlanAPIs(): Promise<void> {
    console.log('\n🌾 Testing Setup/Plan APIs...')
    
    if (!this.testOrganizationId) {
      console.log('⏭️  Skipping Setup/Plan tests - no test organization available')
      return
    }

    // Test fields endpoint (ag1+ scope required)
    const fieldsResult = await this.makeAPIRequest(
      `/api/johndeere/organizations/${this.testOrganizationId}/fields`,
      'GET',
      undefined,
      undefined,
      'setup-plan'
    )
    this.recordTestResult(fieldsResult)

    // Test farms endpoint (ag1+ scope required)
    const farmsResult = await this.makeAPIRequest(
      `/api/johndeere/organizations/${this.testOrganizationId}/farms`,
      'GET',
      undefined,
      undefined,
      'setup-plan'
    )
    this.recordTestResult(farmsResult)

    // Test comprehensive data endpoint
    const comprehensiveResult = await this.makeAPIRequest(
      `/api/johndeere/organizations/${this.testOrganizationId}/comprehensive`,
      'GET',
      undefined,
      undefined,
      'setup-plan'
    )
    this.recordTestResult(comprehensiveResult)
  }

  // ===== EQUIPMENT APIs TESTS =====
  async testEquipmentAPIs(): Promise<void> {
    console.log('\n🚜 Testing Equipment APIs...')
    
    if (!this.testOrganizationId) {
      console.log('⏭️  Skipping Equipment tests - no test organization available')
      return
    }

    // Test equipment endpoint (eq1+ scope required)
    const equipmentResult = await this.makeAPIRequest(
      `/api/johndeere/organizations/${this.testOrganizationId}/equipment`,
      'GET',
      undefined,
      undefined,
      'equipment'
    )
    this.recordTestResult(equipmentResult)

    // Test equipment alerts via MCP tool
    try {
      const alertsResult = await mcpToolExecutor.executeTool('getEquipmentAlerts', {})
      console.log(`✅ Equipment alerts MCP tool: ${alertsResult.success ? 'Success' : 'Failed'}`)
    } catch (error) {
      console.log(`ℹ️  Equipment alerts MCP tool error: ${error}`)
    }
  }

  // ===== WORK RESULTS APIs TESTS =====
  async testWorkResultsAPIs(): Promise<void> {
    console.log('\n📊 Testing Work Results APIs...')
    
    if (!this.testOrganizationId) {
      console.log('⏭️  Skipping Work Results tests - no test organization available')
      return
    }

    // Test field operations endpoint (ag2+ scope required)
    const operationsResult = await this.makeAPIRequest(
      `/api/johndeere/organizations/${this.testOrganizationId}/operations`,
      'GET',
      undefined,
      undefined,
      'work-results'
    )
    this.recordTestResult(operationsResult)

    // Test assets endpoint (ag3 scope required)
    const assetsResult = await this.makeAPIRequest(
      `/api/johndeere/organizations/${this.testOrganizationId}/assets`,
      'GET',
      undefined,
      undefined,
      'work-results'
    )
    this.recordTestResult(assetsResult)
  }

  // ===== FILES API TESTS =====
  async testFilesAPI(): Promise<void> {
    console.log('\n📁 Testing Files API...')
    
    // Test file upload endpoint
    const uploadResult = await this.makeAPIRequest(
      '/api/files/upload',
      'POST',
      {
        filename: 'test-regression.txt',
        content: 'Regression test file content'
      },
      undefined,
      'files'
    )
    this.recordTestResult(uploadResult)

    // Test files listing via John Deere API
    if (this.testOrganizationId) {
      try {
        const files = await this.apiClient.getFiles(this.testOrganizationId)
        console.log(`✅ Files API test completed: ${files.length} files found`)
      } catch (error) {
        console.log(`ℹ️  Files API error (expected if not connected): ${error}`)
      }
    }
  }

  // ===== MCP TOOLS TESTS =====
  async testMCPTools(): Promise<void> {
    console.log('\n🔧 Testing MCP Tools...')
    
    // Test get available tools
    const toolsResult = await this.makeAPIRequest(
      '/api/mcp/tools',
      'GET',
      undefined,
      undefined,
      'mcp-tools'
    )
    this.recordTestResult(toolsResult)

    // Test field operation scheduling
    const scheduleResult = await this.makeAPIRequest(
      '/api/mcp/tools',
      'POST',
      {
        toolName: 'scheduleFieldOperation',
        parameters: {
          fieldId: 'regression-test-field',
          operationType: 'planting',
          scheduledDate: '2024-03-15T10:00:00Z',
          priority: 'medium'
        }
      },
      undefined,
      'mcp-tools'
    )
    this.recordTestResult(scheduleResult)

    // Test equipment maintenance scheduling
    const maintenanceResult = await this.makeAPIRequest(
      '/api/mcp/tools',
      'POST',
      {
        toolName: 'scheduleEquipmentMaintenance',
        parameters: {
          equipmentId: 'regression-test-equipment',
          maintenanceType: 'routine',
          scheduledDate: '2024-03-20T09:00:00Z',
          priority: 'medium'
        }
      },
      undefined,
      'mcp-tools'
    )
    this.recordTestResult(maintenanceResult)

    // Test field recommendations
    const recommendationsResult = await this.makeAPIRequest(
      '/api/mcp/tools',
      'POST',
      {
        toolName: 'getFieldRecommendations',
        parameters: {
          fieldId: 'regression-test-field',
          season: 'spring',
          cropType: 'corn'
        }
      },
      undefined,
      'mcp-tools'
    )
    this.recordTestResult(recommendationsResult)
  }

  // ===== CHAT API TESTS =====
  async testChatAPI(): Promise<void> {
    console.log('\n💬 Testing Chat API...')
    
    // Test create chat session
    const sessionResult = await this.makeAPIRequest(
      '/api/chat/sessions',
      'POST',
      {
        title: 'Regression Test Session',
        dataSource: 'johndeere'
      },
      undefined,
      'chat'
    )
    this.recordTestResult(sessionResult)

    // Test John Deere data endpoint
    const dataResult = await this.makeAPIRequest(
      '/api/chat/johndeere-data',
      'GET',
      undefined,
      undefined,
      'chat'
    )
    this.recordTestResult(dataResult)

    // Test generate title endpoint
    const titleResult = await this.makeAPIRequest(
      '/api/chat/generate-title',
      'POST',
      {
        messages: [
          { role: 'user', content: 'What fields do I have?' },
          { role: 'assistant', content: 'You have 3 fields in your organization.' }
        ]
      },
      undefined,
      'chat'
    )
    this.recordTestResult(titleResult)
  }

  // ===== AUTHENTICATION TESTS =====
  async testAuthentication(): Promise<void> {
    console.log('\n🔐 Testing Authentication...')
    
    // Test user endpoint
    const userResult = await this.makeAPIRequest(
      '/api/auth/user',
      'GET',
      undefined,
      undefined,
      'authentication'
    )
    this.recordTestResult(userResult)

    // Test John Deere auth status
    const authStatusResult = await this.makeAPIRequest(
      '/api/auth/johndeere/status',
      'GET',
      undefined,
      undefined,
      'authentication'
    )
    this.recordTestResult(authStatusResult)
  }

  // ===== ERROR HANDLING TESTS =====
  async testErrorHandling(): Promise<void> {
    console.log('\n⚠️  Testing Error Handling...')
    
    // Test 404 endpoint
    const notFoundResult = await this.makeAPIRequest(
      '/api/nonexistent-endpoint',
      'GET',
      undefined,
      undefined,
      'error-handling'
    )
    this.recordTestResult(notFoundResult)

    // Test malformed request
    const malformedResult = await this.makeAPIRequest(
      '/api/mcp/tools',
      'POST',
      'invalid-json-string',
      { 'Content-Type': 'text/plain' },
      'error-handling'
    )
    this.recordTestResult(malformedResult)

    // Test invalid organization ID
    const invalidOrgResult = await this.makeAPIRequest(
      '/api/johndeere/organizations/invalid-org-id/fields',
      'GET',
      undefined,
      undefined,
      'error-handling'
    )
    this.recordTestResult(invalidOrgResult)
  }

  // ===== HEALTH CHECK TESTS =====
  async testHealthChecks(): Promise<void> {
    console.log('\n🏥 Testing Health Checks...')
    
    // Test main health endpoint
    const healthResult = await this.makeAPIRequest(
      '/api/health',
      'GET',
      undefined,
      undefined,
      'health'
    )
    this.recordTestResult(healthResult)

    // Test debug environment endpoint
    const envResult = await this.makeAPIRequest(
      '/api/debug/env',
      'GET',
      undefined,
      undefined,
      'health'
    )
    this.recordTestResult(envResult)
  }

  // ===== SCOPE VALIDATION TESTS =====
  async testScopeValidation(): Promise<void> {
    console.log('\n🔍 Testing Scope Validation...')
    
    if (!this.testOrganizationId) {
      console.log('⏭️  Skipping scope validation tests - no test organization available')
      return
    }

    // Test different scope requirements
    const scopeTests = [
      { endpoint: 'fields', minScope: 'ag1', description: 'Fields listing' },
      { endpoint: 'operations', minScope: 'ag2', description: 'Field operations' },
      { endpoint: 'assets', minScope: 'ag3', description: 'Assets access' },
      { endpoint: 'equipment', minScope: 'eq1', description: 'Equipment listing' }
    ]

    for (const test of scopeTests) {
      try {
        console.log(`Testing ${test.description} (requires ${test.minScope}+)...`)
        const result = await this.makeAPIRequest(
          `/api/johndeere/organizations/${this.testOrganizationId}/${test.endpoint}`,
          'GET',
          undefined,
          undefined,
          'scope-validation'
        )
        this.recordTestResult(result)
      } catch (error) {
        console.log(`ℹ️  Scope test error for ${test.endpoint}: ${error}`)
      }
    }
  }

  generateReport(): RegressionTestResults {
    const passed = this.testResults.filter(r => r.success).length
    const failed = this.testResults.filter(r => !r.success).length
    const total = this.testResults.length

    // Calculate coverage by categories
    const categories = [...new Set(this.testResults.map(r => r.category))]
    const coverage = categories.reduce((acc, category) => {
      acc[category] = this.testResults.some(r => r.category === category)
      return acc
    }, {} as Record<string, boolean>)

    const summary = `
📊 JOHN DEERE API REGRESSION TEST RESULTS
==========================================

Total Tests: ${total}
✅ Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)
❌ Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)

📋 Coverage by Category:
${Object.entries(coverage)
  .map(([category, covered]) => `  ${category}: ${covered ? '✅' : '❌'}`)
  .join('\n')}

⚡ Performance Summary:
  Average Response Time: ${Math.round(this.testResults.reduce((sum, r) => sum + r.responseTime, 0) / total)}ms
  Slowest Request: ${Math.max(...this.testResults.map(r => r.responseTime))}ms
  Fastest Request: ${Math.min(...this.testResults.map(r => r.responseTime))}ms

🚨 Failed Tests:
${this.testResults
  .filter(r => !r.success)
  .map(r => `  ❌ ${r.method} ${r.endpoint} - ${r.errorType}`)
  .join('\n') || '  None'}

🔍 Key Findings:
  - Connection Management: ${coverage['connection-management'] ? 'Tested ✅' : 'Not tested ❌'}
  - Organizations API: ${coverage['organizations'] ? 'Tested ✅' : 'Not tested ❌'}
  - Field Operations: ${coverage['setup-plan'] || coverage['work-results'] ? 'Tested ✅' : 'Not tested ❌'}
  - Equipment Management: ${coverage['equipment'] ? 'Tested ✅' : 'Not tested ❌'}
  - MCP Tools: ${coverage['mcp-tools'] ? 'Tested ✅' : 'Not tested ❌'}
  - Authentication: ${coverage['authentication'] ? 'Tested ✅' : 'Not tested ❌'}
  - Error Handling: ${coverage['error-handling'] ? 'Tested ✅' : 'Not tested ❌'}

Total API Categories from Documentation: 10
Categories Tested: ${Object.values(coverage).filter(Boolean).length}
Coverage Percentage: ${((Object.values(coverage).filter(Boolean).length / 10) * 100).toFixed(1)}%
    `

    return {
      totalTests: total,
      passed,
      failed,
      testResults: this.testResults,
      coverage,
      summary
    }
  }

  async runFullRegressionTest(): Promise<RegressionTestResults> {
    console.log('🚀 STARTING JOHN DEERE API REGRESSION TEST SUITE')
    console.log('=' .repeat(60))
    
    const startTime = Date.now()
    
    try {
      await this.setupTestEnvironment()
      
      // Run all test categories
      await this.testHealthChecks()
      await this.testConnectionManagement()
      await this.testAuthentication()
      await this.testOrganizationsAPI()
      await this.testSetupPlanAPIs()
      await this.testEquipmentAPIs()
      await this.testWorkResultsAPIs()
      await this.testFilesAPI()
      await this.testMCPTools()
      await this.testChatAPI()
      await this.testScopeValidation()
      await this.testErrorHandling()
      
    } catch (error) {
      console.error(`💥 Critical error during testing: ${error}`)
    }
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    console.log(`\n⏱️  Total test time: ${(totalTime / 1000).toFixed(2)} seconds`)
    
    const report = this.generateReport()
    console.log(report.summary)
    
    return report
  }
}

// Main execution
async function main() {
  const tester = new JohnDeereRegressionTester()
  const results = await tester.runFullRegressionTest()
  
  // Save results to file
  const fs = await import('fs')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `regression-test-results-${timestamp}.json`
  
  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n💾 Results saved to: ${filename}`)
  
  // Exit with error code if tests failed
  process.exit(results.failed > 0 ? 1 : 0)
}

if (require.main === module) {
  main().catch(console.error)
}

export { JohnDeereRegressionTester } 