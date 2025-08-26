// MCP Tools for Agricultural Operations
// These tools allow farmers to perform actions, not just retrieve data

import { getJohnDeereAPIClient } from './johndeere-api';
import { getWeatherAPIClient } from './weather-api';
import { euAgriAPI, MARKET_SECTORS } from './eu-agri-api';
import { usdaAPI, USDA_MARKET_CATEGORIES } from './usda-api';
import { AuravantAuth } from './auravant/auth';
import { AuravantClient } from './auravant/client';

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
    name: 'get_field_boundary',
    description: 'Get boundary coordinates and geographic information for a specific field by name or ID.',
    parameters: {
      type: 'object',
      properties: {
        fieldName: {
          type: 'string',
          description: 'The name of the field to get boundary information for (e.g., "North Field", "Field 1"). Use this when user refers to field by name.'
        },
        fieldId: {
          type: 'string',
          description: 'The ID of the field to get boundary information for. Use this when you have the exact field ID.'
        },
        organizationId: {
          type: 'string',
          description: 'The ID of the organization the field belongs to. Optional - will auto-detect if not provided.'
        }
      },
      required: []
    }
  }
];

// Weather Tools
export const WEATHER_TOOLS: MCPTool[] = [
  {
    name: 'getCurrentWeather',
    description: 'Get current weather conditions for a specific location. Includes agricultural data like soil temperature, humidity, wind conditions, and spray recommendations.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location name (e.g., "Iowa City, IA" or "Barcelona, Spain")'
        },
        latitude: {
          type: 'number',
          description: 'Latitude coordinate (alternative to location name)'
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate (alternative to location name)'
        }
      },
      required: []
    }
  },
  {
    name: 'getWeatherForecast',
    description: 'Get weather forecast for a specific location with agricultural insights. Default is 7 days, can be customized.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location name (e.g., "Iowa City, IA" or "Barcelona, Spain")'
        },
        latitude: {
          type: 'number',
          description: 'Latitude coordinate (alternative to location name)'
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate (alternative to location name)'
        },
        days: {
          type: 'number',
          description: 'Number of forecast days (1-7, default: 7)',
          minimum: 1,
          maximum: 7
        }
      },
      required: []
    }
  }
]

// EU Commission Agricultural Market Tools
export const EU_COMMISSION_TOOLS: MCPTool[] = [
  {
    name: 'getEUMarketPrices',
    description: 'Get current agricultural market PRICES (cost per unit) from the EU Commission. Use this for ANY price-related queries including "price per ton", "cost of corn", "monthly prices", etc.',
    parameters: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          enum: ['beef', 'pigmeat', 'dairy', 'eggs-poultry', 'sheep-goat', 'cereals', 'rice', 'oilseeds', 'fruits-vegetables', 'sugar', 'olive-oil', 'wine', 'fertilizer', 'organic'],
          description: 'Agricultural market sector'
        },
        memberState: {
          type: 'string',
          description: 'EU member state code (e.g., "DE", "FR", "IT") or "EU" for aggregate data'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of price records to return',
          minimum: 1,
          maximum: 50
        }
      },
      required: ['sector']
    }
  },
  {
    name: 'getEUProductionData',
    description: 'Get agricultural production QUANTITIES (how much was produced) from the EU Commission. Use this for production volume queries like "how much corn was produced", "harvest amounts", etc. NOT for prices.',
    parameters: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          enum: ['beef', 'pigmeat', 'dairy', 'eggs-poultry', 'sheep-goat', 'cereals', 'rice', 'oilseeds', 'fruits-vegetables', 'sugar', 'olive-oil', 'wine', 'fertilizer', 'organic'],
          description: 'Agricultural market sector'
        },
        memberState: {
          type: 'string',
          description: 'EU member state code (e.g., "DE", "FR", "IT") or "EU" for aggregate data'
        },
        year: {
          type: 'number',
          description: 'Year for production data (defaults to current year)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of production records to return',
          minimum: 1,
          maximum: 50
        }
      },
      required: ['sector']
    }
  },
  {
    name: 'getEUTradeData',
    description: 'Get agricultural trade statistics (imports/exports) from the EU Commission for specific sectors.',
    parameters: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          enum: ['beef', 'pigmeat', 'dairy', 'eggs-poultry', 'sheep-goat', 'cereals', 'rice', 'oilseeds', 'fruits-vegetables', 'sugar', 'olive-oil', 'wine', 'fertilizer', 'organic'],
          description: 'Agricultural market sector'
        },
        tradeType: {
          type: 'string',
          enum: ['import', 'export', 'both'],
          description: 'Type of trade data to retrieve'
        },
        memberState: {
          type: 'string',
          description: 'EU member state code (e.g., "DE", "FR", "IT") or "EU" for aggregate data'
        },
        partnerCountry: {
          type: 'string',
          description: 'Partner country for trade data (e.g., "US", "BR", "AR")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of trade records to return',
          minimum: 1,
          maximum: 50
        }
      },
      required: ['sector']
    }
  },
  {
    name: 'getEUMarketDashboard',
    description: 'Get comprehensive market dashboard with key indicators, trends, and highlights for a specific agricultural sector.',
    parameters: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          enum: ['beef', 'pigmeat', 'dairy', 'eggs-poultry', 'sheep-goat', 'cereals', 'rice', 'oilseeds', 'fruits-vegetables', 'sugar', 'olive-oil', 'wine', 'fertilizer', 'organic'],
          description: 'Agricultural market sector'
        }
      },
      required: ['sector']
    }
  }
]

// USDA Agricultural Market Tools
export const USDA_TOOLS: MCPTool[] = [
  {
    name: 'getUSDAMarketPrices',
    description: 'Get current agricultural market prices from USDA for North American markets including US, Canada, and Mexico.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['grain', 'livestock', 'dairy', 'poultry', 'fruits', 'vegetables', 'specialty'],
          description: 'Agricultural market category'
        },
        region: {
          type: 'string',
          enum: ['US', 'CA', 'MX', 'Midwest', 'Southeast', 'Northeast', 'Southwest', 'West'],
          description: 'North American region'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        }
      },
      required: ['category']
    }
  },
  {
    name: 'getUSDAProductionData',
    description: 'Get agricultural production statistics from USDA for North American regions.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['grain', 'livestock', 'dairy', 'poultry', 'fruits', 'vegetables', 'specialty'],
          description: 'Agricultural category'
        },
        region: {
          type: 'string',
          description: 'North American region'
        },
        year: {
          type: 'number',
          description: 'Production year'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        }
      },
      required: ['category']
    }
  },
  {
    name: 'getUSDATradeData',
    description: 'Get agricultural trade data (imports/exports) from USDA for North American markets.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['grain', 'livestock', 'dairy', 'poultry', 'fruits', 'vegetables', 'specialty'],
          description: 'Agricultural category'
        },
        tradeType: {
          type: 'string',
          enum: ['export', 'import'],
          description: 'Type of trade data'
        },
        country: {
          type: 'string',
          description: 'Trading partner country'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        }
      },
      required: ['category']
    }
  },
  {
    name: 'getUSDAMarketDashboard',
    description: 'Get comprehensive market dashboard with key indicators for North American agricultural markets.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['grain', 'livestock', 'dairy', 'poultry', 'fruits', 'vegetables', 'specialty'],
          description: 'Agricultural market category'
        }
      },
      required: ['category']
    }
  }
]

