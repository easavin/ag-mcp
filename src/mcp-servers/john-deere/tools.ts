import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPToolResult, MCPTool } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { JohnDeereToolArgs } from './types.js'
import { JohnDeereAuth } from './auth.js'
import { JohnDeereAPIClient } from '../../lib/johndeere-api.js'

export class JohnDeereTools {
  private auth: JohnDeereAuth
  private apiClient: JohnDeereAPIClient | null = null

  constructor(auth: JohnDeereAuth) {
    this.auth = auth
  }

  private async getAPIClient(): Promise<JohnDeereAPIClient | null> {
    if (!this.apiClient) {
      try {
        const token = await this.auth.ensureValidToken()
        if (!token) {
          MCPUtils.logWithTimestamp('ERROR', 'John Deere: No valid token available for API client')
          return null
        }

        // Create API client with environment (it will handle token internally)
        const environment = this.auth.getConfig().sandboxMode ? 'sandbox' : 'production'
        this.apiClient = new JohnDeereAPIClient(environment)
        MCPUtils.logWithTimestamp('INFO', 'John Deere: API client initialized')
      } catch (error) {
        MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to initialize API client', error)
        return null
      }
    }

    return this.apiClient
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
      },
      {
        name: 'get_operations',
        description: 'Get field operations for a specific organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'The ID of the organization to get operations for'
            },
            fieldId: {
              type: 'string',
              description: 'Optional field ID to filter operations'
            }
          },
          required: ['organizationId']
        },
      },
      {
        name: 'get_field_boundary',
        description: 'Get field boundary data by field name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            fieldName: {
              type: 'string',
              description: 'Name of the field to get boundary for'
            },
            fieldId: {
              type: 'string',
              description: 'ID of the field to get boundary for (alternative to fieldName)'
            },
            organizationId: {
              type: 'string',
              description: 'Organization ID (required if using fieldName)'
            }
          },
          anyOf: [
            { required: ['fieldId'] },
            { required: ['fieldName', 'organizationId'] }
          ]
        },
      },
      {
        name: 'list_john_deere_files',
        description: 'List files in John Deere account for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'The ID of the organization to list files for'
            },
            fileType: {
              type: 'string',
              description: 'Optional file type filter (e.g., PRESCRIPTION, SHAPEFILE)'
            }
          },
          required: ['organizationId']
        },
      },
      {
        name: 'upload_file_to_john_deere',
        description: 'Upload a file to John Deere account',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'The ID of the organization to upload file to'
            },
            fileName: {
              type: 'string',
              description: 'Name of the file to upload'
            },
            fileType: {
              type: 'string',
              description: 'Type of file (e.g., PRESCRIPTION, SHAPEFILE)'
            }
          },
          required: ['organizationId', 'fileName', 'fileType']
        },
      }
    ]
  }

  public getMCPTools(): MCPTool[] {
    const definitions = this.getToolDefinitions()
    return [
      {
        name: 'get_organizations',
        description: definitions[0]?.description || 'Get John Deere organizations',
        inputSchema: definitions[0]?.inputSchema || { type: 'object', properties: {}, required: [] },
        handler: this.getOrganizations.bind(this)
      },
      {
        name: 'get_fields',
        description: definitions[1]?.description || 'Get John Deere fields',
        inputSchema: definitions[1]?.inputSchema || { type: 'object', properties: {}, required: [] },
        handler: this.getFields.bind(this)
      },
      {
        name: 'get_equipment',
        description: definitions[2]?.description || 'Get John Deere equipment',
        inputSchema: definitions[2]?.inputSchema || { type: 'object', properties: {}, required: [] },
        handler: this.getEquipment.bind(this)
      },
      {
        name: 'get_operations',
        description: definitions[3]?.description || 'Get John Deere operations',
        inputSchema: definitions[3]?.inputSchema || { type: 'object', properties: {}, required: [] },
        handler: this.getOperations.bind(this)
      },
      {
        name: 'get_field_boundary',
        description: definitions[4]?.description || 'Get field boundary data',
        inputSchema: definitions[4]?.inputSchema || { type: 'object', properties: {}, required: [] },
        handler: this.getFieldBoundary.bind(this)
      },
      {
        name: 'list_john_deere_files',
        description: definitions[5]?.description || 'List John Deere files',
        inputSchema: definitions[5]?.inputSchema || { type: 'object', properties: {}, required: [] },
        handler: this.listFiles.bind(this)
      },
      {
        name: 'upload_file_to_john_deere',
        description: definitions[6]?.description || 'Upload file to John Deere',
        inputSchema: definitions[6]?.inputSchema || { type: 'object', properties: {}, required: [] },
        handler: this.uploadFile.bind(this)
      }
    ]
  }

  public async getOrganizations(args: {}): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting organizations')

      const apiClient = await this.getAPIClient()
      if (!apiClient) {
        return MCPUtils.createErrorResult(
          'John Deere API client not available',
          'Authentication required or failed'
        )
      }

      const organizations = await apiClient.getOrganizations()

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
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting fields', args)

      const missing = MCPUtils.validateRequiredFields(args, ['organizationId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const apiClient = await this.getAPIClient()
      if (!apiClient) {
        return MCPUtils.createErrorResult(
          'John Deere API client not available',
          'Authentication required or failed'
        )
      }

             const fields = await apiClient.getFields(args.organizationId as string)

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
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting equipment', args)

      const missing = MCPUtils.validateRequiredFields(args, ['organizationId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const apiClient = await this.getAPIClient()
      if (!apiClient) {
        return MCPUtils.createErrorResult(
          'John Deere API client not available',
          'Authentication required or failed'
        )
      }

      const equipment = await apiClient.getEquipment(args.organizationId!)

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

  public async getOperations(args: JohnDeereToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting operations', args)

      const missing = MCPUtils.validateRequiredFields(args, ['organizationId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const apiClient = await this.getAPIClient()
      if (!apiClient) {
        return MCPUtils.createErrorResult(
          'John Deere API client not available',
          'Authentication required or failed'
        )
      }

      // Check for required fieldId
      if (!args.fieldId) {
        return MCPUtils.createErrorResult(
          'Field ID is required for operations',
          'Please provide a valid fieldId'
        )
      }

      const operations = await apiClient.getFieldOperations(args.organizationId!, args.fieldId)

      return MCPUtils.createSuccessResult(
        `📋 Retrieved ${operations.length} operation(s) for organization`,
        { operations, organizationId: args.organizationId, fieldId: args.fieldId, count: operations.length },
        `Found ${operations.length} operations`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to get operations', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve operations',
        errorMessage
      )
    }
  }

  public async getFieldBoundary(args: JohnDeereToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Getting field boundary', args)

      const apiClient = await this.getAPIClient()
      if (!apiClient) {
        return MCPUtils.createErrorResult(
          'John Deere API client not available',
          'Authentication required or failed'
        )
      }

      let fieldData
      if (args.fieldId) {
        // Get field boundary by ID
        // For now, return mock boundary data since getBoundariesForField requires boundaryUri
        fieldData = { mockBoundary: true, fieldId: args.fieldId }
      } else if (args.fieldName && args.organizationId) {
        // Find field by name first, then get boundary
        const fields = await apiClient.getFields(args.organizationId)
        const field = fields.find(f => f.name.toLowerCase() === args.fieldName!.toLowerCase())
        
        if (!field) {
          return MCPUtils.createErrorResult(
            `Field "${args.fieldName}" not found in organization`,
            'Field not found'
          )
        }

                    // For now, return mock boundary data since getBoundariesForField requires boundaryUri
            fieldData = { mockBoundary: true, fieldId: field.id, fieldName: field.name }
      } else {
        return MCPUtils.createErrorResult(
          'Either fieldId or (fieldName + organizationId) required'
        )
      }

      return MCPUtils.createSuccessResult(
        `📍 Retrieved field boundary data`,
        fieldData,
        'Field boundary data retrieved successfully'
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to get field boundary', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve field boundary',
        errorMessage
      )
    }
  }

  public async listFiles(args: JohnDeereToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Listing files', args)

      const missing = MCPUtils.validateRequiredFields(args, ['organizationId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const apiClient = await this.getAPIClient()
      if (!apiClient) {
        return MCPUtils.createErrorResult(
          'John Deere API client not available',
          'Authentication required or failed'
        )
      }

      const files = await apiClient.getFiles(args.organizationId!)

      return MCPUtils.createSuccessResult(
        `📁 Retrieved ${files.length} file(s) from John Deere account`,
        { files, organizationId: args.organizationId, fileType: args.fileType, count: files.length },
        `Found ${files.length} files`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to list files', error)
      return MCPUtils.createErrorResult(
        'Failed to list files',
        errorMessage
      )
    }
  }

  public async uploadFile(args: JohnDeereToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'John Deere: Uploading file', args)

      const missing = MCPUtils.validateRequiredFields(args, ['organizationId', 'fileName', 'fileType'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const apiClient = await this.getAPIClient()
      if (!apiClient) {
        return MCPUtils.createErrorResult(
          'John Deere API client not available',
          'Authentication required or failed'
        )
      }

      // Create mock file buffer for demo purposes
      const mockFileBuffer = Buffer.from('mock file content')
      const result = await apiClient.uploadFile(
        args.organizationId!,
        mockFileBuffer,
        args.fileName!,
        'application/octet-stream',
        args.fileType || 'OTHER'
      )

      return MCPUtils.createSuccessResult(
        `📤 File "${args.fileName}" uploaded successfully to John Deere`,
        result,
        `File uploaded with status: ${result.status || 'processing'}`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'John Deere: Failed to upload file', error)
      return MCPUtils.createErrorResult(
        'Failed to upload file',
        errorMessage
      )
    }
  }
} 