import { NextRequest } from 'next/server'
import { GET, POST } from '../mcp/tools/route'

// Mock the MCP tools module
jest.mock('@/lib/mcp-tools', () => ({
  ALL_MCP_TOOLS: [
    {
      name: 'scheduleFieldOperation',
      description: 'Schedule a field operation',
      parameters: {
        type: 'object',
        properties: {
          fieldId: { type: 'string' },
          operationType: { type: 'string' }
        },
        required: ['fieldId', 'operationType']
      }
    }
  ],
  mcpToolExecutor: {
    executeTool: jest.fn()
  }
}))

describe('/api/mcp/tools', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/mcp/tools', () => {
    it('should return available MCP tools', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.tools).toHaveLength(1)
      expect(data.tools[0].name).toBe('scheduleFieldOperation')
      expect(data.message).toContain('Available MCP tools: 1')
    })

    it('should handle errors gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock ALL_MCP_TOOLS to throw an error
      jest.doMock('@/lib/mcp-tools', () => {
        throw new Error('Module loading failed')
      })

      try {
        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to fetch MCP tools')
      } finally {
        consoleSpy.mockRestore()
      }
    })
  })

  describe('POST /api/mcp/tools', () => {
    const { mcpToolExecutor } = require('@/lib/mcp-tools')

    it('should execute MCP tool successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Operation scheduled successfully',
        data: { id: 'op_123' },
        actionTaken: 'Scheduled planting operation'
      }

      mcpToolExecutor.executeTool.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/mcp/tools', {
        method: 'POST',
        body: JSON.stringify({
          toolName: 'scheduleFieldOperation',
          parameters: {
            fieldId: 'field_001',
            operationType: 'planting'
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Operation scheduled successfully')
      expect(data.data.id).toBe('op_123')
      expect(mcpToolExecutor.executeTool).toHaveBeenCalledWith('scheduleFieldOperation', {
        fieldId: 'field_001',
        operationType: 'planting'
      })
    })

    it('should handle missing tool name', async () => {
      const request = new NextRequest('http://localhost:3000/api/mcp/tools', {
        method: 'POST',
        body: JSON.stringify({
          parameters: { fieldId: 'field_001' }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Tool name is required')
    })

    it('should handle tool execution errors', async () => {
      mcpToolExecutor.executeTool.mockResolvedValue({
        success: false,
        message: 'Tool execution failed',
        error: 'Invalid parameters'
      })

      const request = new NextRequest('http://localhost:3000/api/mcp/tools', {
        method: 'POST',
        body: JSON.stringify({
          toolName: 'scheduleFieldOperation',
          parameters: {}
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // API call succeeds, but tool execution fails
      expect(data.success).toBe(false)
      expect(data.message).toBe('Tool execution failed')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/mcp/tools', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to execute MCP tool')
    })

    it('should handle empty parameters', async () => {
      const mockResult = {
        success: true,
        message: 'Tool executed with empty parameters',
        data: {}
      }

      mcpToolExecutor.executeTool.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/mcp/tools', {
        method: 'POST',
        body: JSON.stringify({
          toolName: 'getEquipmentAlerts'
          // No parameters provided
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mcpToolExecutor.executeTool).toHaveBeenCalledWith('getEquipmentAlerts', {})
    })
  })
}) 