// Auravant Tools (Unique Agricultural Features)
export const AURAVANT_TOOLS: MCPTool[] = [
  {
    name: 'getAuravantFields',
    description: 'Get all fields from Auravant farm management system',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getAuravantFarms',
    description: 'Get all farms from Auravant farm management system',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getAuravantLabourOperations',
    description: 'Get labour operations (field activities) from Auravant',
    parameters: {
      type: 'object',
      properties: {
        yeargroup: {
          type: 'number',
          description: 'Year group for the operations (e.g., 2024)'
        },
        farm_id: {
          type: 'number',
          description: 'Filter by specific farm ID'
        },
        field_id: {
          type: 'number',
          description: 'Filter by specific field ID'
        },
        date_from: {
          type: 'string',
          description: 'Start date filter (YYYY-MM-DD)'
        },
        date_to: {
          type: 'string',
          description: 'End date filter (YYYY-MM-DD)'
        },
        status: {
          type: 'string',
          enum: ['1', '2', '3'],
          description: 'Operation status: 1=Planned, 2=Executed, 3=Cancelled'
        }
      },
      required: ['yeargroup']
    }
  },
  {
    name: 'getAuravantLivestock',
    description: 'Get livestock herds from Auravant (unique feature not available in other systems)',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'createAuravantSowing',
    description: 'Create a sowing operation in Auravant',
    parameters: {
      type: 'object',
      properties: {
        field_id: {
          type: 'number',
          description: 'ID of the field for sowing'
        },
        yeargroup: {
          type: 'number',
          description: 'Year group (e.g., 2024)'
        },
        date: {
          type: 'string',
          description: 'Sowing date (YYYY-MM-DD)'
        },
        surface: {
          type: 'number',
          description: 'Surface area in hectares'
        },
        crop_id: {
          type: 'number',
          description: 'ID of the crop being sown'
        },
        variety_id: {
          type: 'number',
          description: 'ID of the crop variety (optional)'
        }
      },
      required: ['field_id', 'yeargroup', 'date', 'surface', 'crop_id']
    }
  },
  {
    name: 'createAuravantHarvest',
    description: 'Create a harvest operation in Auravant',
    parameters: {
      type: 'object',
      properties: {
        field_id: {
          type: 'number',
          description: 'ID of the field for harvest'
        },
        yeargroup: {
          type: 'number',
          description: 'Year group (e.g., 2024)'
        },
        date: {
          type: 'string',
          description: 'Harvest date (YYYY-MM-DD)'
        },
        surface: {
          type: 'number',
          description: 'Surface area harvested in hectares'
        },
        crop_id: {
          type: 'number',
          description: 'ID of the crop being harvested'
        },
        yield: {
          type: 'number',
          description: 'Yield in tons per hectare'
        },
        humidity: {
          type: 'number',
          description: 'Humidity percentage'
        }
      },
      required: ['field_id', 'yeargroup', 'date', 'surface', 'crop_id']
    }
  },
  {
    name: 'getAuravantWorkOrders',
    description: 'Get work orders from Auravant for planning and scheduling',
    parameters: {
      type: 'object',
      properties: {
        yeargroup: {
          type: 'number',
          description: 'Year group for work orders'
        },
        status: {
          type: 'string',
          description: 'Filter by work order status'
        }
      },
      required: []
    }
  },
  {
    name: 'createAuravantHerd',
    description: 'Create a new livestock herd in Auravant (unique livestock management feature)',
    parameters: {
      type: 'object',
      properties: {
        herd_name: {
          type: 'string',
          description: 'Name of the herd'
        },
        animal_count: {
          type: 'number',
          description: 'Number of animals in the herd'
        },
        weight: {
          type: 'number',
          description: 'Average weight of animals'
        },
        weight_unit: {
          type: 'string',
          enum: ['Kg', 'Lb'],
          description: 'Weight unit'
        },
        type_id: {
          type: 'number',
          description: 'Type of livestock (1=Cattle, 2=Sheep, 3=Goats, etc.)'
        },
        field_id: {
          type: 'number',
          description: 'Field ID where the herd is located'
        }
      },
      required: ['herd_name', 'animal_count', 'type_id']
    }
  }
]

// File Management Tools - Enhanced with intelligent file type detection
export const FILE_MANAGEMENT_TOOLS: MCPTool[] = [
  {
    name: 'upload_file_to_john_deere',
    description: 'Upload a file to John Deere with intelligent file type detection. Supports all file types: PRESCRIPTION, BOUNDARY, WORK_DATA, SETUP_FILE, REPORT, OTHER.',
    parameters: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'John Deere organization ID (optional - will auto-detect if not provided)'
        },
        fileName: {
          type: 'string',
          description: 'Name of the file to upload'
        },
        fileContent: {
          type: 'string',
          description: 'Base64 encoded file content'
        },
        fileType: {
          type: 'string',
          enum: ['PRESCRIPTION', 'BOUNDARY', 'WORK_DATA', 'SETUP_FILE', 'REPORT', 'OTHER'],
          description: 'Explicit file type (optional - will auto-detect if not provided)'
        },
        userIntent: {
          type: 'string',
          description: 'Description of what the user wants to do with this file (e.g., "upload prescription for corn field", "upload field boundary shapefile")'
        }
      },
      required: ['fileName', 'fileContent']
    }
  },
  {
    name: 'list_john_deere_files',
    description: 'List files available in the connected John Deere account for a specific organization. If no organization ID is provided, it will automatically use the first available organization.',
    parameters: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'The ID of the organization to list files for. This is optional - if not provided, the first available organization will be used.'
        }
      },
      required: []
    }
  }
];

