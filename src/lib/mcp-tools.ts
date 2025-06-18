// MCP Tools for Agricultural Operations
// These tools allow farmers to perform actions, not just retrieve data

import { getJohnDeereAPIClient } from './johndeere-api';

export interface MCPTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
}

export interface MCPToolResult {
  success: boolean
  message: string
  data?: any
  actionTaken?: string
}

// Field Operations Tools
export const FIELD_OPERATION_TOOLS: MCPTool[] = [
  {
    name: 'scheduleFieldOperation',
    description: 'Schedule a field operation (planting, harvesting, spraying, etc.)',
    parameters: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'ID of the field for the operation'
        },
        operationType: {
          type: 'string',
          enum: ['planting', 'harvesting', 'spraying', 'fertilizing', 'cultivation', 'irrigation'],
          description: 'Type of field operation to schedule'
        },
        scheduledDate: {
          type: 'string',
          format: 'date-time',
          description: 'Planned date for the operation (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)'
        },
        equipmentId: {
          type: 'string',
          description: 'ID of equipment to use for the operation'
        },
        notes: {
          type: 'string',
          description: 'Additional notes or instructions for the operation'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level of the operation'
        }
      },
      required: ['fieldId', 'operationType', 'scheduledDate']
    }
  },
  {
    name: 'getFieldRecommendations',
    description: 'Get AI-powered recommendations for field operations based on current conditions',
    parameters: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'ID of the field to analyze'
        },
        season: {
          type: 'string',
          enum: ['spring', 'summer', 'fall', 'winter'],
          description: 'Current season for context'
        },
        cropType: {
          type: 'string',
          description: 'Type of crop planted or planned (corn, soybeans, wheat, etc.)'
        }
      },
      required: ['fieldId']
    }
  },
  {
    name: 'updateFieldStatus',
    description: 'Update the current status of a field (planted, growing, ready for harvest, etc.)',
    parameters: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'ID of the field to update'
        },
        status: {
          type: 'string',
          enum: ['prepared', 'planted', 'growing', 'ready_for_harvest', 'harvested', 'fallow'],
          description: 'Current status of the field'
        },
        cropType: {
          type: 'string',
          description: 'Type of crop currently in the field'
        },
        plantingDate: {
          type: 'string',
          format: 'date-time',
          description: 'Date when the field was planted (if applicable) (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)'
        },
        expectedHarvestDate: {
          type: 'string',
          format: 'date-time',
          description: 'Expected harvest date (if applicable) (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)'
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the field status'
        }
      },
      required: ['fieldId', 'status']
    }
  }
]

// Equipment Management Tools
export const EQUIPMENT_MANAGEMENT_TOOLS: MCPTool[] = [
  {
    name: 'scheduleEquipmentMaintenance',
    description: 'Schedule maintenance for farm equipment',
    parameters: {
      type: 'object',
      properties: {
        equipmentId: {
          type: 'string',
          description: 'ID of the equipment needing maintenance'
        },
        maintenanceType: {
          type: 'string',
          enum: ['routine', 'repair', 'inspection', 'oil_change', 'filter_replacement', 'tire_check'],
          description: 'Type of maintenance needed'
        },
        scheduledDate: {
          type: 'string',
          format: 'date-time',
          description: 'Planned date for maintenance (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level of the maintenance'
        },
        description: {
          type: 'string',
          description: 'Description of the maintenance work needed'
        },
        estimatedCost: {
          type: 'number',
          description: 'Estimated cost of the maintenance'
        }
      },
      required: ['equipmentId', 'maintenanceType', 'scheduledDate']
    }
  },
  {
    name: 'getEquipmentAlerts',
    description: 'Get current alerts and warnings for equipment',
    parameters: {
      type: 'object',
      properties: {
        equipmentId: {
          type: 'string',
          description: 'ID of specific equipment (optional - if not provided, returns all alerts)'
        },
        alertType: {
          type: 'string',
          enum: ['maintenance_due', 'error', 'warning', 'fuel_low', 'hours_high'],
          description: 'Filter by specific alert type'
        }
      },
      required: []
    }
  },
  {
    name: 'updateEquipmentStatus',
    description: 'Update the operational status of equipment',
    parameters: {
      type: 'object',
      properties: {
        equipmentId: {
          type: 'string',
          description: 'ID of the equipment to update'
        },
        status: {
          type: 'string',
          enum: ['operational', 'in_use', 'maintenance', 'repair_needed', 'out_of_service'],
          description: 'Current operational status'
        },
        location: {
          type: 'string',
          description: 'Current location of the equipment'
        },
        operatorNotes: {
          type: 'string',
          description: 'Notes from the equipment operator'
        },
        fuelLevel: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Current fuel level percentage'
        },
        engineHours: {
          type: 'number',
          description: 'Current engine hours reading'
        }
      },
      required: ['equipmentId', 'status']
    }
  }
]

