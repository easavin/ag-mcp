import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPToolResult, MCPTool } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { JohnDeereToolArgs } from './types.js'
import { JohnDeereAuth } from './auth.js'

export class JohnDeereToolsSimple {
  private auth: JohnDeereAuth

  constructor(auth: JohnDeereAuth) {
    this.auth = auth
  }

  public getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_organizations',
        description: 'Get all John Deere organizations for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        },
      },
      {
        name: 'get_fields',
        description: 'Get fields for a specific John Deere organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'The ID of the organization to get fields for'
            }
          },
          required: ['organizationId']
        },
      },
      {
        name: 'get_equipment',
        description: 'Get equipment for a specific John Deere organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'The ID of the organization to get equipment for'
            }
          },
          required: ['organizationId']
        },
      }
    ]
  }

  public getMCPTools(): MCPTool[] {
    return [
      {
        name: 'get_organizations',
        description: 'Get all John Deere organizations for the authenticated user',
        inputSchema: this.getToolDefinitions()[0].inputSchema,
        handler: this.getOrganizations.bind(this)
      },
      {
        name: 'get_fields',
        description: 'Get fields for a specific John Deere organization',
        inputSchema: this.getToolDefinitions()[1].inputSchema,
        handler: this.getFields.bind(this)
      },
      {
        name: 'get_equipment',
        description: 'Get equipment for a specific John Deere organization',
        inputSchema: this.getToolDefinitions()[2].inputSchema,
        handler: this.getEquipment.bind(this)
      }
    ]
  }

  public async getOrganizations(args: {}): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting organizations (mock)')

      // Check authentication
      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult(
          'John Deere authentication required',
          'No valid authentication found. Please connect your John Deere account.'
        )
      }

      // Mock organizations data
      const organizations = [
        {
          id: 'org-123',
          name: 'Test Farm Organization',
          type: 'organization',
          active: true
        },
        {
          id: 'org-456',
          name: 'Demo Agricultural Company',
          type: 'organization', 
          active: true
        }
      ]

      return MCPUtils.createSuccessResult(
        `🏢 Retrieved ${organizations.length} John Deere organization(s)`,
        { organizations, count: organizations.length },
        `Found ${organizations.length} organizations`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to get organizations', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve organizations',
        errorMessage
      )
    }
  }

  public async getFields(args: JohnDeereToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting fields (mock)', args)

      const missing = MCPUtils.validateRequiredFields(args, ['organizationId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      // Check authentication
      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult(
          'John Deere authentication required',
          'No valid authentication found. Please connect your John Deere account.'
        )
      }

      // Mock fields data
      const fields = [
        {
          id: 'field-001',
          name: 'North Field',
          archived: false,
          organizationId: args.organizationId,
          area: { value: 150.5, unit: 'acres' }
        },
        {
          id: 'field-002',
          name: 'South Field',
          archived: false,
          organizationId: args.organizationId,
          area: { value: 89.2, unit: 'acres' }
        },
        {
          id: 'field-003',
          name: 'East Pasture',
          archived: false,
          organizationId: args.organizationId,
          area: { value: 75.8, unit: 'acres' }
        }
      ]

      return MCPUtils.createSuccessResult(
        `🌾 Retrieved ${fields.length} field(s) for organization`,
        { fields, organizationId: args.organizationId, count: fields.length },
        `Found ${fields.length} fields`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to get fields', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve fields',
        errorMessage
      )
    }
  }

  public async getEquipment(args: JohnDeereToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting equipment (mock)', args)

      const missing = MCPUtils.validateRequiredFields(args, ['organizationId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      // Check authentication
      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult(
          'John Deere authentication required',
          'No valid authentication found. Please connect your John Deere account.'
        )
      }

      // Mock equipment data
      const equipment = [
        {
          id: 'equip-001',
          name: 'John Deere 8R 370',
          type: 'tractor',
          subType: 'row-crop-tractor',
          organizationId: args.organizationId,
          status: 'active'
        },
        {
          id: 'equip-002',
          name: 'John Deere S780',
          type: 'combine',
          subType: 'combine-harvester',
          organizationId: args.organizationId,
          status: 'active'
        },
        {
          id: 'equip-003',
          name: 'John Deere 2630',
          type: 'display',
          subType: 'field-computer',
          organizationId: args.organizationId,
          status: 'active'
        }
      ]

      return MCPUtils.createSuccessResult(
        `🚜 Retrieved ${equipment.length} equipment item(s) for organization`,
        { equipment, organizationId: args.organizationId, count: equipment.length },
        `Found ${equipment.length} equipment items`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to get equipment', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve equipment',
        errorMessage
      )
    }
  }
} 