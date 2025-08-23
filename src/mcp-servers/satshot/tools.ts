// Satshot Tools Implementation

import { Tool } from '@modelcontextprotocol/sdk/types'
import { MCPToolResult, MCPTool } from '../base/types'
import { MCPUtils } from '../base/utils'
import { SatshotAuth } from './auth'
import { SatshotToolArgs } from './types'

export class SatshotTools {
  private auth: SatshotAuth

  constructor(auth: SatshotAuth) {
    this.auth = auth
  }

  public getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_satshot_maps',
        description: 'Get available maps from Satshot GIS system',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { 
              type: 'number', 
              description: 'Maximum number of maps to return',
              minimum: 1,
              maximum: 100,
              default: 10
            },
            mapType: {
              type: 'string',
              description: 'Type of maps to filter by',
              enum: ['field', 'farm', 'region', 'all']
            }
          }
        }
      },
      {
        name: 'load_satshot_map',
        description: 'Load a specific map context from Satshot',
        inputSchema: {
          type: 'object',
          properties: {
            mapId: { 
              type: 'string', 
              description: 'Unique identifier of the map to load' 
            },
            includeLayers: {
              type: 'boolean',
              description: 'Whether to include layer information',
              default: true
            }
          },
          required: ['mapId']
        }
      },
      {
        name: 'get_satshot_fields',
        description: 'Get field boundaries and information from Satshot',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'Region or area to filter fields'
            },
            cropType: {
              type: 'string',
              description: 'Filter by crop type'
            },
            minArea: {
              type: 'number',
              description: 'Minimum field area in acres'
            },
            includeGeometry: {
              type: 'boolean',
              description: 'Include field boundary geometry',
              default: true
            }
          }
        }
      },
      {
        name: 'analyze_field_imagery',
        description: 'Analyze satellite imagery for a specific field',
        inputSchema: {
          type: 'object',
          properties: {
            fieldId: {
              type: 'string',
              description: 'Field identifier for analysis'
            },
            analysisType: {
              type: 'string',
              description: 'Type of analysis to perform',
              enum: ['ndvi', 'evi', 'stress', 'yield_prediction', 'change_detection'],
              default: 'ndvi'
            },
            dateRange: {
              type: 'object',
              description: 'Date range for imagery analysis',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' }
              }
            },
            resolution: {
              type: 'number',
              description: 'Desired analysis resolution in meters',
              minimum: 1,
              maximum: 30,
              default: 10
            }
          },
          required: ['fieldId']
        }
      },
      {
        name: 'get_available_scenes',
        description: 'Get available satellite scenes for a location',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: { 
              type: 'number', 
              description: 'Latitude coordinate',
              minimum: -90,
              maximum: 90
            },
            longitude: { 
              type: 'number', 
              description: 'Longitude coordinate',
              minimum: -180,
              maximum: 180
            },
            fieldId: {
              type: 'string',
              description: 'Alternative: use field ID instead of coordinates'
            },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' }
              }
            },
            maxCloudCover: {
              type: 'number',
              description: 'Maximum acceptable cloud cover percentage',
              minimum: 0,
              maximum: 100,
              default: 20
            }
          },
          anyOf: [
            { required: ['latitude', 'longitude'] },
            { required: ['fieldId'] }
          ]
        }
      },
      {
        name: 'export_satshot_data',
        description: 'Export data from Satshot in various formats',
        inputSchema: {
          type: 'object',
          properties: {
            dataType: {
              type: 'string',
              description: 'Type of data to export',
              enum: ['field_boundaries', 'analysis_results', 'imagery', 'report']
            },
            format: {
              type: 'string',
              description: 'Export format',
              enum: ['shapefile', 'kml', 'geojson', 'tiff', 'pdf', 'csv'],
              default: 'shapefile'
            },
            itemIds: {
              type: 'array',
              description: 'IDs of items to export',
              items: { type: 'string' }
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Include metadata in export',
              default: true
            }
          },
          required: ['dataType', 'itemIds']
        }
      },
      {
        name: 'test_satshot_connection',
        description: 'Test connection to Satshot API and get server status',
        inputSchema: {
          type: 'object',
          properties: {
            includeAuth: {
              type: 'boolean',
              description: 'Test authentication as well as connection',
              default: true
            }
          }
        }
      }
    ]
  }

  public getMCPTools(): MCPTool[] {
    return [
      {
        name: 'get_satshot_maps',
        description: 'Get available maps from Satshot GIS system',
        inputSchema: this.getToolDefinitions()[0].inputSchema,
        handler: this.getMaps.bind(this)
      },
      {
        name: 'load_satshot_map',
        description: 'Load a specific map context from Satshot',
        inputSchema: this.getToolDefinitions()[1].inputSchema,
        handler: this.loadMap.bind(this)
      },
      {
        name: 'get_satshot_fields',
        description: 'Get field boundaries and information from Satshot',
        inputSchema: this.getToolDefinitions()[2].inputSchema,
        handler: this.getFields.bind(this)
      },
      {
        name: 'analyze_field_imagery',
        description: 'Analyze satellite imagery for a specific field',
        inputSchema: this.getToolDefinitions()[3].inputSchema,
        handler: this.analyzeFieldImagery.bind(this)
      },
      {
        name: 'get_available_scenes',
        description: 'Get available satellite scenes for a location',
        inputSchema: this.getToolDefinitions()[4].inputSchema,
        handler: this.getAvailableScenes.bind(this)
      },
      {
        name: 'export_satshot_data',
        description: 'Export data from Satshot in various formats',
        inputSchema: this.getToolDefinitions()[5].inputSchema,
        handler: this.exportData.bind(this)
      },
      {
        name: 'test_satshot_connection',
        description: 'Test connection to Satshot API and get server status',
        inputSchema: this.getToolDefinitions()[6].inputSchema,
        handler: this.testConnection.bind(this)
      }
    ]
  }

  // Tool Implementation Methods

  public async getMaps(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Getting available maps', args)

      // Check authentication
      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult(
          'Satshot authentication required',
          'No valid authentication found. Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD.'
        )
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Call Satshot API to get maps (no parameters for general listing)
      const response = await client.callMethod('get_available_maps', [])

      if (response.error) {
        return MCPUtils.createErrorResult(
          'Failed to get maps from Satshot',
          response.error.faultString
        )
      }

      const maps = response.result || []

      return MCPUtils.createSuccessResult(
        `🗺️ Retrieved ${maps.length} map(s) from Satshot`,
        { maps, count: maps.length, server: this.auth.getServerInfo().server },
        `Found ${maps.length} maps`
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Failed to get maps', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve maps',
        errorMessage
      )
    }
  }

  public async loadMap(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Loading map', args)

      const missing = MCPUtils.validateRequiredFields(args, ['mapId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult(
          'Satshot authentication required',
          'No valid authentication found. Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD.'
        )
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Load specific map
      const response = await client.callMethod('load_map', [
        args.mapId,
        args.includeLayers !== false
      ])

      if (response.error) {
        return MCPUtils.createErrorResult(
          'Failed to load map from Satshot',
          response.error.faultString
        )
      }

      const mapData = response.result

      return MCPUtils.createSuccessResult(
        `🗺️ Loaded map: ${mapData?.name || args.mapId}`,
        { map: mapData, server: this.auth.getServerInfo().server },
        `Map loaded successfully`
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Failed to load map', error)
      return MCPUtils.createErrorResult(
        'Failed to load map',
        errorMessage
      )
    }
  }

  public async getFields(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Getting fields', args)

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult(
          'Satshot authentication required',
          'No valid authentication found. Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD.'
        )
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Get fields - try simple method name first
      const response = await client.callMethod('get_regions', [
        'field' // region type - other params may not be supported
      ])

      if (response.error) {
        return MCPUtils.createErrorResult(
          'Failed to get fields from Satshot',
          response.error.faultString
        )
      }

      const fields = response.result || []

      return MCPUtils.createSuccessResult(
        `🌾 Retrieved ${fields.length} field(s) from Satshot`,
        { fields, count: fields.length, filters: args },
        `Found ${fields.length} fields`
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Failed to get fields', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve fields',
        errorMessage
      )
    }
  }

  public async analyzeFieldImagery(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Analyzing field imagery', args)

      const missing = MCPUtils.validateRequiredFields(args, ['fieldId'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult(
          'Satshot authentication required'
        )
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Perform imagery analysis
      const response = await client.callMethod('mapcenter_api.analyze_scene', [
        args.fieldId,
        args.analysisType || 'ndvi',
        args.dateRange || null,
        args.resolution || 10
      ])

      if (response.error) {
        return MCPUtils.createErrorResult(
          'Failed to analyze field imagery',
          response.error.faultString
        )
      }

      const analysis = response.result

      return MCPUtils.createSuccessResult(
        `🛰️ Completed ${args.analysisType || 'NDVI'} analysis for field ${args.fieldId}`,
        { analysis, fieldId: args.fieldId, analysisType: args.analysisType },
        `Analysis completed successfully`
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Failed to analyze field imagery', error)
      return MCPUtils.createErrorResult(
        'Failed to analyze field imagery',
        errorMessage
      )
    }
  }

  public async getAvailableScenes(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Getting available scenes', args)

      // Validate location parameters
      if (!args.fieldId && (!args.latitude || !args.longitude)) {
        return MCPUtils.createErrorResult(
          'Either fieldId or latitude/longitude coordinates are required'
        )
      }

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult('Satshot authentication required')
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Get available scenes
      const response = await client.callMethod('mapcenter_api.get_scenes', [
        args.fieldId || null,
        args.latitude || null,
        args.longitude || null,
        args.dateRange || null,
        args.maxCloudCover || 20
      ])

      if (response.error) {
        return MCPUtils.createErrorResult(
          'Failed to get available scenes',
          response.error.faultString
        )
      }

      const scenes = response.result || []

      return MCPUtils.createSuccessResult(
        `🛰️ Found ${scenes.length} available scene(s)`,
        { scenes, count: scenes.length, location: args },
        `Found ${scenes.length} scenes`
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Failed to get available scenes', error)
      return MCPUtils.createErrorResult(
        'Failed to get available scenes',
        errorMessage
      )
    }
  }

  public async exportData(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Exporting data', args)

      const missing = MCPUtils.validateRequiredFields(args, ['dataType', 'itemIds'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult('Satshot authentication required')
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Export data
      const response = await client.callMethod('mapcenter_api.export_data', [
        args.dataType,
        args.format || 'shapefile',
        args.itemIds,
        args.includeMetadata !== false
      ])

      if (response.error) {
        return MCPUtils.createErrorResult(
          'Failed to export data from Satshot',
          response.error.faultString
        )
      }

      const exportInfo = response.result

      return MCPUtils.createSuccessResult(
        `📦 Export created: ${args.dataType} as ${args.format}`,
        { export: exportInfo, dataType: args.dataType, format: args.format },
        `Export created successfully`
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Failed to export data', error)
      return MCPUtils.createErrorResult(
        'Failed to export data',
        errorMessage
      )
    }
  }

  public async testConnection(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Testing connection', args)

      const authStatus = this.auth.getAuthStatus()
      const serverInfo = this.auth.getServerInfo()
      
      // Test basic connection
      const canConnect = await this.auth.testServerConnection()
      
      let authTestResult = false
      if (args.includeAuth !== false && authStatus.hasCredentials) {
        authTestResult = await this.auth.authenticate()
      }

      const result = {
        connection: {
          server: serverInfo.server,
          url: serverInfo.url,
          canConnect,
          lastTest: new Date().toISOString()
        },
        authentication: {
          hasCredentials: authStatus.hasCredentials,
          authenticated: authTestResult,
          username: authStatus.username,
          sessionValid: authStatus.sessionValid
        },
        overall: canConnect && (args.includeAuth === false || authTestResult)
      }

      return MCPUtils.createSuccessResult(
        `🔗 Satshot connection test ${result.overall ? 'passed' : 'failed'}`,
        result,
        result.overall ? 'All tests passed' : 'Some tests failed'
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Connection test failed', error)
      return MCPUtils.createErrorResult(
        'Connection test failed',
        errorMessage
      )
    }
  }
}
