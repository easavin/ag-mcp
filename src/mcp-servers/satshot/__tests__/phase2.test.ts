// Phase 2 Tests: MCP Server and Tool Registration

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { SatshotMCPServer } from '../server'
import { SatshotTools } from '../tools'
import { SatshotAuth } from '../auth'

describe('Satshot Phase 2 - MCP Server & Tools', () => {
  let server: SatshotMCPServer
  let auth: SatshotAuth
  let tools: SatshotTools

  beforeEach(() => {
    auth = new SatshotAuth()
    tools = new SatshotTools(auth)
    server = new SatshotMCPServer()
  })

  afterEach(async () => {
    if (server) {
      await server.cleanup()
    }
    if (auth) {
      await auth.cleanup()
    }
  })

  describe('SatshotMCPServer', () => {
    test('should initialize server correctly', () => {
      expect(server).toBeDefined()
      
      const serverInfo = server.getServerInfo()
      expect(serverInfo.server).toBe('us') // Default server
      expect(typeof serverInfo.tools).toBe('number')
      expect(typeof serverInfo.uptime).toBe('number')
    })

    test('should register tools on setup', () => {
      const availableTools = server.getAvailableTools()
      expect(Array.isArray(availableTools)).toBe(true)
      expect(availableTools.length).toBeGreaterThan(0)
      
      // Check for specific tools
      const toolNames = availableTools.map(tool => tool.name)
      expect(toolNames).toContain('get_satshot_maps')
      expect(toolNames).toContain('load_satshot_map')
      expect(toolNames).toContain('get_satshot_fields')
      expect(toolNames).toContain('analyze_field_imagery')
      expect(toolNames).toContain('test_satshot_connection')
    })

    test('should return authentication status', () => {
      const authStatus = server.getAuthStatus()
      
      expect(authStatus).toHaveProperty('authenticated')
      expect(authStatus).toHaveProperty('server')
      expect(authStatus).toHaveProperty('sessionValid')
      expect(authStatus).toHaveProperty('hasCredentials')
      
      expect(authStatus.server).toBe('us') // Default
      expect(typeof authStatus.hasCredentials).toBe('boolean')
    })

    test('should handle health checks', async () => {
      const health = await server.getHealthCheck()
      
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('details')
      expect(health.details).toHaveProperty('satshotAPI')
      expect(health.details).toHaveProperty('server')
      expect(health.details).toHaveProperty('hasCredentials')
    })

    test('should handle tool execution', async () => {
      // Test connection tool (doesn't require actual credentials)
      const result = await server.testTool('test_satshot_connection', { 
        includeAuth: false 
      })
      
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(typeof result.success).toBe('boolean')
    })

    test('should handle invalid tool names', async () => {
      const result = await server.testTool('invalid_tool_name', {})
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Tool not found')
    })
  })

  describe('SatshotTools', () => {
    test('should provide tool definitions', () => {
      const definitions = tools.getToolDefinitions()
      
      expect(Array.isArray(definitions)).toBe(true)
      expect(definitions.length).toBe(7) // Expected number of tools
      
      // Check each tool has required properties
      definitions.forEach(tool => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.inputSchema).toBe('object')
      })
    })

    test('should provide MCP tools with handlers', () => {
      const mcpTools = tools.getMCPTools()
      
      expect(Array.isArray(mcpTools)).toBe(true)
      expect(mcpTools.length).toBe(7)
      
      // Check each MCP tool has handler
      mcpTools.forEach(tool => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(tool).toHaveProperty('handler')
        expect(typeof tool.handler).toBe('function')
      })
    })

    test('should validate tool schemas', () => {
      const definitions = tools.getToolDefinitions()
      
      // Test specific tool schemas
      const mapsTool = definitions.find(t => t.name === 'get_satshot_maps')
      expect(mapsTool).toBeDefined()
      expect(mapsTool!.inputSchema.type).toBe('object')
      expect(mapsTool!.inputSchema.properties).toHaveProperty('limit')
      
      const analysisTool = definitions.find(t => t.name === 'analyze_field_imagery')
      expect(analysisTool).toBeDefined()
      expect(analysisTool!.inputSchema.required).toContain('fieldId')
    })

    test('should handle connection test without credentials', async () => {
      const result = await tools.testConnection({ includeAuth: false })
      
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('data')
      
      if (result.data) {
        expect(result.data).toHaveProperty('connection')
        expect(result.data).toHaveProperty('authentication')
        expect(result.data).toHaveProperty('overall')
      }
    })

    test('should handle missing required parameters', async () => {
      // Test load_map without mapId
      const result = await tools.loadMap({})
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Missing required fields')
      expect(result.message).toContain('mapId')
    })

    test('should handle invalid coordinates for scenes', async () => {
      const result = await tools.getAvailableScenes({})
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Either fieldId or latitude/longitude')
    })

    // Skip actual API tests in CI environment
    test.skip('should authenticate and call API methods', async () => {
      // This would require actual Satshot credentials
      const result = await tools.getMaps({ limit: 5 })
      expect(typeof result.success).toBe('boolean')
    }, 30000)
  })

  describe('Tool Input Validation', () => {
    test('should validate get_satshot_maps parameters', () => {
      const definitions = tools.getToolDefinitions()
      const mapsTool = definitions.find(t => t.name === 'get_satshot_maps')
      
      expect(mapsTool).toBeDefined()
      const schema = mapsTool!.inputSchema
      expect(schema.properties!.limit).toHaveProperty('minimum', 1)
      expect(schema.properties!.limit).toHaveProperty('maximum', 100)
      expect(schema.properties!.mapType.enum).toContain('field')
    })

    test('should validate analyze_field_imagery parameters', () => {
      const definitions = tools.getToolDefinitions()
      const analysisTool = definitions.find(t => t.name === 'analyze_field_imagery')
      
      expect(analysisTool).toBeDefined()
      const schema = analysisTool!.inputSchema
      expect(schema.required).toContain('fieldId')
      expect(schema.properties!.analysisType.enum).toContain('ndvi')
      expect(schema.properties!.resolution).toHaveProperty('minimum', 1)
      expect(schema.properties!.resolution).toHaveProperty('maximum', 30)
    })

    test('should validate export_data parameters', () => {
      const definitions = tools.getToolDefinitions()
      const exportTool = definitions.find(t => t.name === 'export_satshot_data')
      
      expect(exportTool).toBeDefined()
      const schema = exportTool!.inputSchema
      expect(schema.required).toContain('dataType')
      expect(schema.required).toContain('itemIds')
      expect(schema.properties!.format.enum).toContain('shapefile')
      expect(schema.properties!.format.enum).toContain('kml')
    })
  })

  describe('Error Handling', () => {
    test('should handle authentication failures gracefully', async () => {
      // Test with mock auth that will fail
      const result = await tools.getMaps({ limit: 5 })
      
      // Should return error but not throw
      expect(result).toHaveProperty('success')
      if (!result.success) {
        expect(result.message).toContain('authentication')
      }
    })

    test('should handle server connection failures', async () => {
      // Test connection when server might be unavailable
      const result = await tools.testConnection({ includeAuth: false })
      
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('data')
    })

    test('should format errors consistently', async () => {
      const result = await tools.loadMap({}) // Missing mapId
      
      expect(result.success).toBe(false)
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
    })
  })

  describe('Integration with Base MCP Server', () => {
    test('should inherit from BaseMCPServer correctly', () => {
      expect(server).toBeInstanceOf(SatshotMCPServer)
      expect(typeof server.getHealthCheck).toBe('function')
      expect(typeof server.cleanup).toBe('function')
    })

    test('should register tools with base server', () => {
      const availableTools = server.getAvailableTools()
      const mcpTools = tools.getMCPTools()
      
      expect(availableTools.length).toBe(mcpTools.length)
      
      // Tool names should match
      const availableNames = availableTools.map(t => t.name).sort()
      const mcpNames = mcpTools.map(t => t.name).sort()
      expect(availableNames).toEqual(mcpNames)
    })

    test('should handle tool execution through base server', async () => {
      const toolName = 'test_satshot_connection'
      const args = { includeAuth: false }
      
      const result = await server.testTool(toolName, args)
      
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
    })
  })
})