// Data Retrieval Tools
export const DATA_RETRIEVAL_TOOLS: MCPTool[] = [
  {
    name: 'get_equipment_details',
    description: 'Get detailed information for a specific piece of equipment, including engine hours.',
    parameters: {
      type: 'object',
      properties: {
        equipmentId: {
          type: 'string',
          description: 'The ID of the equipment to retrieve details for.'
        },
        organizationId: {
          type: 'string',
          description: 'The ID of the organization the equipment belongs to.'
        }
      },
      required: ['equipmentId', 'organizationId']
    }
  },
  {
    name: 'get_field_operation_history',
    description: 'Get the history of operations for a specific field, such as applications, planting, or harvest.',
    parameters: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'The ID of the field to retrieve the operation history for.'
        },
        organizationId: {
          type: 'string',
          description: 'The ID of the organization the field belongs to.'
        }
      },
      required: ['fieldId', 'organizationId']
    }
  },
  {
    name: 'list_john_deere_files',
    description: 'List files available in the connected John Deere account for a specific organization.',
    parameters: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'The ID of the organization to list files for.'
        }
      },
      required: ['organizationId']
    }
  },
  {
    name: 'get_field_boundary',
    description: 'Gets the boundary coordinate data for a specific field. If the organization ID is not known, it will be automatically determined.',
    parameters: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'The ID of the organization the field belongs to. This is optional.'
        },
        fieldName: {
          type: 'string',
          description: 'The name of the field to get the boundary for.'
        }
      },
      required: ['fieldName']
    }
  }
];

// All MCP Tools combined
export const ALL_MCP_TOOLS: MCPTool[] = [
  ...FIELD_OPERATION_TOOLS,
  ...EQUIPMENT_MANAGEMENT_TOOLS,
  ...DATA_RETRIEVAL_TOOLS,
]

// Tool execution functions
export class MCPToolExecutor {
  
  async executeTool(toolName: string, parameters: any): Promise<MCPToolResult> {
    console.log(`🔧 Executing MCP tool: ${toolName}`, parameters)
    
    // Field Operations
    if (FIELD_OPERATION_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeFieldOperation(toolName, parameters)
    }
    
    // Equipment Management
    if (EQUIPMENT_MANAGEMENT_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeEquipmentManagement(toolName, parameters)
    }

    // Data Retrieval
    if (DATA_RETRIEVAL_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeDataRetrieval(toolName, parameters);
    }
    
    return {
      success: false,
      message: `Unknown MCP tool: ${toolName}`
    }
  }

