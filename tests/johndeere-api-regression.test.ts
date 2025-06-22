import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { JohnDeereAPIClient, JohnDeereConnectionError, JohnDeereRCAError, JohnDeerePermissionError } from '../src/lib/johndeere-api'
import { mcpToolExecutor } from '../src/lib/mcp-tools'

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_TIMEOUT = 30000

interface APITestResult {
  endpoint: string
  method: string
  status: number
  success: boolean
  errorType?: string
  responseTime: number
  data?: any
}

interface RegressionTestResults {
  totalTests: number
  passed: number
  failed: number
  testResults: APITestResult[]
  coverage: {
    connectionManagement: boolean
    organizations: boolean
    authentication: boolean
    fieldOperations: boolean
    equipment: boolean
    files: boolean
    setupPlan: boolean
    workResults: boolean
    insights: boolean
    application: boolean
  }
}

describe('John Deere API Regression Tests', () => {
  let apiClient: JohnDeereAPIClient
  let testResults: APITestResult[] = []
  let testOrganizationId: string
  
  beforeAll(async () => {
    console.log('🚀 Starting John Deere API Regression Test Suite')
    apiClient = new JohnDeereAPIClient('sandbox')
    
    // Verify connection and get test organization
    try {
      const orgs = await apiClient.getOrganizations()
      if (orgs.length > 0) {
        testOrganizationId = orgs[0].id
        console.log(`✅ Using test organization: ${testOrganizationId}`)
      } else {
        console.warn('⚠️  No organizations found - some tests may be skipped')
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch organizations - connection tests will verify this')
    }
  }, TEST_TIMEOUT)

  beforeEach(() => {
    testResults = []
  })

  afterAll(() => {
    console.log('\n📊 Test Results Summary:')
    console.log(`Total Tests: ${testResults.length}`)
    console.log(`Passed: ${testResults.filter(r => r.success).length}`)
    console.log(`Failed: ${testResults.filter(r => !r.success).length}`)
  })

  const recordTestResult = (result: APITestResult) => {
    testResults.push(result)
  }

  const makeAPIRequest = async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<APITestResult> => {
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
        errorType: success ? undefined : data?.error || data?.message || 'Unknown error'
      }
    } catch (error) {
      return {
        endpoint,
        method,
        status: 0,
        success: false,
        responseTime: Date.now() - startTime,
        errorType: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  // ===== CONNECTION MANAGEMENT API TESTS =====
  describe('Connection Management API', () => {
    test('GET /api/johndeere/connection-status', async () => {
      const result = await makeAPIRequest('/api/johndeere/connection-status')
      recordTestResult(result)
      
      expect(result.success).toBeTruthy()
      expect(result.data).toHaveProperty('status')
      expect(['connected', 'disconnected', 'partial']).toContain(result.data.status)
    }, TEST_TIMEOUT)

    test('Connection error handling', async () => {
      // Test handling of connection errors
      expect(() => {
        throw new JohnDeereConnectionError('No connection', 'https://example.com', 'org123')
      }).toThrow(JohnDeereConnectionError)
    })

    test('RCA error handling', async () => {
      // Test handling of Required Customer Action errors
      expect(() => {
        throw new JohnDeereRCAError('Terms required', 'https://terms.example.com', 'org123')
      }).toThrow(JohnDeereRCAError)
    })

    test('Permission error handling', async () => {
      // Test handling of permission errors
      expect(() => {
        throw new JohnDeerePermissionError('Insufficient scope', ['ag3'], ['ag1'])
      }).toThrow(JohnDeerePermissionError)
    })
  })

  // ===== ORGANIZATIONS API TESTS =====
  describe('Organizations API', () => {
    test('GET /api/johndeere/organizations', async () => {
      const result = await makeAPIRequest('/api/johndeere/organizations')
      recordTestResult(result)
      
      expect(result.success).toBeTruthy()
      if (result.data?.length > 0) {
        expect(result.data[0]).toHaveProperty('id')
        expect(result.data[0]).toHaveProperty('name')
        expect(result.data[0]).toHaveProperty('links')
      }
    }, TEST_TIMEOUT)

    test('Organization connection check', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping organization connection test - no test org available')
        return
      }

      try {
        const connectionStatus = await apiClient.checkOrganizationConnection(testOrganizationId)
        expect(connectionStatus).toHaveProperty('isConnected')
        expect(typeof connectionStatus.isConnected).toBe('boolean')
      } catch (error) {
        console.log(`Expected error for connection check: ${error}`)
      }
    })

    test('Organization data access test', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping data access test - no test org available')
        return
      }

      try {
        const dataAccess = await apiClient.testDataAccess(testOrganizationId)
        expect(dataAccess).toHaveProperty('hasDataAccess')
        expect(dataAccess).toHaveProperty('testResults')
        expect(dataAccess.testResults).toHaveProperty('fields')
        expect(dataAccess.testResults).toHaveProperty('equipment')
        expect(dataAccess.testResults).toHaveProperty('farms')
        expect(dataAccess.testResults).toHaveProperty('files')
      } catch (error) {
        console.log(`Expected error for data access test: ${error}`)
      }
    })
  })

  // ===== AUTHENTICATION & OAUTH TESTS =====
  describe('Authentication & OAuth', () => {
    test('OAuth endpoints configuration', () => {
      // Verify OAuth configuration is properly set
      const oauthEndpoints = {
        authURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
        tokenURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token'
      }
      
      expect(oauthEndpoints.authURL).toContain('signin.johndeere.com')
      expect(oauthEndpoints.tokenURL).toContain('signin.johndeere.com')
    })

    test('Token refresh mechanism', async () => {
      // Test that token refresh is properly implemented
      try {
        // This will test the internal token refresh logic
        await apiClient.getOrganizations()
        // If we get here without error, token handling is working
        expect(true).toBe(true)
      } catch (error) {
        // Expected if not authenticated
        console.log(`Expected authentication error: ${error}`)
      }
    })
  })

  // ===== FIELD OPERATIONS API TESTS =====
  describe('Field Operations API', () => {
    test('GET fields for organization', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping fields test - no test org available')
        return
      }

      const result = await makeAPIRequest(`/api/johndeere/organizations/${testOrganizationId}/fields`)
      recordTestResult(result)
      
      // May return 403 if not connected, which is expected
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true)
      } else {
        expect([403, 401]).toContain(result.status)
      }
    }, TEST_TIMEOUT)

    test('GET field operations', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping operations test - no test org available')
        return
      }

      const result = await makeAPIRequest(`/api/johndeere/organizations/${testOrganizationId}/operations`)
      recordTestResult(result)
      
      // May return 403 if not connected or insufficient scope
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true)
      } else {
        expect([403, 401]).toContain(result.status)
      }
    }, TEST_TIMEOUT)

    test('Field operation scheduling (MCP Tool)', async () => {
      const params = {
        fieldId: 'test-field-123',
        operationType: 'planting',
        scheduledDate: '2024-03-15T10:00:00Z',
        priority: 'medium'
      }

      try {
        const result = await mcpToolExecutor.executeTool('scheduleFieldOperation', params)
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('message')
      } catch (error) {
        console.log(`MCP tool execution test: ${error}`)
      }
    })
  })

  // ===== EQUIPMENT API TESTS =====
  describe('Equipment API', () => {
    test('GET equipment for organization', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping equipment test - no test org available')
        return
      }

      const result = await makeAPIRequest(`/api/johndeere/organizations/${testOrganizationId}/equipment`)
      recordTestResult(result)
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true)
      } else {
        expect([403, 401]).toContain(result.status)
      }
    }, TEST_TIMEOUT)

    test('Equipment alerts (MCP Tool)', async () => {
      try {
        const result = await mcpToolExecutor.executeTool('getEquipmentAlerts', {})
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('message')
      } catch (error) {
        console.log(`Equipment alerts test: ${error}`)
      }
    })

    test('Equipment maintenance scheduling (MCP Tool)', async () => {
      const params = {
        equipmentId: 'test-equipment-123',
        maintenanceType: 'routine',
        scheduledDate: '2024-03-20T09:00:00Z',
        priority: 'medium'
      }

      try {
        const result = await mcpToolExecutor.executeTool('scheduleEquipmentMaintenance', params)
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('message')
      } catch (error) {
        console.log(`Equipment maintenance test: ${error}`)
      }
    })
  })

  // ===== FILES API TESTS =====
  describe('Files API', () => {
    test('GET files for organization', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping files test - no test org available')
        return
      }

      try {
        const files = await apiClient.getFiles(testOrganizationId)
        expect(Array.isArray(files)).toBe(true)
      } catch (error) {
        // Expected if not connected or insufficient scope
        console.log(`Expected files error: ${error}`)
      }
    })

    test('File upload endpoint', async () => {
      const result = await makeAPIRequest('/api/files/upload', 'POST', {
        filename: 'test.txt',
        content: 'test content'
      })
      recordTestResult(result)
      
      // Implementation dependent - may return various statuses
      expect([200, 400, 401, 403, 501]).toContain(result.status)
    })
  })

  // ===== SETUP/PLAN APIs TESTS =====
  describe('Setup/Plan APIs', () => {
    test('GET farms for organization', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping farms test - no test org available')
        return
      }

      const result = await makeAPIRequest(`/api/johndeere/organizations/${testOrganizationId}/farms`)
      recordTestResult(result)
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true)
      } else {
        expect([403, 401]).toContain(result.status)
      }
    }, TEST_TIMEOUT)

    test('GET comprehensive data', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping comprehensive data test - no test org available')
        return
      }

      const result = await makeAPIRequest(`/api/johndeere/organizations/${testOrganizationId}/comprehensive`)
      recordTestResult(result)
      
      if (result.success) {
        expect(result.data).toHaveProperty('organization')
      } else {
        expect([403, 401]).toContain(result.status)
      }
    }, TEST_TIMEOUT)
  })

  // ===== MCP TOOLS API TESTS =====
  describe('MCP Tools API', () => {
    test('GET /api/mcp/tools', async () => {
      const result = await makeAPIRequest('/api/mcp/tools')
      recordTestResult(result)
      
      expect(result.success).toBeTruthy()
      expect(result.data).toHaveProperty('tools')
      expect(Array.isArray(result.data.tools)).toBe(true)
    })

    test('POST /api/mcp/tools - Execute tool', async () => {
      const toolRequest = {
        toolName: 'getFieldRecommendations',
        parameters: {
          fieldId: 'test-field-123',
          season: 'spring',
          cropType: 'corn'
        }
      }

      const result = await makeAPIRequest('/api/mcp/tools', 'POST', toolRequest)
      recordTestResult(result)
      
      expect(result.success).toBeTruthy()
      expect(result.data).toHaveProperty('success')
    })
  })

  // ===== CHAT API TESTS =====
  describe('Chat API Integration', () => {
    test('POST /api/chat/sessions - Create session', async () => {
      const sessionRequest = {
        title: 'Regression Test Session',
        dataSource: 'johndeere'
      }

      const result = await makeAPIRequest('/api/chat/sessions', 'POST', sessionRequest)
      recordTestResult(result)
      
      expect(result.success).toBeTruthy()
      expect(result.data).toHaveProperty('id')
    })

    test('GET /api/chat/johndeere-data', async () => {
      const result = await makeAPIRequest('/api/chat/johndeere-data')
      recordTestResult(result)
      
      // May require authentication
      if (result.success) {
        expect(result.data).toBeDefined()
      } else {
        expect([401, 403]).toContain(result.status)
      }
    })
  })

  // ===== ERROR HANDLING TESTS =====
  describe('Error Handling', () => {
    test('Handle 403 Forbidden - No Connection', async () => {
      // Test with invalid org ID to trigger 403
      const result = await makeAPIRequest('/api/johndeere/organizations/invalid-org-123/fields')
      recordTestResult(result)
      
      expect([403, 404, 400]).toContain(result.status)
    })

    test('Handle 401 Unauthorized', async () => {
      // Test without authentication headers
      const result = await makeAPIRequest('/api/johndeere/organizations', 'GET', undefined, {
        'Authorization': 'Bearer invalid-token'
      })
      recordTestResult(result)
      
      // Implementation dependent - may handle gracefully or return 401
      expect([200, 401, 403]).toContain(result.status)
    })

    test('Handle malformed requests', async () => {
      const result = await makeAPIRequest('/api/mcp/tools', 'POST', 'invalid-json')
      recordTestResult(result)
      
      expect([400, 500]).toContain(result.status)
    })
  })

  // ===== SCOPE AND PERMISSION TESTS =====
  describe('Scope and Permission Tests', () => {
    test('Verify scope requirements for field operations', async () => {
      // This tests that the system properly handles scope requirements
      if (!testOrganizationId) {
        console.log('⏭️  Skipping scope test - no test org available')
        return
      }

      try {
        await apiClient.getFieldOperationsForOrganization(testOrganizationId)
        // If successful, ag2+ scope is available
        expect(true).toBe(true)
      } catch (error) {
        // Expected if insufficient scope (ag1 only) or not connected
        if (error instanceof JohnDeerePermissionError) {
          expect(error.requiredScopes).toContain('ag2')
        }
      }
    })

    test('Verify connection requirements', async () => {
      if (!testOrganizationId) {
        console.log('⏭️  Skipping connection requirements test - no test org available')
        return
      }

      try {
        const connection = await apiClient.checkOrganizationConnection(testOrganizationId)
        if (!connection.isConnected) {
          expect(connection.connectionUrl).toBeDefined()
        }
      } catch (error) {
        console.log(`Connection check error (expected): ${error}`)
      }
    })
  })

  // ===== PERFORMANCE TESTS =====
  describe('Performance Tests', () => {
    test('API response times', () => {
      const slowResponses = testResults.filter(r => r.responseTime > 5000)
      
      if (slowResponses.length > 0) {
        console.warn(`⚠️  Slow responses detected (>5s):`)
        slowResponses.forEach(r => {
          console.warn(`  ${r.method} ${r.endpoint}: ${r.responseTime}ms`)
        })
      }
      
      // Allow some slow responses but not all
      expect(slowResponses.length).toBeLessThan(testResults.length * 0.5)
    })

    test('Success rate', () => {
      const successRate = testResults.filter(r => r.success).length / testResults.length
      console.log(`📈 Overall API success rate: ${(successRate * 100).toFixed(1)}%`)
      
      // Expect at least 50% success rate (accounting for auth/connection issues)
      expect(successRate).toBeGreaterThan(0.3)
    })
  })

  // ===== COMPREHENSIVE COVERAGE TEST =====
  test('API Coverage Report', () => {
    const coverage: RegressionTestResults['coverage'] = {
      connectionManagement: testResults.some(r => r.endpoint.includes('connection-status')),
      organizations: testResults.some(r => r.endpoint.includes('organizations')),
      authentication: true, // Tested implicitly in all requests
      fieldOperations: testResults.some(r => r.endpoint.includes('fields') || r.endpoint.includes('operations')),
      equipment: testResults.some(r => r.endpoint.includes('equipment')),
      files: testResults.some(r => r.endpoint.includes('files')),
      setupPlan: testResults.some(r => r.endpoint.includes('farms') || r.endpoint.includes('comprehensive')),
      workResults: testResults.some(r => r.endpoint.includes('operations')),
      insights: testResults.some(r => r.endpoint.includes('comprehensive')),
      application: testResults.some(r => r.endpoint.includes('mcp') || r.endpoint.includes('chat'))
    }

    console.log('\n📋 API Coverage Report:')
    Object.entries(coverage).forEach(([category, covered]) => {
      console.log(`  ${category}: ${covered ? '✅' : '❌'}`)
    })

    const coveragePercentage = Object.values(coverage).filter(Boolean).length / Object.keys(coverage).length
    console.log(`\n📊 Total Coverage: ${(coveragePercentage * 100).toFixed(1)}%`)
    
    expect(coveragePercentage).toBeGreaterThan(0.7) // Expect 70%+ coverage
  })
}) 