// Satshot GIS Tools
export const SATSHOT_TOOLS: MCPTool[] = [
  {
    name: 'get_satshot_maps',
    description: 'Get available maps from Satshot GIS system for field visualization and analysis',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of maps to return (1-100)',
          minimum: 1,
          maximum: 100
        },
        mapType: {
          type: 'string',
          enum: ['field', 'farm', 'region', 'all'],
          description: 'Type of maps to filter by'
        }
      },
      required: []
    }
  },
  {
    name: 'get_satshot_fields',
    description: 'Get field boundaries and information from Satshot GIS system',
    parameters: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          description: 'Region or area to filter fields'
        },
        cropType: {
          type: 'string',
          description: 'Filter fields by crop type'
        },
        minArea: {
          type: 'number',
          description: 'Minimum field area in acres'
        },
        includeGeometry: {
          type: 'boolean',
          description: 'Include field boundary geometry data'
        }
      },
      required: []
    }
  },
  {
    name: 'analyze_field_imagery',
    description: 'Analyze satellite imagery for crop health, NDVI, and field conditions using Satshot',
    parameters: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'Field identifier for analysis'
        },
        analysisType: {
          type: 'string',
          enum: ['ndvi', 'evi', 'stress', 'yield_prediction', 'change_detection'],
          description: 'Type of satellite imagery analysis to perform'
        },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          },
          description: 'Date range for imagery analysis'
        },
        resolution: {
          type: 'number',
          description: 'Analysis resolution in meters (1-30)',
          minimum: 1,
          maximum: 30
        }
      },
      required: ['fieldId']
    }
  },
  {
    name: 'get_available_scenes',
    description: 'Get available satellite scenes for a location or field from Satshot',
    parameters: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description: 'Field ID to get scenes for'
        },
        latitude: {
          type: 'number',
          description: 'Latitude coordinate (-90 to 90)'
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate (-180 to 180)'
        },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          },
          description: 'Date range for scene availability'
        },
        maxCloudCover: {
          type: 'number',
          description: 'Maximum acceptable cloud cover percentage (0-100)',
          minimum: 0,
          maximum: 100
        }
      },
      required: []
    }
  },
  {
    name: 'export_satshot_data',
    description: 'Export field boundaries, analysis results, or maps from Satshot in various formats',
    parameters: {
      type: 'object',
      properties: {
        dataType: {
          type: 'string',
          enum: ['field_boundaries', 'analysis_results', 'imagery', 'report'],
          description: 'Type of data to export'
        },
        format: {
          type: 'string',
          enum: ['shapefile', 'kml', 'geojson', 'tiff', 'pdf', 'csv'],
          description: 'Export format for the data'
        },
        itemIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of items to export'
        },
        includeMetadata: {
          type: 'boolean',
          description: 'Include metadata in the export'
        }
      },
      required: ['dataType', 'itemIds']
    }
  },
  {
    name: 'test_satshot_connection',
    description: 'Test connection to Satshot GIS system and verify authentication status',
    parameters: {
      type: 'object',
      properties: {
        includeAuth: {
          type: 'boolean',
          description: 'Test authentication as well as basic connection'
        }
      },
      required: []
    }
  }
];

// Export and Integration Tools
export const EXPORT_TOOLS: MCPTool[] = [
  {
    name: 'export_field_boundary_kml',
    description: 'Export field boundary as KML file for Google Earth or other GIS applications',
    parameters: {
      type: 'object',
      properties: {
        fieldName: {
          type: 'string',
          description: 'Name of the field to export'
        },
        platform: {
          type: 'string',
          enum: ['johndeere', 'satshot', 'fieldview', 'auravant'],
          description: 'Platform where the field boundary is stored'
        },
        includeMetadata: {
          type: 'boolean',
          description: 'Include field metadata in the KML file',
          default: true
        },
        coordinateSystem: {
          type: 'string',
          description: 'Coordinate system (WGS84, UTM, etc.)',
          default: 'WGS84'
        }
      },
      required: ['fieldName', 'platform']
    }
  },
  {
    name: 'export_field_boundary_shapefile',
    description: 'Export field boundary as Shapefile for GIS applications',
    parameters: {
      type: 'object',
      properties: {
        fieldName: {
          type: 'string',
          description: 'Name of the field to export'
        },
        platform: {
          type: 'string',
          enum: ['johndeere', 'satshot', 'fieldview', 'auravant'],
          description: 'Platform where the field boundary is stored'
        },
        includeMetadata: {
          type: 'boolean',
          description: 'Include field metadata in the shapefile',
          default: true
        }
      },
      required: ['fieldName', 'platform']
    }
  },
  {
    name: 'get_field_ndvi_satshot',
    description: 'Get latest NDVI index for a field using its boundary coordinates from any platform',
    parameters: {
      type: 'object',
      properties: {
        fieldName: {
          type: 'string',
          description: 'Name of the field to analyze'
        },
        platform: {
          type: 'string',
          enum: ['johndeere', 'satshot', 'fieldview', 'auravant'],
          description: 'Platform where the field boundary is stored'
        },
        dateRange: {
          type: 'string',
          description: 'Date range for NDVI data (e.g., "7d", "30d", "90d")',
          default: '30d'
        }
      },
      required: ['fieldName', 'platform']
    }
  }
];

// All MCP Tools combined
export const ALL_MCP_TOOLS: MCPTool[] = [
  ...FIELD_OPERATION_TOOLS,
  ...EQUIPMENT_MANAGEMENT_TOOLS,
  ...DATA_RETRIEVAL_TOOLS,
  ...WEATHER_TOOLS,
  ...EU_COMMISSION_TOOLS,
  ...USDA_TOOLS,
  ...AURAVANT_TOOLS,
  ...SATSHOT_TOOLS,
  ...FILE_MANAGEMENT_TOOLS,
  ...EXPORT_TOOLS,
]

/**
 * Get relevant MCP tools based on selected data sources
 * Reduces token usage by only including tools for selected sources
 */