  private async executeFieldOperation(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'scheduleFieldOperation':
        return this.scheduleFieldOperation(parameters)
      case 'getFieldRecommendations':
        return this.getFieldRecommendations(parameters)
      case 'updateFieldStatus':
        return this.updateFieldStatus(parameters)
      default:
        return {
          success: false,
          message: `Unknown field operation tool: ${toolName}`
        }
    }
  }

  private async executeEquipmentManagement(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'scheduleEquipmentMaintenance':
        return this.scheduleEquipmentMaintenance(parameters)
      case 'getEquipmentAlerts':
        return this.getEquipmentAlerts(parameters)
      case 'updateEquipmentStatus':
        return this.updateEquipmentStatus(parameters)
      default:
        return {
          success: false,
          message: `Unknown equipment management tool: ${toolName}`
        }
    }
  }

  private async executeDataRetrieval(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'get_equipment_details':
        return this.getEquipmentDetails(parameters);
      case 'get_field_operation_history':
        return this.getFieldOperationHistory(parameters);
      case 'list_john_deere_files':
        return this.listJohnDeereFiles(parameters);
      case 'get_field_boundary':
        return this.getFieldBoundary(parameters);
      default:
        return { success: false, message: 'Unknown data retrieval tool' };
    }
  }

  // Field Operation Implementations
  private async scheduleFieldOperation(params: any): Promise<MCPToolResult> {
    const operation = {
      id: `op_${Date.now()}`,
      fieldId: params.fieldId,
      operationType: params.operationType,
      scheduledDate: params.scheduledDate,
      equipmentId: params.equipmentId,
      notes: params.notes,
      priority: params.priority || 'medium',
      status: 'scheduled',
      createdAt: new Date().toISOString()
    }

    return {
      success: true,
      message: `✅ Successfully scheduled **${params.operationType}** operation for **${params.scheduledDate}**`,
      data: operation,
      actionTaken: `Scheduled ${params.operationType} operation`
    }
  }

  private async getFieldRecommendations(params: any): Promise<MCPToolResult> {
    const recommendations = this.generateMockRecommendations(params)

    return {
      success: true,
      message: `🌾 Generated **AI recommendations** for field ${params.fieldId}`,
      data: recommendations,
      actionTaken: 'Generated field recommendations'
    }
  }

  private async updateFieldStatus(params: any): Promise<MCPToolResult> {
    const fieldUpdate = {
      fieldId: params.fieldId,
      status: params.status,
      cropType: params.cropType,
      plantingDate: params.plantingDate,
      expectedHarvestDate: params.expectedHarvestDate,
      notes: params.notes,
      updatedAt: new Date().toISOString()
    }

    return {
      success: true,
      message: `📋 Successfully updated field **${params.fieldId}** status to **${params.status}**`,
      data: fieldUpdate,
      actionTaken: `Updated field status to ${params.status}`
    }
  }

  // Equipment Management Implementations
  private async scheduleEquipmentMaintenance(params: any): Promise<MCPToolResult> {
    const maintenance = {
      id: `maint_${Date.now()}`,
      equipmentId: params.equipmentId,
      maintenanceType: params.maintenanceType,
      scheduledDate: params.scheduledDate,
      priority: params.priority || 'medium',
      description: params.description,
      estimatedCost: params.estimatedCost,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    }

    return {
      success: true,
      message: `🔧 Successfully scheduled **${params.maintenanceType}** maintenance for **${params.scheduledDate}**`,
      data: maintenance,
      actionTaken: `Scheduled ${params.maintenanceType} maintenance`
    }
  }

  private async getEquipmentAlerts(params: any): Promise<MCPToolResult> {
    const alerts = this.generateMockEquipmentAlerts(params)

    return {
      success: true,
      message: `⚠️ Retrieved **${alerts.length} equipment alerts**`,
      data: alerts,
      actionTaken: 'Retrieved equipment alerts'
    }
  }

  private async updateEquipmentStatus(params: any): Promise<MCPToolResult> {
    const statusUpdate = {
      equipmentId: params.equipmentId,
      status: params.status,
      location: params.location,
      operatorNotes: params.operatorNotes,
      fuelLevel: params.fuelLevel,
      engineHours: params.engineHours,
      updatedAt: new Date().toISOString()
    }

    return {
      success: true,
      message: `🚜 Successfully updated equipment **${params.equipmentId}** status to **${params.status}**`,
      data: statusUpdate,
      actionTaken: `Updated equipment status to ${params.status}`
    }
  }

  private async getEquipmentDetails(params: { equipmentId: string, organizationId: string }): Promise<MCPToolResult> {
    try {
      const apiClient = getJohnDeereAPIClient();
      const details = await apiClient.getMachineEngineHours(params.equipmentId);

      return {
        success: true,
        message: `Retrieved details for equipment ${params.equipmentId}.`,
        data: details
      };
    } catch (error: any) {
      return { success: false, message: `Failed to get details for equipment ${params.equipmentId}: ${error.message}` };
    }
  }

  private async getFieldOperationHistory(params: { fieldId: string, organizationId: string }): Promise<MCPToolResult> {
    try {
      const apiClient = getJohnDeereAPIClient();
      const operations = await apiClient.getFieldOperations(params.organizationId, params.fieldId);
      
      return {
        success: true,
        message: `Retrieved operation history for field ${params.fieldId}.`,
        data: operations
      };
    } catch (error: any) {
      return { success: false, message: `Failed to get history for field ${params.fieldId}: ${error.message}` };
    }
  }

  private async listJohnDeereFiles(params: { organizationId: string }): Promise<MCPToolResult> {
    try {
      const apiClient = getJohnDeereAPIClient();
      const files = await apiClient.getFiles(params.organizationId);
      
      return {
        success: true,
        message: `Retrieved ${files.length} files for organization ${params.organizationId}.`,
        data: files
      };
    } catch (error: any) {
      return { success: false, message: `Failed to list files for organization ${params.organizationId}: ${error.message}` };
    }
  }

  private async getFieldBoundary(params: { organizationId?: string, fieldName: string }): Promise<MCPToolResult> {
    try {
      const apiClient = getJohnDeereAPIClient();
      let orgId = params.organizationId;

      // If orgId is not provided, fetch the default one
      if (!orgId) {
        const orgs = await apiClient.getOrganizations();
        if (orgs && orgs.length > 0) {
          orgId = orgs[0].id;
          console.log(`🏢 Auto-detected organization ID: ${orgId}`);
        } else {
          return { success: false, message: 'Could not find any John Deere organizations.' };
        }
      }
      
      const fields = await apiClient.getFields(orgId);
      const field = fields.find(f => f.name.toLowerCase() === params.fieldName.toLowerCase());

      if (!field) {
        return { success: false, message: `Could not find a field named "${params.fieldName}".` };
      }

      const boundaryLink = field.links.find(link => link.rel === 'boundaries')?.uri;

      if (!boundaryLink) {
        return { success: false, message: `No boundary data link found for field "${params.fieldName}".` };
      }

      const boundaryData = await apiClient.getBoundariesForField(boundaryLink);

      return {
        success: true,
        message: `Successfully retrieved boundary data for field "${params.fieldName}".`,
        data: boundaryData
      };
    } catch (error: any) {
      return { success: false, message: `Failed to get boundary for field "${params.fieldName}": ${error.message}` };
    }
  }

  // Mock data generators
  private generateMockRecommendations(params: any) {
    const season = params.season || 'spring'
    const cropType = params.cropType || 'corn'
    
    return {
      fieldId: params.fieldId,
      season,
      cropType,
      recommendations: [
        {
          type: 'planting',
          priority: 'high',
          recommendation: `Optimal planting window for ${cropType} is approaching. Soil temperature should be above 50°F.`,
          suggestedDate: '2024-04-15',
          confidence: 0.85
        },
        {
          type: 'fertilizer',
          priority: 'medium',
          recommendation: 'Consider nitrogen application based on soil test results.',
          suggestedDate: '2024-04-10',
          confidence: 0.78
        },
        {
          type: 'equipment',
          priority: 'medium',
          recommendation: 'Schedule planter maintenance before planting season.',
          suggestedDate: '2024-04-05',
          confidence: 0.92
        }
      ],
      generatedAt: new Date().toISOString()
    }
  }

  private generateMockEquipmentAlerts(params: any) {
    return [
      {
        id: 'alert_001',
        equipmentId: params.equipmentId || 'equipment_001',
        alertType: 'maintenance_due',
        severity: 'medium',
        message: 'Routine maintenance due in 50 engine hours',
        createdAt: new Date().toISOString(),
        acknowledged: false
      },
      {
        id: 'alert_002',
        equipmentId: params.equipmentId || 'equipment_002',
        alertType: 'fuel_low',
        severity: 'low',
        message: 'Fuel level below 25%',
        createdAt: new Date().toISOString(),
        acknowledged: false
      }
    ]
  }
}

export const mcpToolExecutor = new MCPToolExecutor() 