import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { getAuthenticatedJohnDeereAPI } from './johndeere-auth'
import { prisma } from './prisma'

// MCP Server for John Deere Agricultural Data
export class AgMCPServer {
  private server: Server
  private userId: string

  constructor(userId: string) {
    this.userId = userId
    this.server = new Server(
      {
        name: 'ag-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setupToolHandlers()
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_organizations',
            description: 'Get John Deere organizations for the user',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_fields',
            description: 'Get fields for a specific organization',
            inputSchema: {
              type: 'object',
              properties: {
                organizationId: {
                  type: 'string',
                  description: 'The John Deere organization ID',
                },
              },
              required: ['organizationId'],
            },
          },
          {
            name: 'get_field_details',
            description: 'Get detailed information about a specific field',
            inputSchema: {
              type: 'object',
              properties: {
                organizationId: {
                  type: 'string',
                  description: 'The John Deere organization ID',
                },
                fieldId: {
                  type: 'string',
                  description: 'The field ID',
                },
              },
              required: ['organizationId', 'fieldId'],
            },
          },
          {
            name: 'get_equipment',
            description: 'Get equipment/machines for a specific organization',
            inputSchema: {
              type: 'object',
              properties: {
                organizationId: {
                  type: 'string',
                  description: 'The John Deere organization ID',
                },
              },
              required: ['organizationId'],
            },
          },
          {
            name: 'get_work_records',
            description: 'Get work records for a specific organization',
            inputSchema: {
              type: 'object',
              properties: {
                organizationId: {
                  type: 'string',
                  description: 'The John Deere organization ID',
                },
                startDate: {
                  type: 'string',
                  description: 'Start date for work records (YYYY-MM-DD)',
                },
                endDate: {
                  type: 'string',
                  description: 'End date for work records (YYYY-MM-DD)',
                },
              },
              required: ['organizationId'],
            },
          },
          {
            name: 'upload_prescription',
            description: 'Upload a prescription file to a specific field',
            inputSchema: {
              type: 'object',
              properties: {
                organizationId: {
                  type: 'string',
                  description: 'The John Deere organization ID',
                },
                fieldId: {
                  type: 'string',
                  description: 'The field ID',
                },
                prescriptionName: {
                  type: 'string',
                  description: 'Name for the prescription',
                },
                prescriptionType: {
                  type: 'string',
                  description: 'Type of prescription (e.g., nitrogen, seed, etc.)',
                },
                cropYear: {
                  type: 'number',
                  description: 'Crop year for the prescription',
                },
                fileId: {
                  type: 'string',
                  description: 'ID of the uploaded file in our system',
                },
              },
              required: ['organizationId', 'fieldId', 'prescriptionName', 'prescriptionType', 'cropYear', 'fileId'],
            },
          },
        ] as Tool[],
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        // Validate args exists
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments provided')
        }

        switch (name) {
          case 'get_organizations':
            return await this.getOrganizations()

          case 'get_fields':
            if (typeof args.organizationId !== 'string') {
              throw new Error('organizationId must be a string')
            }
            return await this.getFields(args.organizationId)

          case 'get_field_details':
            if (typeof args.organizationId !== 'string' || typeof args.fieldId !== 'string') {
              throw new Error('organizationId and fieldId must be strings')
            }
            return await this.getFieldDetails(args.organizationId, args.fieldId)

          case 'get_equipment':
            if (typeof args.organizationId !== 'string') {
              throw new Error('organizationId must be a string')
            }
            return await this.getEquipment(args.organizationId)

          case 'get_work_records':
            if (typeof args.organizationId !== 'string') {
              throw new Error('organizationId must be a string')
            }
            return await this.getWorkRecords(
              args.organizationId,
              typeof args.startDate === 'string' ? args.startDate : undefined,
              typeof args.endDate === 'string' ? args.endDate : undefined
            )

          case 'upload_prescription':
            if (
              typeof args.organizationId !== 'string' ||
              typeof args.fieldId !== 'string' ||
              typeof args.prescriptionName !== 'string' ||
              typeof args.prescriptionType !== 'string' ||
              typeof args.cropYear !== 'number' ||
              typeof args.fileId !== 'string'
            ) {
              throw new Error('Invalid arguments for upload_prescription')
            }
            return await this.uploadPrescription(
              args.organizationId,
              args.fieldId,
              args.prescriptionName,
              args.prescriptionType,
              args.cropYear,
              args.fileId
            )

          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        }
      }
    })
  }

  private async getOrganizations() {
    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(this.userId)
    const organizations = await johnDeereAPI.getOrganizations()

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            organizations,
            count: organizations.length,
          }, null, 2),
        },
      ],
    }
  }

  private async getFields(organizationId: string) {
    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(this.userId)
    const fields = await johnDeereAPI.getFields(organizationId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            fields,
            count: fields.length,
            organizationId,
          }, null, 2),
        },
      ],
    }
  }

  private async getFieldDetails(organizationId: string, fieldId: string) {
    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(this.userId)
    const field = await johnDeereAPI.getField(organizationId, fieldId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(field, null, 2),
        },
      ],
    }
  }

  private async getEquipment(organizationId: string) {
    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(this.userId)
    const equipment = await johnDeereAPI.getEquipment(organizationId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            equipment,
            count: equipment.length,
            organizationId,
          }, null, 2),
        },
      ],
    }
  }

  private async getWorkRecords(organizationId: string, startDate?: string, endDate?: string) {
    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(this.userId)
    const workRecords = await johnDeereAPI.getWorkRecords(organizationId, startDate, endDate)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            workRecords,
            count: workRecords.length,
            organizationId,
            dateRange: { startDate, endDate },
          }, null, 2),
        },
      ],
    }
  }

  private async uploadPrescription(
    organizationId: string,
    fieldId: string,
    prescriptionName: string,
    prescriptionType: string,
    cropYear: number,
    fileId: string
  ) {
    // Get file from our database
    const fileUpload = await prisma.fileUpload.findUnique({
      where: { id: fileId },
    })

    if (!fileUpload) {
      throw new Error(`File with ID ${fileId} not found`)
    }

    // Read file content (in a real implementation, you'd read from file system)
    // For now, we'll simulate this
    const fileContent = Buffer.from('simulated file content')

    const johnDeereAPI = await getAuthenticatedJohnDeereAPI(this.userId)
    const result = await johnDeereAPI.uploadPrescription(organizationId, fieldId, {
      name: prescriptionName,
      type: prescriptionType,
      cropYear,
      fileContent,
      fileName: fileUpload.filename,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            prescriptionId: result.id,
            status: result.status,
            organizationId,
            fieldId,
            prescriptionName,
            prescriptionType,
            cropYear,
          }, null, 2),
        },
      ],
    }
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.log('Ag MCP Server started')
  }
}

// Factory function to create server instance
export function createAgMCPServer(userId: string): AgMCPServer {
  return new AgMCPServer(userId)
} 