export function getRelevantMCPTools(selectedDataSources: string[] = []): MCPTool[] {
  const relevantTools: MCPTool[] = []

  // Always include basic field operations (core functionality)
  relevantTools.push(...FIELD_OPERATION_TOOLS)
  relevantTools.push(...EQUIPMENT_MANAGEMENT_TOOLS)

  // Conditionally include tools based on data sources
  if (selectedDataSources.includes('weather')) {
    relevantTools.push(...WEATHER_TOOLS)
    console.log('🌤️ Including weather tools')
  }

  if (selectedDataSources.includes('eu-commission')) {
    relevantTools.push(...EU_COMMISSION_TOOLS)
    console.log('🇪🇺 Including EU Commission tools')
  }

  if (selectedDataSources.includes('usda')) {
    relevantTools.push(...USDA_TOOLS)
    console.log('🇺🇸 Including USDA tools')
  }

  if (selectedDataSources.includes('auravant')) {
    relevantTools.push(...AURAVANT_TOOLS)
    console.log('🌱 Including Auravant tools')
  }

  if (selectedDataSources.includes('satshot')) {
    relevantTools.push(...SATSHOT_TOOLS)
    console.log('🛰️ Including Satshot tools')
  }

  // Always include file management and export tools (utility functions)
  relevantTools.push(...FILE_MANAGEMENT_TOOLS)
  relevantTools.push(...EXPORT_TOOLS)

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔧 Loaded ${relevantTools.length} relevant tools from ${selectedDataSources.length} data sources`)
  }
  return relevantTools
}

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
    
    // Weather
    if (WEATHER_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeWeather(toolName, parameters);
    }
    
    // EU Commission
    if (EU_COMMISSION_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeEUCommission(toolName, parameters);
    }
    
    // USDA
    if (USDA_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeUSDA(toolName, parameters);
    }
    
    // Auravant
    if (AURAVANT_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeAuravant(toolName, parameters);
    }

    // Satshot
    if (SATSHOT_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeSatshot(toolName, parameters);
    }

    // File Management
    if (FILE_MANAGEMENT_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeFileManagement(toolName, parameters);
    }

    // Export Tools
    if (EXPORT_TOOLS.find(tool => tool.name === toolName)) {
      return this.executeExport(toolName, parameters);
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
      case 'get_field_boundary':
        return this.getFieldBoundary(parameters);
      default:
        return { success: false, message: 'Unknown data retrieval tool' };
    }
  }

  private async executeWeather(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'getCurrentWeather':
        return this.getCurrentWeather(parameters);
      case 'getWeatherForecast':
        return this.getWeatherForecast(parameters);
      default:
        return { success: false, message: 'Unknown weather tool' };
    }
  }

  private async executeEUCommission(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'getEUMarketPrices':
        return this.getEUMarketPrices(parameters);
      case 'getEUProductionData':
        return this.getEUProductionData(parameters);
      case 'getEUTradeData':
        return this.getEUTradeData(parameters);
      case 'getEUMarketDashboard':
        return this.getEUMarketDashboard(parameters);
      default:
        return { success: false, message: 'Unknown EU Commission tool' };
    }
  }

  private async executeUSDA(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'getUSDAMarketPrices':
        return this.getUSDAMarketPrices(parameters);
      case 'getUSDAProductionData':
        return this.getUSDAProductionData(parameters);
      case 'getUSDATradeData':
        return this.getUSDATradeData(parameters);
      case 'getUSDAMarketDashboard':
        return this.getUSDAMarketDashboard(parameters);
      default:
        return { success: false, message: 'Unknown USDA tool' };
    }
  }

  private async executeAuravant(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'getAuravantFields':
        return this.getAuravantFields(parameters);
      case 'getAuravantFarms':
        return this.getAuravantFarms(parameters);
      case 'getAuravantLabourOperations':
        return this.getAuravantLabourOperations(parameters);
      case 'getAuravantLivestock':
        return this.getAuravantLivestock(parameters);
      case 'createAuravantSowing':
        return this.createAuravantSowing(parameters);
      case 'createAuravantHarvest':
        return this.createAuravantHarvest(parameters);
      case 'getAuravantWorkOrders':
        return this.getAuravantWorkOrders(parameters);
      case 'createAuravantHerd':
        return this.createAuravantHerd(parameters);
      default:
        return { success: false, message: 'Unknown Auravant tool' };
    }
  }

  private async executeSatshot(toolName: string, parameters: any): Promise<MCPToolResult> {
    try {
      // Route to appropriate Satshot API endpoint
      let endpoint = ''
      let method = 'GET'
      let body = null

      switch (toolName) {
        case 'get_satshot_maps':
          endpoint = '/api/satshot/maps'
          const queryParams = new URLSearchParams()
          if (parameters.limit) queryParams.append('limit', parameters.limit.toString())
          if (parameters.mapType) queryParams.append('mapType', parameters.mapType)
          endpoint += queryParams.toString() ? `?${queryParams.toString()}` : ''
          break

        case 'load_satshot_map':
          endpoint = '/api/satshot/maps'
          const mapParams = new URLSearchParams()
          mapParams.append('mapId', parameters.mapId)
          if (parameters.includeLayers !== undefined) {
            mapParams.append('includeLayers', parameters.includeLayers.toString())
          }
          endpoint += `?${mapParams.toString()}`
          break

        case 'get_satshot_fields':
          endpoint = '/api/satshot/fields'
          const fieldParams = new URLSearchParams()
          if (parameters.region) fieldParams.append('region', parameters.region)
          if (parameters.cropType) fieldParams.append('cropType', parameters.cropType)
          if (parameters.minArea) fieldParams.append('minArea', parameters.minArea.toString())
          if (parameters.includeGeometry !== undefined) {
            fieldParams.append('includeGeometry', parameters.includeGeometry.toString())
          }
          endpoint += fieldParams.toString() ? `?${fieldParams.toString()}` : ''
          break

        case 'analyze_field_imagery':
          endpoint = '/api/satshot/analysis'
          method = 'POST'
          body = JSON.stringify(parameters)
          break

        case 'get_available_scenes':
          endpoint = '/api/satshot/scenes'
          const sceneParams = new URLSearchParams()
          if (parameters.fieldId) sceneParams.append('fieldId', parameters.fieldId)
          if (parameters.latitude) sceneParams.append('latitude', parameters.latitude.toString())
          if (parameters.longitude) sceneParams.append('longitude', parameters.longitude.toString())
          if (parameters.dateRange) sceneParams.append('dateRange', JSON.stringify(parameters.dateRange))
          if (parameters.maxCloudCover) sceneParams.append('maxCloudCover', parameters.maxCloudCover.toString())
          endpoint += sceneParams.toString() ? `?${sceneParams.toString()}` : ''
          break

        case 'export_satshot_data':
          endpoint = '/api/satshot/exports'
          method = 'POST'
          body = JSON.stringify(parameters)
          break

        case 'test_satshot_connection':
          endpoint = '/api/satshot'
          method = 'POST'
          body = JSON.stringify({ tool: 'test_satshot_connection', args: parameters })
          break

        default:
          return {
            success: false,
            message: `Unknown Satshot tool: ${toolName}`
          }
      }

      // Make the API call
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      }

      if (body) {
        fetchOptions.body = body
      }

      // Convert relative URL to absolute for server-side fetch
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const absoluteEndpoint = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : endpoint
      const response = await fetch(absoluteEndpoint, fetchOptions)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Satshot API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: data.success !== false,
        message: data.message || `🛰️ ${toolName} completed successfully`,
        data: data.data,
        actionTaken: `Executed Satshot ${toolName}`
      }

    } catch (error) {
      console.error(`Satshot tool execution failed: ${toolName}`, error)
      return {
        success: false,
        message: `Satshot tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async executeFileManagement(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'upload_file_to_john_deere':
        return this.uploadFileToJohnDeere(parameters);
      case 'list_john_deere_files':
        return this.listJohnDeereFiles(parameters);
      default:
        return { success: false, message: 'Unknown file management tool' };
    }
  }

  private async executeExport(toolName: string, parameters: any): Promise<MCPToolResult> {
    switch (toolName) {
      case 'export_field_boundary_kml':
        return this.exportFieldBoundaryKML(parameters);
      case 'export_field_boundary_shapefile':
        return this.exportFieldBoundaryShapefile(parameters);
      case 'get_field_ndvi_satshot':
        return this.getFieldNDVIFromSatshot(parameters);
      default:
        return { success: false, message: 'Unknown export tool' };
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
    try {
      // Use the main application's API for real recommendations
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

      const recommendationsResponse = await fetch(`${baseUrl}/api/field-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!recommendationsResponse.ok) {
        // Fallback to mock data if the endpoint doesn't exist or fails
        console.log('Using fallback recommendations due to API unavailability')
        const recommendations = this.generateMockRecommendations(params)
        return {
          success: true,
          message: `🌾 Generated **AI recommendations** for field ${params.fieldId} (using fallback)`,
          data: recommendations,
          actionTaken: 'Generated field recommendations'
        }
      }

      const recommendations = await recommendationsResponse.json()
      return {
        success: true,
        message: `🌾 Retrieved **AI recommendations** for field ${params.fieldId}`,
        data: recommendations,
        actionTaken: 'Retrieved field recommendations from API'
      }
    } catch (error: any) {
      // Fallback to mock data on error
      console.log('Error fetching recommendations, using fallback:', error.message)
      const recommendations = this.generateMockRecommendations(params)
      return {
        success: true,
        message: `🌾 Generated **AI recommendations** for field ${params.fieldId} (fallback)`,
        data: recommendations,
        actionTaken: 'Generated field recommendations (fallback)'
      }
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
      // Use the main application's API endpoint for operation history
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

      const operationsResponse = await fetch(`${baseUrl}/api/johndeere/organizations/${params.organizationId}/fields/${params.fieldId}/operations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!operationsResponse.ok) {
        return {
          success: false,
          message: `Failed to get operation history for field ${params.fieldId}. Please check your permissions.`
        };
      }

      const operationsData = await operationsResponse.json()

      return {
        success: true,
        message: `Retrieved operation history for field ${params.fieldId}.`,
        data: operationsData
      };
    } catch (error: any) {
      console.error('Error in getFieldOperationHistory:', error)
      return {
        success: false,
        message: `Failed to get history for field ${params.fieldId}: ${error.message || 'Unknown error'}`
      };
    }
  }

  private async listJohnDeereFiles(params: { organizationId?: string }): Promise<MCPToolResult> {
    try {
      const apiClient = getJohnDeereAPIClient();
      let orgId = params.organizationId;

      // If orgId is not provided, fetch the default one
      if (!orgId) {
        const orgs = await apiClient.getOrganizations();
        if (orgs && orgs.length > 0) {
          orgId = orgs[0].id;
          console.log(`🏢 Auto-detected organization ID for files: ${orgId}`);
        } else {
          return { success: false, message: 'Could not find any John Deere organizations.' };
        }
      }
      
      const files = await apiClient.getFiles(orgId);
      
      return {
        success: true,
        message: `Retrieved ${files.length} files for organization ${orgId}.`,
        data: files
      };
    } catch (error: any) {
      return { success: false, message: `Failed to list files: ${error.message}` };
    }
  }

  private async getFieldBoundary(params: { organizationId?: string, fieldName: string }): Promise<MCPToolResult> {
    try {
      // Use the main application's API endpoint which has proper authentication context
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

      let orgId = params.organizationId;

      // If orgId is not provided, we need to get it from the organizations endpoint
      if (!orgId) {
        const orgsResponse = await fetch(`${baseUrl}/api/johndeere/organizations`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!orgsResponse.ok) {
          return { success: false, message: 'Failed to fetch organizations. Please check your authentication.' };
        }

        const orgsData = await orgsResponse.json()
        if (orgsData && orgsData.length > 0) {
          orgId = orgsData[0].id;
          console.log(`🏢 Auto-detected organization ID: ${orgId}`);
        } else {
          return { success: false, message: 'Could not find any John Deere organizations.' };
        }
      }

      // Get fields for the organization
      const fieldsResponse = await fetch(`${baseUrl}/api/johndeere/organizations/${orgId}/fields`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!fieldsResponse.ok) {
        return { success: false, message: `Failed to fetch fields for organization ${orgId}. Please check your permissions.` };
      }

      const fieldsData = await fieldsResponse.json()
      const fields = fieldsData.fields || []
      const field = fields.find((f: any) => f.name.toLowerCase() === params.fieldName.toLowerCase());

      if (!field) {
        return { success: false, message: `Could not find a field named "${params.fieldName}". Available fields: ${fields.map((f: any) => f.name).join(', ')}` };
      }

      // Use the boundary API endpoint
      const boundaryResponse = await fetch(`${baseUrl}/api/johndeere/organizations/${orgId}/fields/${field.id}/boundary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fieldName: params.fieldName,
          organizationId: orgId
        })
      })

      if (!boundaryResponse.ok) {
        const errorData = await boundaryResponse.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          message: `Failed to get boundary for field "${params.fieldName}": ${errorData.error || boundaryResponse.statusText}`
        };
      }

      const boundaryData = await boundaryResponse.json()

      return {
        success: true,
        message: boundaryData.message || `Successfully retrieved boundary data for field "${params.fieldName}".`,
        data: boundaryData.data
      };
    } catch (error: any) {
      console.error('Error in getFieldBoundary:', error)
      return {
        success: false,
        message: `Failed to get boundary for field "${params.fieldName}": ${error.message || 'Unknown error'}`
      };
    }
  }

  // Weather Tool Implementations
  private async getCurrentWeather(params: any): Promise<MCPToolResult> {
    try {
      const weatherClient = getWeatherAPIClient()
      
      let latitude: number
      let longitude: number
      
      if (params.latitude && params.longitude) {
        latitude = params.latitude
        longitude = params.longitude
      } else if (params.location) {
        // Enhanced location search with fallback strategies
        let locations = await weatherClient.searchLocations(params.location, 1)
        
        // If no results, try alternative search strategies
        if (locations.length === 0) {
          const originalLocation = params.location.toLowerCase()
          
          // Strategy 1: Try removing state abbreviations (e.g., "Fargo, ND" -> "Fargo")
          const withoutStateAbbrev = originalLocation.replace(/,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b.*$/, '').trim()
          if (withoutStateAbbrev !== originalLocation) {
            locations = await weatherClient.searchLocations(withoutStateAbbrev, 1)
          }
          
          // Strategy 2: Try expanding common abbreviations
          if (locations.length === 0) {
            const stateExpansions: Record<string, string> = {
              'nd': 'North Dakota', 'sd': 'South Dakota', 'ny': 'New York', 'nc': 'North Carolina', 'sc': 'South Carolina',
              'nh': 'New Hampshire', 'nj': 'New Jersey', 'nm': 'New Mexico', 'wv': 'West Virginia', 'wa': 'Washington'
            }
            
            let expandedLocation = params.location
            for (const [abbrev, fullName] of Object.entries(stateExpansions)) {
              const regex = new RegExp(`\\b${abbrev}\\b`, 'gi')
              if (regex.test(expandedLocation)) {
                expandedLocation = expandedLocation.replace(regex, fullName)
                break
              }
            }
            
            if (expandedLocation !== params.location) {
              locations = await weatherClient.searchLocations(expandedLocation, 1)
            }
          }
        }
        
        if (locations.length === 0) {
          return {
            success: false,
            message: `Location "${params.location}" not found. Please try:\n- Just the city name (e.g., "Fargo")\n- Full state name (e.g., "Fargo, North Dakota")\n- Coordinates (latitude, longitude)`
          }
        }
        
        latitude = locations[0].latitude
        longitude = locations[0].longitude
      } else {
        return {
          success: false,
          message: 'Please provide either a location name or latitude/longitude coordinates.'
        }
      }
      
      const weatherData = await weatherClient.getAgriculturalWeather(latitude, longitude, 1)
      
      return {
        success: true,
        message: `🌤️ Current weather conditions retrieved for ${weatherData.location.name || 'your location'}`,
        data: weatherData,
        actionTaken: 'Retrieved current weather conditions'
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get current weather: ${error.message}`
      }
    }
  }

  private async getWeatherForecast(params: any): Promise<MCPToolResult> {
    try {
      const weatherClient = getWeatherAPIClient()
      const days = params.days || 7
      
      let latitude: number
      let longitude: number
      
      if (params.latitude && params.longitude) {
        latitude = params.latitude
        longitude = params.longitude
      } else if (params.location) {
        // Enhanced location search with fallback strategies
        let locations = await weatherClient.searchLocations(params.location, 1)
        
        // If no results, try alternative search strategies
        if (locations.length === 0) {
          const originalLocation = params.location.toLowerCase()
          
          // Strategy 1: Try removing state abbreviations (e.g., "Fargo, ND" -> "Fargo")
          const withoutStateAbbrev = originalLocation.replace(/,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b.*$/, '').trim()
          if (withoutStateAbbrev !== originalLocation) {
            locations = await weatherClient.searchLocations(withoutStateAbbrev, 1)
          }
          
          // Strategy 2: Try expanding common abbreviations
          if (locations.length === 0) {
            const stateExpansions: Record<string, string> = {
              'nd': 'North Dakota', 'sd': 'South Dakota', 'ny': 'New York', 'nc': 'North Carolina', 'sc': 'South Carolina',
              'nh': 'New Hampshire', 'nj': 'New Jersey', 'nm': 'New Mexico', 'wv': 'West Virginia', 'wa': 'Washington'
            }
            
            let expandedLocation = params.location
            for (const [abbrev, fullName] of Object.entries(stateExpansions)) {
              const regex = new RegExp(`\\b${abbrev}\\b`, 'gi')
              if (regex.test(expandedLocation)) {
                expandedLocation = expandedLocation.replace(regex, fullName)
                break
              }
            }
            
            if (expandedLocation !== params.location) {
              locations = await weatherClient.searchLocations(expandedLocation, 1)
            }
          }
        }
        
        if (locations.length === 0) {
          return {
            success: false,
            message: `Location "${params.location}" not found. Please try:\n- Just the city name (e.g., "Fargo")\n- Full state name (e.g., "Fargo, North Dakota")\n- Coordinates (latitude, longitude)`
          }
        }
        
        latitude = locations[0].latitude
        longitude = locations[0].longitude
      } else {
        return {
          success: false,
          message: 'Please provide either a location name or latitude/longitude coordinates.'
        }
      }
      
      const weatherData = await weatherClient.getAgriculturalWeather(latitude, longitude, days)
      
      return {
        success: true,
        message: `📅 ${days}-day weather forecast retrieved for ${weatherData.location.name || 'your location'}`,
        data: weatherData,
        actionTaken: `Retrieved ${days}-day weather forecast`
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get weather forecast: ${error.message}`
      }
    }
  }

  // EU Commission Tool Implementations
  private async getEUMarketPrices(params: any): Promise<MCPToolResult> {
    try {
      const response = await euAgriAPI.getMarketPrices(params.sector, {
        memberState: params.memberState,
        limit: params.limit
      });
      
      return {
        success: true,
        message: `🇪🇺 Retrieved EU market prices for ${params.sector}${params.memberState ? ` in ${params.memberState}` : ''}`,
        data: response.data,
        actionTaken: `Retrieved EU ${params.sector} market prices`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get EU market prices: ${error.message}`
      };
    }
  }

  private async getEUProductionData(params: any): Promise<MCPToolResult> {
    try {
      const response = await euAgriAPI.getProductionData(params.sector, {
        memberState: params.memberState,
        year: params.year,
        limit: params.limit
      });
      
      return {
        success: true,
        message: `🇪🇺 Retrieved EU production data for ${params.sector}${params.memberState ? ` in ${params.memberState}` : ''}`,
        data: response.data,
        actionTaken: `Retrieved EU ${params.sector} production data`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get EU production data: ${error.message}`
      };
    }
  }

  private async getEUTradeData(params: any): Promise<MCPToolResult> {
    try {
      const response = await euAgriAPI.getTradeData(params.sector, {
        tradeType: params.tradeType,
        memberState: params.memberState,
        partnerCountry: params.partnerCountry,
        limit: params.limit
      });
      
      return {
        success: true,
        message: `🇪🇺 Retrieved EU trade data for ${params.sector}${params.memberState ? ` in ${params.memberState}` : ''}`,
        data: response.data,
        actionTaken: `Retrieved EU ${params.sector} trade data`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get EU trade data: ${error.message}`
      };
    }
  }

  private async getEUMarketDashboard(params: any): Promise<MCPToolResult> {
    try {
      const response = await euAgriAPI.getMarketDashboard(params.sector);
      
      return {
        success: true,
        message: `🇪🇺 Retrieved EU market dashboard for ${params.sector}`,
        data: response.data,
        actionTaken: `Retrieved EU ${params.sector} market dashboard`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get EU market dashboard: ${error.message}`
      };
    }
  }

  // USDA Tool Implementations
  private async getUSDAMarketPrices(params: any): Promise<MCPToolResult> {
    try {
      const response = await usdaAPI.getMarketPrices(
        params.category,
        {
          region: params.region,
          limit: params.limit
        }
      );
      
      return {
        success: true,
        message: `🇺🇸 Retrieved USDA market prices for ${params.category}${params.region ? ` in ${params.region}` : ''}`,
        data: response.data,
        actionTaken: `Retrieved USDA ${params.category} market prices`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get USDA market prices: ${error.message}`
      };
    }
  }

  private async getUSDAProductionData(params: any): Promise<MCPToolResult> {
    try {
      const response = await usdaAPI.getProductionData(
        params.category,
        {
          region: params.region,
          year: params.year,
          limit: params.limit
        }
      );
      
      return {
        success: true,
        message: `🇺🇸 Retrieved USDA production data for ${params.category}${params.region ? ` in ${params.region}` : ''}`,
        data: response.data,
        actionTaken: `Retrieved USDA ${params.category} production data`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get USDA production data: ${error.message}`
      };
    }
  }

  private async getUSDATradeData(params: any): Promise<MCPToolResult> {
    try {
      const response = await usdaAPI.getTradeData(
        params.category,
        {
          tradeType: params.tradeType,
          country: params.country,
          limit: params.limit
        }
      );
      
      return {
        success: true,
        message: `🇺🇸 Retrieved USDA trade data for ${params.category}${params.tradeType ? ` (${params.tradeType})` : ''}`,
        data: response.data,
        actionTaken: `Retrieved USDA ${params.category} trade data`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get USDA trade data: ${error.message}`
      };
    }
  }

  private async getUSDAMarketDashboard(params: any): Promise<MCPToolResult> {
    try {
      const response = await usdaAPI.getMarketDashboard(params.category);
      
      return {
        success: true,
        message: `🇺🇸 Retrieved USDA market dashboard for ${params.category}`,
        data: response.data,
        actionTaken: `Retrieved USDA ${params.category} market dashboard`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get USDA market dashboard: ${error.message}`
      };
    }
  }

  // Auravant Tool Implementations
  private async getAuravantFields(params: any): Promise<MCPToolResult> {
    try {
      // Note: This requires user authentication - will be handled by Extension or Bearer token
      const userId = params.userId; // This should be passed from the authenticated session
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const fields = await client.getFields();
      
      return {
        success: true,
        message: `🌾 Retrieved ${fields.length} fields from Auravant`,
        data: fields,
        actionTaken: 'Retrieved Auravant fields'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get Auravant fields: ${error.message}`
      };
    }
  }

  private async getAuravantFarms(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const farms = await client.getFarms();
      
      return {
        success: true,
        message: `🏡 Retrieved ${farms.length} farms from Auravant`,
        data: farms,
        actionTaken: 'Retrieved Auravant farms'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get Auravant farms: ${error.message}`
      };
    }
  }

  private async getAuravantLabourOperations(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const operations = await client.getLabourOperations({
        yeargroup: params.yeargroup,
        farm_id: params.farm_id,
        field_id: params.field_id,
        date_from: params.date_from,
        date_to: params.date_to,
        status: params.status
      });
      
      return {
        success: true,
        message: `🚜 Retrieved ${operations.data?.length || 0} labour operations from Auravant`,
        data: operations,
        actionTaken: 'Retrieved Auravant labour operations'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get Auravant labour operations: ${error.message}`
      };
    }
  }

  private async getAuravantLivestock(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const herds = await client.getHerds();
      
      return {
        success: true,
        message: `🐄 Retrieved ${herds.length} livestock herds from Auravant`,
        data: herds,
        actionTaken: 'Retrieved Auravant livestock herds'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get Auravant livestock: ${error.message}`
      };
    }
  }

  private async createAuravantSowing(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const result = await client.createSowing({
        field_id: params.field_id,
        yeargroup: params.yeargroup,
        date: params.date,
        surface: params.surface,
        crop_id: params.crop_id,
        variety_id: params.variety_id
      });
      
      return {
        success: true,
        message: `🌱 Successfully created sowing operation in Auravant`,
        data: result,
        actionTaken: `Created sowing operation for field ${params.field_id}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create Auravant sowing operation: ${error.message}`
      };
    }
  }

  private async createAuravantHarvest(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const result = await client.createHarvest({
        field_id: params.field_id,
        yeargroup: params.yeargroup,
        date: params.date,
        surface: params.surface,
        crop_id: params.crop_id,
        yield: params.yield,
        humidity: params.humidity
      });
      
      return {
        success: true,
        message: `🌾 Successfully created harvest operation in Auravant`,
        data: result,
        actionTaken: `Created harvest operation for field ${params.field_id}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create Auravant harvest operation: ${error.message}`
      };
    }
  }

  private async getAuravantWorkOrders(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const workOrders = await client.getWorkOrders({
        yeargroup: params.yeargroup,
        status: params.status
      });
      
      return {
        success: true,
        message: `📋 Retrieved ${workOrders.length} work orders from Auravant`,
        data: workOrders,
        actionTaken: 'Retrieved Auravant work orders'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to get Auravant work orders: ${error.message}`
      };
    }
  }

  private async createAuravantHerd(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for Auravant access'
        };
      }

      const client = await AuravantAuth.getClient(userId);
      if (!client) {
        return {
          success: false,
          message: 'Auravant not connected. Please connect your Auravant account first.'
        };
      }

      const result = await client.createHerd({
        herd_name: params.herd_name,
        animal_count: params.animal_count,
        weight: params.weight,
        weight_unit: params.weight_unit || 'Kg',
        type_id: params.type_id,
        field_id: params.field_id
      });
      
      return {
        success: true,
        message: `🐄 Successfully created livestock herd "${params.herd_name}" in Auravant`,
        data: result,
        actionTaken: `Created livestock herd with ${params.animal_count} animals`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create Auravant livestock herd: ${error.message}`
      };
    }
  }

  private async uploadFileToJohnDeere(params: any): Promise<MCPToolResult> {
    try {
      const userId = params.userId;
      if (!userId) {
        return {
          success: false,
          message: 'User authentication required for John Deere file upload'
        };
      }

      const apiClient = getJohnDeereAPIClient();
      if (!apiClient) {
        return {
          success: false,
          message: 'John Deere API client not initialized. Please ensure connection is established.'
        };
      }

      let orgId: string;
      if (params.organizationId) {
        orgId = params.organizationId;
      } else {
        const orgs = await apiClient.getOrganizations();
        if (orgs && orgs.length > 0) {
          orgId = orgs[0].id;
          console.log(`🏢 Auto-detected organization ID for file upload: ${orgId}`);
        } else {
          return { success: false, message: 'Could not find any John Deere organizations.' };
        }
      }

      const fileName = params.fileName;
      const userIntent = params.userIntent || `Upload file: ${fileName}`;
      
      // Convert base64 content to Buffer
      let fileBuffer: Buffer;
      try {
        fileBuffer = Buffer.from(params.fileContent, 'base64');
      } catch (error) {
        return {
          success: false,
          message: 'Invalid file content. File content must be base64 encoded.'
        };
      }

      // Determine file type using intelligent detection or explicit type
      let fileType = params.fileType;
      let detectionInfo = null;
      
      if (!fileType) {
        // Use intelligent file type detection
        detectionInfo = (apiClient.constructor as any).detectFileType(fileName, userIntent);
        fileType = detectionInfo.fileType;
        
        // If confidence is low, ask user for clarification
        if (detectionInfo.confidence === 'low') {
          return {
            success: false,
            message: `Unable to determine file type for "${fileName}". ${detectionInfo.reasoning}. Please specify the file type explicitly using one of: PRESCRIPTION, BOUNDARY, WORK_DATA, SETUP_FILE, REPORT, OTHER`,
            data: {
              suggestUserQuery: true,
              detectedType: fileType,
              confidence: detectionInfo.confidence,
              reasoning: detectionInfo.reasoning,
              availableTypes: [
                'PRESCRIPTION - Variable Rate Application Maps and Prescriptions',
                'BOUNDARY - Field Boundaries and Geographic Shapes', 
                'WORK_DATA - Harvest, Planting, and Field Operations',
                'SETUP_FILE - Equipment Configuration Files',
                'REPORT - Analysis and Summary Documents',
                'OTHER - General Files'
              ]
            }
          };
        }
        
        console.log(`🤖 Auto-detected file type: ${fileType} (confidence: ${detectionInfo.confidence})`);
        console.log(`💡 Reasoning: ${detectionInfo.reasoning}`);
      }

      // Determine content type based on file extension
      const contentType = this.getContentTypeFromFileName(fileName);

      const result = await apiClient.uploadFile(orgId, fileBuffer, fileName, contentType, fileType);

      return {
        success: true,
        message: `✅ Successfully uploaded "${fileName}" to John Deere as ${fileType}`,
        data: {
          ...result,
          organizationId: orgId,
          fileName,
          fileType,
          detectionInfo: detectionInfo ? {
            confidence: detectionInfo.confidence,
            reasoning: detectionInfo.reasoning
          } : null
        },
        actionTaken: `Uploaded ${fileType} file "${fileName}" to John Deere organization ${orgId}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to upload file to John Deere: ${error.message}`
      };
    }
  }

  private getContentTypeFromFileName(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    const contentTypes: { [key: string]: string } = {
      'zip': 'application/zip',
      'pdf': 'application/pdf',
      'csv': 'text/csv',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'shp': 'application/octet-stream',
      'kml': 'application/vnd.google-earth.kml+xml',
      'geojson': 'application/geo+json',
      'json': 'application/json',
      'xml': 'application/xml',
      'txt': 'text/plain'
    };
    
    return contentTypes[extension || ''] || 'application/octet-stream';
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

  // Export Tool Implementations
  private async exportFieldBoundaryKML(params: {
    fieldName: string,
    platform: 'johndeere' | 'satshot' | 'fieldview' | 'auravant',
    includeMetadata?: boolean,
    coordinateSystem?: string
  }): Promise<MCPToolResult> {
    try {
      console.log(`📁 Exporting KML for field: ${params.fieldName} from ${params.platform}`)

      // Get field boundary data based on platform
      let fieldData: any = null

      if (params.platform === 'johndeere') {
        // Get field boundary from John Deere
        const boundaryResponse = await this.getFieldBoundaryFromJohnDeere(params.fieldName)
        if (!boundaryResponse.success) {
          return boundaryResponse
        }
        fieldData = boundaryResponse.data
      } else {
        return {
          success: false,
          message: `Platform '${params.platform}' is not yet supported for KML export. Currently supported: johndeere`
        }
      }

      // Import KML generator dynamically
      const { KMLGenerator } = await import('../lib/kml-generator')

      // Convert to standardized format and generate KML
      const standardizedField = KMLGenerator.convertJohnDeereBoundary(fieldData)

      const kmlContent = KMLGenerator.generateFieldBoundaryKML(standardizedField)

      const filename = `${params.fieldName.replace(/[^a-zA-Z0-9]/g, '_')}_boundary.kml`

      return {
        success: true,
        message: `KML file generated successfully for field "${params.fieldName}"`,
        data: {
          kmlContent,
          filename,
          fieldName: params.fieldName,
          platform: params.platform,
          coordinateCount: standardizedField.coordinates.length
        },
        actionTaken: 'Generated KML export file'
      }
    } catch (error) {
      console.error('❌ KML export failed:', error)
      return {
        success: false,
        message: `Failed to export KML for field "${params.fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async exportFieldBoundaryShapefile(params: {
    fieldName: string,
    platform: 'johndeere' | 'satshot' | 'fieldview' | 'auravant',
    includeMetadata?: boolean
  }): Promise<MCPToolResult> {
    try {
      console.log(`📁 Exporting Shapefile for field: ${params.fieldName} from ${params.platform}`)

      return {
        success: false,
        message: 'Shapefile export is not yet implemented. Please use KML export instead.',
        data: {
          fieldName: params.fieldName,
          platform: params.platform,
          status: 'not_implemented'
        }
      }
    } catch (error) {
      console.error('❌ Shapefile export failed:', error)
      return {
        success: false,
        message: `Failed to export Shapefile for field "${params.fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async getFieldNDVIFromSatshot(params: {
    fieldName: string,
    platform: 'johndeere' | 'satshot' | 'fieldview' | 'auravant',
    dateRange?: string
  }): Promise<MCPToolResult> {
    try {
      console.log(`🌱 Getting NDVI for field: ${params.fieldName} from ${params.platform}`)

      // First get field boundary to extract coordinates
      let fieldData: any = null
      let coordinates: { lat: number, lng: number } | null = null

      if (params.platform === 'johndeere') {
        // Get field boundary from John Deere
        const boundaryResponse = await this.getFieldBoundaryFromJohnDeere(params.fieldName)
        if (!boundaryResponse.success) {
          return boundaryResponse
        }
        fieldData = boundaryResponse.data

        // Extract coordinates from John Deere boundary data
        const { extractCoordinatesFromBoundary } = await import('../app/api/chat/completion/route')
        coordinates = extractCoordinatesFromBoundary(fieldData)
      } else {
        return {
          success: false,
          message: `Platform '${params.platform}' is not yet supported for NDVI analysis. Currently supported: johndeere`
        }
      }

      if (!coordinates) {
        return {
          success: false,
          message: `Could not extract coordinates from field "${params.fieldName}" boundary data`
        }
      }

      // Use Satshot API to get NDVI data
      const satshotResponse = await this.getSatshotNDVI(coordinates, params.dateRange || '30d')

      return {
        success: true,
        message: `Retrieved NDVI data for field "${params.fieldName}" using coordinates from ${params.platform}`,
        data: {
          fieldName: params.fieldName,
          platform: params.platform,
          coordinates,
          dateRange: params.dateRange || '30d',
          ndviData: satshotResponse
        },
        actionTaken: 'Retrieved NDVI analysis from Satshot'
      }
    } catch (error) {
      console.error('❌ NDVI retrieval failed:', error)
      return {
        success: false,
        message: `Failed to get NDVI for field "${params.fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Helper method to get field boundary from John Deere
  private async getFieldBoundaryFromJohnDeere(fieldName: string): Promise<MCPToolResult> {
    try {
      const apiClient = getJohnDeereAPIClient()

      // Get organizations first
      const orgs = await apiClient.getOrganizations()
      if (!orgs || orgs.length === 0) {
        return { success: false, message: 'No John Deere organizations found' }
      }

      const orgId = orgs[0].id

      // Get fields to find the matching field
      const fields = await apiClient.getFields(orgId)
      const targetField = fields?.find((f: any) => f.name.toLowerCase() === fieldName.toLowerCase())

      if (!targetField) {
        return { success: false, message: `Field "${fieldName}" not found in organization ${orgId}` }
      }

      // Get field boundary
      const boundary = await apiClient.getBoundariesForField(targetField.id, orgId)

      return {
        success: true,
        message: `Retrieved boundary for field "${fieldName}"`,
        data: {
          field: targetField,
          boundary: {
            id: targetField.id,
            name: targetField.name,
            ...boundary
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to get John Deere field boundary:', error)
      return {
        success: false,
        message: `Failed to get field boundary: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Helper method to get NDVI from Satshot
  private async getSatshotNDVI(coordinates: { lat: number, lng: number }, dateRange: string): Promise<any> {
    // This is a placeholder - you would implement actual Satshot API integration here
    console.log(`🌱 Getting NDVI data from Satshot for coordinates: ${coordinates.lat}, ${coordinates.lng}`)

    // Mock NDVI data for now
    return {
      ndvi: 0.72,
      dateRange,
      coordinates,
      lastUpdated: new Date().toISOString(),
      status: 'mock_data',
      message: 'NDVI integration with Satshot is not yet implemented. This is mock data.'
    }
  }
}

export const mcpToolExecutor = new MCPToolExecutor() 