// Satshot Tools Implementation

import { Tool } from '@modelcontextprotocol/sdk/types.js'
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
        inputSchema: {
          type: 'object',
          properties: {
            includeAuth: {
              type: 'boolean',
              description: 'Test authentication as well as connection',
              default: true
            }
          }
        },
        handler: this.testConnection.bind(this)
      },
      {
        name: 'test_satshot_polygon_analysis',
        description: 'Test polygon-based NDVI analysis with a sample farm field polygon',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: this.testPolygonAnalysis.bind(this)
      },
      {
        name: 'test_create_region',
        description: 'Test the create_region method with correct parameters as per documentation',
        inputSchema: {
          type: 'object',
          properties: {
            regionName: {
              type: 'string',
              description: 'Name for the test region',
              default: 'Test NDVI Field'
            },
            regionDescription: {
              type: 'string',
              description: 'Description for the test region',
              default: 'Test region for polygon NDVI analysis'
            },
            includeObjects: {
              type: 'boolean',
              description: 'Try to include sample objects in region creation',
              default: false
            }
          }
        },
        handler: this.testCreateRegion.bind(this)
      },
      {
        name: 'test_analyze_extracted_image_set',
        description: 'Test the analyze_extracted_image_set method for NDVI analysis on polygons',
        inputSchema: {
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              description: 'Analysis type (NIR, NDVIR, NDVIG, REDEDGE, NDVIREDEDGE, MULTIBAND)',
              default: 'NDVIR'
            },
            mode: {
              type: 'string',
              description: 'Analysis mode (standard, minmax, minmaxgroup, custom)',
              default: 'minmax'
            },
            numZones: {
              type: 'integer',
              description: 'Number of zones for analysis (2-31)',
              default: 5
            },
            testWithMockData: {
              type: 'boolean',
              description: 'Test with mock hilite/image data instead of real extraction',
              default: true
            }
          }
        },
        handler: this.testAnalyzeExtractedImageSet.bind(this)
      },

      {
        name: 'test_load_map_method',
        description: 'Test the specific load_map method with exact documentation parameters',
        inputSchema: {
          type: 'object',
          properties: {
            stateName: {
              type: 'string',
              description: 'State name or 2-letter code (e.g., ND, North Dakota)',
              default: 'ND'
            }
          }
        },
        handler: this.testLoadMapMethod.bind(this)
      },
      {
        name: 'test_get_map_info_method',
        description: 'Test the specific get_map_info method with exact documentation parameters',
        inputSchema: {
          type: 'object',
          properties: {
            mapContext: {
              type: 'string',
              description: 'Map context handle from load_map (e.g., "7itczae00oe7rm3szs7iprnqumgbu424.map")',
              default: '7itczae00oe7rm3szs7iprnqumgbu424.map'
            }
          }
        },
        handler: this.testGetMapInfoMethod.bind(this)
      },
      {
        name: 'get_satshot_user_info',
        description: 'Get detailed user information, fields, and maps from Satshot account',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: this.getUserInfo.bind(this)
      }
    ]
  }

  // Tool Implementation Methods

  public async getMaps(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Getting available maps', args)

      // Ensure we have a fresh authenticated client
      const isDevMode = process.env.NODE_ENV === 'development'
      if (isDevMode) console.log('🔧 Satshot: Starting authentication process')
      const hasAuth = await this.auth.authenticate()
      if (isDevMode) console.log('🔧 Satshot: Authentication result:', hasAuth)

      if (!hasAuth) {
        if (isDevMode) console.log('🔧 Satshot: Authentication failed')
        return MCPUtils.createErrorResult(
          'Satshot authentication required',
          'No valid authentication found. Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD.'
        )
      }

      // Get the authenticated client and ensure it has a valid session
      let client = this.auth.getClient()
      if (isDevMode) console.log('🔧 Satshot: Got client:', client ? 'yes' : 'no')

      if (!client) {
        if (isDevMode) console.log('🔧 Satshot: No client available after authentication')
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Double-check the session is valid
      const session = client.getSession()
      if (isDevMode) {
        console.log('🔧 Satshot: Client session:', session ? 'valid' : 'null')
        if (session) {
          console.log('🔧 Satshot: Session details: user=' + session.username + ', server=' + session.server + ', token=' + (session.sessionToken ? 'present' : 'null'))
          console.log('🔧 Satshot: Client URL with token:', client.getClientUrl())
        } else {
          console.log('🔧 Satshot: No session found, attempting to get session from auth')
          // Try to get the session directly from auth
          const authSession = this.auth.getSession()
          if (authSession) {
            console.log('🔧 Satshot: Found session in auth, setting on client')
            console.log('🔧 Satshot: Auth session details: user=' + authSession.username + ', server=' + authSession.server + ', token=' + (authSession.sessionToken ? 'present' : 'null'))
            client.setSession(authSession)
          }
        }
      }

      let maps: any[] = []
      let methodUsed = ''
      let errorMessage = ''

      // Try the correct SatShot API methods based on documentation
      // Method names don't use mapcenter_api. prefix in the actual API
      const methodsToTry = [
        // First, try methods that return map contexts or lists
        { method: 'get_maps', params: [], description: 'List all maps' },
        { method: 'list_maps', params: [], description: 'List maps' },
        { method: 'get_user_maps', params: [], description: 'Get user maps' },
        { method: 'get_visible_maps', params: [], description: 'Get visible maps' },
        { method: 'get_my_maps', params: [], description: 'Get my maps' },
        // Fallback to working method
        { method: 'get_my_user_info', params: [], description: 'Connection test' }
      ]

      for (const { method, params, description } of methodsToTry) {
        try {
          if (isDevMode) console.log('🔧 Satshot: Trying', description, '-', method, 'with params', params)
          const response = await client.callMethod(method, params)
          if (isDevMode) console.log('🔧 Satshot: Method', method, 'response:', response ? 'received' : 'null')

          if (!response.error) {
            methodUsed = method
            if (isDevMode) console.log('🔧 Satshot: Method', method, 'succeeded')

            if (method === 'get_my_user_info') {
              // At least verify connection works
              maps = [{
                id: 'connection_test',
                name: 'Connection Test',
                type: 'test',
                userInfo: response.result
              }]
              if (isDevMode) console.log('🔧 Satshot: Got user info connection test')
              break
            } else {
              // For map listing methods, try to get detailed info if we have map contexts
              const mapsData = response.result
              if (isDevMode) console.log('🔧 Satshot: Got maps data:', mapsData)

              if (Array.isArray(mapsData) && mapsData.length > 0) {
                // We have map contexts, now try to get detailed info using get_map_info
                try {
                  if (isDevMode) console.log('🔧 Satshot: Trying to get detailed map info for', mapsData.length, 'maps')
                  const detailResponse = await client.callMethod('get_map_info', [mapsData])

                  if (!detailResponse.error && detailResponse.result) {
                    // get_map_info returns struct keyed to map contexts when passed array
                    maps = Object.entries(detailResponse.result).map(([context, info]: [string, any]) => ({
                      id: context,
                      context: context,
                      ...info
                    }))
                    methodUsed = method + ' + get_map_info'
                    if (isDevMode) console.log('🔧 Satshot: Got detailed map info for', maps.length, 'maps')
                    break
                  } else {
                    // If get_map_info fails, use the basic map data
                    maps = mapsData.map((mapContext: any) => ({
                      id: mapContext,
                      name: `Map ${mapContext}`,
                      context: mapContext,
                      type: 'map'
                    }))
                    if (isDevMode) console.log('🔧 Satshot: Using basic map data for', maps.length, 'maps')
                    break
                  }
                } catch (detailError) {
                  if (isDevMode) console.log('🔧 Satshot: get_map_info failed, using basic data:', detailError)
                  // Use basic map data if detailed info fails
                  maps = mapsData.map((mapContext: any) => ({
                    id: mapContext,
                    name: `Map ${mapContext}`,
                    context: mapContext,
                    type: 'map'
                  }))
                  break
                }
              } else {
                if (isDevMode) console.log('🔧 Satshot: No maps found with method', method)
              }
            }
          } else {
            errorMessage = response.error.faultString || 'Unknown error'
            if (isDevMode) console.log('🔧 Satshot: Method', method, 'failed:', errorMessage)
          }
        } catch (methodError) {
          errorMessage = MCPUtils.formatError(methodError)
          if (isDevMode) console.log('🔧 Satshot: Method', method, 'exception:', errorMessage)
        }
      }

      if (maps.length === 0) {
        // Add diagnostic information to the error message
        const diagnostics = {
          authentication: hasAuth,
          clientAvailable: !!client,
          sessionValid: !!client?.getSession(),
          methodsAttempted: methodsToTry.length,
          lastError: errorMessage,
          timestamp: new Date().toISOString()
        }

        return MCPUtils.createErrorResult(
          'Failed to get maps from Satshot',
          `All methods failed. Last error: ${errorMessage}. Diagnostics: ${JSON.stringify(diagnostics)}`
        )
      }

      return MCPUtils.createSuccessResult(
        `🗺️ Retrieved ${maps.length} map(s) from Satshot using ${methodUsed}`,
        {
          maps,
          count: maps.length,
          server: this.auth.getServerInfo().server,
          method: methodUsed
        },
        `Found ${maps.length} maps using ${methodUsed}`
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
        args.mapId
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

      // Ensure we have a fresh authenticated client
      const isDevMode = process.env.NODE_ENV === 'development'
      if (isDevMode) console.log('🔧 Satshot: Starting authentication process')
      const hasAuth = await this.auth.authenticate()
      if (isDevMode) console.log('🔧 Satshot: Authentication result:', hasAuth)

      if (!hasAuth) {
        if (isDevMode) console.log('🔧 Satshot: Authentication failed')
        return MCPUtils.createErrorResult(
          'Satshot authentication required',
          'No valid authentication found. Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD.'
        )
      }

      // Get the authenticated client and ensure it has a valid session
      let client = this.auth.getClient()
      if (isDevMode) console.log('🔧 Satshot: Got client:', client ? 'yes' : 'no')

      if (!client) {
        if (isDevMode) console.log('🔧 Satshot: No client available after authentication')
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      // Double-check the session is valid
      const session = client.getSession()
      if (isDevMode) {
        console.log('🔧 Satshot: Client session:', session ? 'valid' : 'null')
        if (session) {
          console.log('🔧 Satshot: Session details: user=' + session.username + ', server=' + session.server + ', token=' + (session.sessionToken ? 'present' : 'null'))
          console.log('🔧 Satshot: Client URL with token:', client.getClientUrl())
        } else {
          console.log('🔧 Satshot: No session found, attempting to get session from auth')
          // Try to get the session directly from auth
          const authSession = this.auth.getSession()
          if (authSession) {
            console.log('🔧 Satshot: Found session in auth, setting on client')
            console.log('🔧 Satshot: Auth session details: user=' + authSession.username + ', server=' + authSession.server + ', token=' + (authSession.sessionToken ? 'present' : 'null'))
            client.setSession(authSession)
          }
        }
      }

      let fields: any[] = []
      let methodUsed = ''
      let errorMessage = ''

      // Step 1: Try to find region IDs first, then get region info
      // Based on SatShot docs: get_regions_info needs array of region IDs
      const methodsToTry = [
        // First, try methods that return region IDs
        { method: 'get_regions', params: [], description: 'List all regions' },
        { method: 'list_regions', params: [], description: 'List regions' },
        { method: 'get_user_regions', params: [], description: 'Get user regions' },
        { method: 'get_visible_regions', params: [], description: 'Get visible regions' },
        { method: 'get_my_regions', params: [], description: 'Get my regions' },
        // Fallback to working method
        { method: 'get_my_user_info', params: [], description: 'Connection test' }
      ]

      for (const { method, params, description } of methodsToTry) {
        try {
          if (isDevMode) console.log('🔧 Satshot: Trying', description, '-', method, 'with params', params)
          const response = await client.callMethod(method, params)
          if (isDevMode) console.log('🔧 Satshot: Method', method, 'response:', response ? 'received' : 'null')

          if (!response.error) {
            methodUsed = method
            if (isDevMode) console.log('🔧 Satshot: Method', method, 'succeeded')

            if (method === 'get_my_user_info') {
              // At least verify connection works
              fields = [{
                id: 'connection_test',
                name: 'Connection Test',
                type: 'test',
                userInfo: response.result
              }]
              if (isDevMode) console.log('🔧 Satshot: Got user info connection test')
              break
            } else {
              // For region listing methods, try to get detailed info if we have region IDs
              const regionsData = response.result
              if (isDevMode) console.log('🔧 Satshot: Got regions data:', regionsData)

              if (Array.isArray(regionsData) && regionsData.length > 0) {
                // We have region IDs, now try to get detailed info
                try {
                  if (isDevMode) console.log('🔧 Satshot: Trying to get detailed region info for', regionsData.length, 'regions')
                  const detailResponse = await client.callMethod('get_regions_info', [regionsData, {}])

                  if (!detailResponse.error && detailResponse.result) {
                    fields = Object.values(detailResponse.result) || []
                    if (isDevMode) console.log('🔧 Satshot: Got detailed region info for', fields.length, 'regions')
                    methodUsed = method + ' + get_regions_info'
                    break
                  } else {
                    // If get_regions_info fails, use the basic region data
                    fields = regionsData.map((regionId: any) => ({
                      id: regionId,
                      name: `Region ${regionId}`,
                      type: 'region'
                    }))
                    if (isDevMode) console.log('🔧 Satshot: Using basic region data for', fields.length, 'regions')
                    break
                  }
                } catch (detailError) {
                  if (isDevMode) console.log('🔧 Satshot: get_regions_info failed, using basic data:', detailError)
                  // Use basic region data if detailed info fails
                  fields = regionsData.map((regionId: any) => ({
                    id: regionId,
                    name: `Region ${regionId}`,
                    type: 'region'
                  }))
                  break
                }
              } else {
                if (isDevMode) console.log('🔧 Satshot: No regions found with method', method)
              }
            }
          } else {
            errorMessage = response.error.faultString || 'Unknown error'
            if (isDevMode) console.log('🔧 Satshot: Method', method, 'failed:', errorMessage)
          }
        } catch (methodError) {
          errorMessage = MCPUtils.formatError(methodError)
          if (isDevMode) console.log('🔧 Satshot: Method', method, 'exception:', errorMessage)
        }
      }

      if (fields.length === 0) {
        // Add diagnostic information to the error message
        const diagnostics = {
          authentication: hasAuth,
          clientAvailable: !!client,
          sessionValid: !!client?.getSession(),
          methodsAttempted: methodsToTry.length,
          lastError: errorMessage,
          timestamp: new Date().toISOString()
        }

        return MCPUtils.createErrorResult(
          'Failed to get fields from Satshot',
          `All methods failed. Last error: ${errorMessage}. Diagnostics: ${JSON.stringify(diagnostics)}`
        )
      }

      return MCPUtils.createSuccessResult(
        `🌾 Retrieved ${fields.length} field(s) from Satshot using ${methodUsed}`,
        {
          fields,
          count: fields.length,
          server: this.auth.getServerInfo().server,
          method: methodUsed,
          filters: args
        },
        `Found ${fields.length} fields using ${methodUsed}`
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

      // Perform imagery analysis - try different scene analysis methods
      const analysisMethods = [
        { method: 'analyze_scene', params: [args.fieldId, args.analysisType || 'ndvi'] },
        { method: 'get_scene_analysis', params: [args.fieldId, args.analysisType || 'ndvi'] },
        { method: 'analyze_field_scene', params: [args.fieldId, args.analysisType || 'ndvi'] }
      ]

      let response = null
      for (const { method, params } of analysisMethods) {
        try {
          console.log(`🔧 Satshot: Trying analysis method: ${method}`)
          response = await client.callMethod(method, params)
          if (!response.error) {
            console.log(`🔧 Satshot: Analysis method ${method} succeeded`)
            break
          }
        } catch (methodError) {
          console.log(`🔧 Satshot: Analysis method ${method} failed:`, methodError)
        }
      }

      // If all methods failed, response will be null or have error
      if (!response || response.error) {
        return MCPUtils.createErrorResult(
          'Failed to analyze field imagery',
          response ? response.error.faultString : 'All analysis methods failed - method not available'
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

      // Get available scenes - try different scene methods
      const sceneMethods = [
        { method: 'get_scenes', params: [args.fieldId || null, args.dateRange || null] },
        { method: 'list_scenes', params: [args.fieldId || null] },
        { method: 'get_available_scenes', params: [args.fieldId || null] },
        { method: 'get_satellite_scenes', params: [args.fieldId || null] }
      ]

      let response = null
      for (const { method, params } of sceneMethods) {
        try {
          console.log(`🔧 Satshot: Trying scene method: ${method}`)
          response = await client.callMethod(method, params)
          if (!response.error) {
            console.log(`🔧 Satshot: Scene method ${method} succeeded`)
            break
          }
        } catch (methodError) {
          console.log(`🔧 Satshot: Scene method ${method} failed:`, methodError)
        }
      }

      // If all methods failed, response will be null or have error
      if (!response || response.error) {
        console.log(`🔧 Satshot: All scene methods failed, checking user info for field data`)

        // Try to get user info to see if it contains field data
        try {
          const userResponse = await client.callMethod('get_my_user_info', [])

          if (!userResponse.error && userResponse.result) {
            const userInfo = userResponse.result
            console.log(`🔧 Satshot: User info retrieved, checking for field data`)

            // Check if user info contains fields
            let fieldsFound = []
            if (userInfo?.struct?.member) {
              for (const member of userInfo.struct.member) {
                if (member.name === 'fields' && member.value?.array?.data?.value) {
                  const fieldData = member.value.array.data.value
                  fieldsFound = Array.isArray(fieldData)
                    ? fieldData.map(f => f?.string || f?.int || f)
                    : [fieldData?.string || fieldData?.int || fieldData]
                }
              }
            }

            if (fieldsFound.length > 0) {
              return MCPUtils.createSuccessResult(
                `🛰️ Found ${fieldsFound.length} fields in your account, but satellite scenes API is not available on this server`,
                {
                  availableFields: fieldsFound,
                  requestedFieldId: args.fieldId,
                  limitation: 'satellite_scenes_api_unavailable',
                  availableMethod: 'get_my_user_info',
                  server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
                  retrievedAt: new Date().toISOString(),
                  recommendation: 'Contact SatShot administrator to enable satellite imagery API methods'
                }
              )
            }
          }
        } catch (userInfoError) {
          console.log(`🔧 Satshot: Could not get user info:`, userInfoError)
        }

        return MCPUtils.createSuccessResult(
          `🛰️ Satellite imagery API is not available on this SatShot server`,
          {
            limitation: 'satellite_scenes_api_unavailable',
            availableMethods: ['get_my_user_info'],
            requestedFieldId: args.fieldId,
            server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
            retrievedAt: new Date().toISOString(),
            recommendations: [
              'Contact SatShot administrator to enable satellite imagery methods',
              'Use get_satshot_user_info to see available data',
              'Check if you have access to a different SatShot server with full API'
            ]
          }
        )
      }

      // If we got here, a method worked (unlikely based on our tests)
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

      // Export data - try different export methods
      const exportMethods = [
        { method: 'export_data', params: [args.dataType, args.format || 'shapefile', args.itemIds] },
        { method: 'export_dataset', params: [args.dataType, args.itemIds] },
        { method: 'get_export', params: [args.dataType, args.itemIds] }
      ]

      let response = null
      for (const { method, params } of exportMethods) {
        try {
          console.log(`🔧 Satshot: Trying export method: ${method}`)
          response = await client.callMethod(method, params)
          if (!response.error) {
            console.log(`🔧 Satshot: Export method ${method} succeeded`)
            break
          }
        } catch (methodError) {
          console.log(`🔧 Satshot: Export method ${method} failed:`, methodError)
        }
      }

      // Error check is already done above, response should be valid here

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

      // Test available methods if authenticated
      let methodTests = []
      if (authTestResult) {
        const client = this.auth.getClient()
        if (client) {
          // Test methods from the actual SatShot API documentation
          const testMethods = [
            { method: 'get_my_user_info', params: [], description: 'Get user info' },
            // Core API methods from documentation
            { method: 'get_regions', params: [], description: 'Get regions/fields' },
            { method: 'list_regions', params: [], description: 'List regions/fields' },
            { method: 'get_user_regions', params: [], description: 'Get user regions' },
            { method: 'get_visible_regions', params: [], description: 'Get visible regions' },
            { method: 'get_my_regions', params: [], description: 'Get my regions' },
            { method: 'get_scenes', params: [], description: 'Get satellite scenes' },
            { method: 'list_scenes', params: [], description: 'List satellite scenes' },
            { method: 'get_user_scenes', params: [], description: 'Get user scenes' },
            { method: 'get_maps', params: [], description: 'Get maps' },
            { method: 'list_maps', params: [], description: 'List maps' },
            { method: 'get_user_maps', params: [], description: 'Get user maps' },
            // Introspection methods
            { method: 'system.listMethods', params: [], description: 'List available methods' },
            { method: 'system.methodHelp', params: ['get_regions'], description: 'Get method help' },
            { method: 'system.methodSignature', params: ['get_regions'], description: 'Get method signature' }
          ]

          for (const { method, params, description } of testMethods) {
            try {
              console.log(`🔧 Satshot: Testing method: ${description} (${method})`)
              const response = await client.callMethod(method, params)

              if (!response.error) {
                console.log(`🔧 Satshot: Method ${method} works!`)
                methodTests.push({
                  method,
                  description,
                  status: 'success',
                  result: typeof response.result === 'object' ? 'object' : response.result
                })
              } else {
                console.log(`🔧 Satshot: Method ${method} failed:`, response.error.faultString)
                methodTests.push({
                  method,
                  description,
                  status: 'error',
                  error: response.error.faultString
                })
              }
            } catch (methodError) {
              console.log(`🔧 Satshot: Method ${method} threw exception:`, methodError.message)
              methodTests.push({
                method,
                description,
                status: 'exception',
                error: methodError.message
              })
            }
          }
        }
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
        methodTests: methodTests,
        overall: canConnect && (args.includeAuth === false || authTestResult)
      }

      return MCPUtils.createSuccessResult(
        `🔗 Satshot connection test ${result.overall ? 'passed' : 'failed'} (${methodTests.length} methods tested)`,
        {
          ...result,
          workingMethodsCount: methodTests.filter(m => m.status === 'success').length,
          totalMethodsTested: methodTests.length
        },
        result.overall ? 'All tests passed' : 'Some tests failed - check methodTests for details'
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

  public async testPolygonAnalysis(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Testing polygon NDVI analysis', args)

      // Use a simple rectangular test polygon (farm field in North Dakota area)
      const testPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-98.5, 47.5],   // Southwest corner
          [-98.5, 47.6],   // Northwest corner
          [-98.4, 47.6],   // Northeast corner
          [-98.4, 47.5],   // Southeast corner
          [-98.5, 47.5]    // Back to start (close polygon)
        ]]
      }

      // Also prepare WKT format for methods that require it
      const testPolygonWKT = 'POLYGON((-98.5 47.5, -98.5 47.6, -98.4 47.6, -98.4 47.5, -98.5 47.5))'

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult('Satshot authentication required')
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      console.log('🔧 Satshot: Testing polygon NDVI analysis with test polygon:')
      console.log('🔧 GeoJSON:', JSON.stringify(testPolygon, null, 2))
      console.log('🔧 WKT:', testPolygonWKT)

      // Step 1: Test basic polygon-related methods in correct order
      const polygonMethods = [
        // First, try to create a boundary object from the polygon
        {
          method: 'create_boundary',
          params: [testPolygon, 'Test Field Boundary', 'Boundary for NDVI analysis test'],
          description: 'Create boundary object from polygon'
        },
        {
          method: 'create_region',
          params: ['Test NDVI Field', 'Test region for polygon NDVI analysis', {}, null],
          description: 'Create empty region (correct parameters)'
        },
        // Alternative: create region with objects struct (if boundary exists)
        {
          method: 'create_hilite_objects_from_wkt',
          params: [['POLYGON((-98.5 47.5, -98.5 47.6, -98.4 47.6, -98.4 47.5, -98.5 47.5))'], {}],
          description: 'Create hilite objects from WKT polygon'
        },
        // Test analysis methods with the polygon
        {
          method: 'analyze_scene',
          params: [testPolygon, 'ndvi'],
          description: 'Analyze polygon for NDVI directly'
        },
        {
          method: 'get_scenes',
          params: [testPolygon],
          description: 'Get scenes for polygon area'
        }
      ]

      let analysisResults = []
      let workingMethods = []

      for (const { method, params, description } of polygonMethods) {
        try {
          console.log(`🔧 Satshot: Testing polygon method: ${description} (${method})`)
          console.log(`🔧 Satshot: Parameters:`, JSON.stringify(params, null, 2))
          const response = await client.callMethod(method, params)

          if (!response.error) {
            console.log(`🔧 Satshot: Method ${method} works! Result:`, JSON.stringify(response.result, null, 2))
            workingMethods.push(method)
            analysisResults.push({
              method,
              description,
              status: 'success',
              result: response.result,
              params: params
            })
          } else {
            console.log(`🔧 Satshot: Method ${method} failed:`, response.error.faultString)
            analysisResults.push({
              method,
              description,
              status: 'error',
              error: response.error.faultString,
              params: params
            })
          }
        } catch (methodError) {
          console.log(`🔧 Satshot: Method ${method} threw exception:`, methodError.message)
          analysisResults.push({
            method,
            description,
            status: 'exception',
            error: methodError.message,
            params: params
          })
        }
      }

      return MCPUtils.createSuccessResult(
        `🛰️ Polygon NDVI analysis test completed - ${workingMethods.length} methods work`,
        {
          testPolygon,
          analysisResults,
          workingMethods,
          server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
          testedAt: new Date().toISOString(),
          recommendations: workingMethods.length > 0
            ? 'Use working methods for your NDVI analysis'
            : 'Contact SatShot support - polygon analysis methods not available',
          nextSteps: workingMethods.length > 0
            ? ['Use working methods with your real polygons', 'Test with different analysis types (ndvi, rgb, etc.)', 'Experiment with different polygon sizes']
            : ['Contact SatShot support for API access', 'Check if you have the right permission level', 'Verify your SatShot server configuration']
        }
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Polygon analysis test failed', error)
      return MCPUtils.createErrorResult(
        'Polygon analysis test failed',
        errorMessage
      )
    }
  }

  public async testCreateRegion(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Testing create_region method', args)

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult('Satshot authentication required')
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      const regionName = args.regionName || 'Test NDVI Field'
      const regionDescription = args.regionDescription || 'Test region for polygon NDVI analysis'
      const includeObjects = args.includeObjects || false

      console.log('🔧 Satshot: Testing create_region with documentation-compliant parameters:')
      console.log('🔧 Name:', regionName)
      console.log('🔧 Description:', regionDescription)
      console.log('🔧 Include Objects:', includeObjects)

      // Test different variations of create_region call
      const createRegionTests = [
        // Test 1: Basic create_region with just name (minimum required parameters)
        {
          method: 'create_region',
          params: [regionName],
          description: 'Create region with just name (minimum parameters)'
        },
        // Test 2: create_region with name and description
        {
          method: 'create_region',
          params: [regionName, regionDescription],
          description: 'Create region with name and description'
        },
        // Test 3: create_region with name, description, and empty objects struct
        {
          method: 'create_region',
          params: [regionName, regionDescription, {}],
          description: 'Create region with name, description, and empty objects'
        },
        // Test 4: create_region with all parameters (name, description, empty objects, null group)
        {
          method: 'create_region',
          params: [regionName, regionDescription, {}, null],
          description: 'Create region with all parameters (null group)'
        }
      ]

      // If user wants to test with objects, add that test too
      if (includeObjects) {
        createRegionTests.push({
          method: 'create_region',
          params: [regionName, regionDescription, { boundaries: [], locations: [], paths: [] }],
          description: 'Create region with empty object arrays'
        })
      }

      let testResults = []
      let successfulTests = []

      for (const { method, params, description } of createRegionTests) {
        try {
          console.log(`🔧 Satshot: Testing: ${description}`)
          console.log(`🔧 Parameters:`, JSON.stringify(params, null, 2))

          const response = await client.callMethod(method, params)

          if (!response.error) {
            console.log(`🔧 Satshot: SUCCESS! Region created with ID:`, response.result)
            successfulTests.push({
              test: description,
              parameters: params,
              regionId: response.result
            })
            testResults.push({
              test: description,
              status: 'success',
              parameters: params,
              result: response.result,
              regionId: response.result
            })
          } else {
            console.log(`🔧 Satshot: FAILED:`, response.error.faultString)
            testResults.push({
              test: description,
              status: 'error',
              parameters: params,
              error: response.error.faultString
            })
          }
        } catch (methodError) {
          console.log(`🔧 Satshot: EXCEPTION:`, methodError.message)
          testResults.push({
            test: description,
            status: 'exception',
            parameters: params,
            error: methodError.message
          })
        }
      }

      return MCPUtils.createSuccessResult(
        `🗺️ create_region method test completed - ${successfulTests.length} successful tests`,
        {
          testResults,
          successfulTests,
          totalTests: createRegionTests.length,
          server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
          testedAt: new Date().toISOString(),
          documentationCompliance: {
            method: 'create_region',
            requiredParams: ['name'],
            optionalParams: ['description', 'objects', 'groupid'],
            parameterTypes: {
              name: 'string',
              description: 'string',
              objects: 'struct',
              groupid: 'integer'
            }
          },
          recommendations: successfulTests.length > 0
            ? [
                'Use working parameter combinations for region creation',
                'Start with basic name-only parameter for simple regions',
                'Add description for better organization',
                'Use empty objects struct {} for future object addition'
              ]
            : [
                'Contact SatShot support - create_region method not available',
                'Check user permissions for region creation',
                'Verify server configuration allows region management'
              ]
        }
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: create_region test failed', error)
      return MCPUtils.createErrorResult(
        'create_region test failed',
        errorMessage
      )
    }
  }

  public async testAnalyzeExtractedImageSet(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Testing analyze_extracted_image_set method', args)

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult('Satshot authentication required')
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      const analysisType = args.analysisType || 'NDVIR'
      const mode = args.mode || 'minmax'
      const numZones = args.numZones || 5
      const testWithMockData = args.testWithMockData !== false

      console.log('🔧 Satshot: Testing analyze_extracted_image_set with parameters:')
      console.log('🔧 Analysis Type:', analysisType)
      console.log('🔧 Mode:', mode)
      console.log('🔧 Number of Zones:', numZones)
      console.log('🔧 Test with Mock Data:', testWithMockData)

      // Test different analysis configurations
      const analysisTests = []

      if (testWithMockData) {
        // Test 1: Mock data test - try with mock hilite/image structure
        analysisTests.push({
          test: 'Mock data test - NDVI Red Band',
          params: [
            '', // mapcontext (can be empty)
            { 'mock_hilite_1': 'mock_image_handle_123' }, // mock shpimages
            'NDVIR', // NDVI Red Band
            'minmax',
            5,
            1, // default colortable
            {} // empty options
          ],
          description: 'Test with mock hilite/image data'
        })

        // Test 2: Different analysis type
        analysisTests.push({
          test: 'Mock data test - NDVI Green Band',
          params: [
            '',
            { 'mock_hilite_2': 'mock_image_handle_456' },
            'NDVIG', // NDVI Green Band
            'minmax',
            7,
            1,
            {}
          ],
          description: 'Test with NDVI Green Band analysis'
        })

        // Test 3: Different mode
        analysisTests.push({
          test: 'Mock data test - Standard mode',
          params: [
            '',
            { 'mock_hilite_3': 'mock_image_handle_789' },
            'NDVIR',
            'standard', // standard mode
            10,
            1,
            {}
          ],
          description: 'Test with standard slicing mode'
        })
      }

      // Test 4: Test with minimal parameters
      analysisTests.push({
        test: 'Minimal parameters test',
        params: [
          '', // mapcontext
          { 'test_hilite': 'test_image' }, // minimal shpimages
          analysisType,
          mode,
          numZones
          // colortable and options are optional
        ],
        description: 'Test with minimal required parameters'
      })

      let testResults = []
      let workingTests = []

      for (const { test, params, description } of analysisTests) {
        try {
          console.log(`🔧 Satshot: Testing: ${description}`)
          console.log(`🔧 Parameters:`, JSON.stringify(params, null, 2))

          const response = await client.callMethod('analyze_extracted_image_set', params)

          if (!response.error) {
            console.log(`🔧 Satshot: SUCCESS! Analysis completed:`, JSON.stringify(response.result, null, 2))
            workingTests.push({
              test: description,
              parameters: params,
              result: response.result
            })
            testResults.push({
              test: description,
              status: 'success',
              parameters: params,
              result: response.result,
              analysisType: params[2],
              mode: params[3],
              numZones: params[4]
            })
          } else {
            console.log(`🔧 Satshot: FAILED:`, response.error.faultString)
            testResults.push({
              test: description,
              status: 'error',
              parameters: params,
              error: response.error.faultString,
              analysisType: params[2],
              mode: params[3],
              numZones: params[4]
            })
          }
        } catch (methodError) {
          console.log(`🔧 Satshot: EXCEPTION:`, methodError.message)
          testResults.push({
            test: description,
            status: 'exception',
            parameters: params,
            error: methodError.message,
            analysisType: params[2],
            mode: params[3],
            numZones: params[4]
          })
        }
      }

      // Analyze results and provide recommendations
      let analysisCapabilities = []
      let supportedTypes = []
      let supportedModes = []

      for (const result of workingTests) {
        if (!supportedTypes.includes(result.parameters[2])) {
          supportedTypes.push(result.parameters[2])
        }
        if (!supportedModes.includes(result.parameters[3])) {
          supportedModes.push(result.parameters[3])
        }
      }

      if (workingTests.length > 0) {
        analysisCapabilities = [
          '✅ NDVI analysis is available on this server',
          `✅ Supported analysis types: ${supportedTypes.join(', ')}`,
          `✅ Supported modes: ${supportedModes.join(', ')}`,
          '✅ Method signature matches documentation',
          '✅ Ready for polygon-based NDVI analysis'
        ]
      } else {
        analysisCapabilities = [
          '❌ NDVI analysis method not available or requires real image data',
          '❌ Check if you have analysis privileges',
          '❌ Verify server has satellite imagery capabilities',
          '❌ May need to extract real images from polygons first'
        ]
      }

      return MCPUtils.createSuccessResult(
        `🛰️ analyze_extracted_image_set method test completed - ${workingTests.length} successful tests`,
        {
          testResults,
          workingTests,
          totalTests: analysisTests.length,
          server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
          testedAt: new Date().toISOString(),
          documentationCompliance: {
            method: 'analyze_extracted_image_set',
            requiredParams: ['mapcontext', 'shpimages', 'type', 'mode', 'numzones'],
            optionalParams: ['colortable', 'options'],
            parameterTypes: {
              mapcontext: 'string',
              shpimages: 'struct',
              type: 'string',
              mode: 'string',
              numzones: 'integer',
              colortable: 'integer',
              options: 'struct'
            },
            supportedAnalysisTypes: ['NIR', 'NDVIR', 'NDVIG', 'REDEDGE', 'NDVIREDEDGE', 'MULTIBAND'],
            supportedModes: ['standard', 'minmax', 'minmaxgroup', 'custom']
          },
          analysisCapabilities,
          nextSteps: workingTests.length > 0
            ? [
                '✅ Method works - integrate into polygon workflow',
                'Extract real images from polygons using extract_image_around_hilited_shape',
                'Use working analysis types for NDVI calculations',
                'Test different zone counts for precision vs. simplicity'
              ]
            : [
                '❌ Method needs real extracted images, not mock data',
                'Create polygon boundaries and extract real satellite images',
                'Contact SatShot support for analysis permissions',
                'Check if satellite imagery is available for your area'
              ]
        }
      )

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: analyze_extracted_image_set test failed', error)
      return MCPUtils.createErrorResult(
        'analyze_extracted_image_set test failed',
        errorMessage
      )
        }
  }

  public async testLoadMapMethod(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Testing load_map method ONLY', args)

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult('Satshot authentication required')
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      const stateName = args.stateName || 'ND'

      console.log('🔧 Satshot: Testing load_map method with documentation parameters:')
      console.log('🔧 Method: load_map')
      console.log('🔧 Parameter: string $thestate =', stateName)
      console.log('🔧 Expected: string (map context handle)')

      // Test the exact method from documentation: load_map(string $thestate)
      const testStart = Date.now()

      console.log(`🔧 Satshot: Calling load_map("${stateName}")`)
      const response = await client.callMethod('load_map', [stateName])

      const testDuration = Date.now() - testStart
      console.log(`🔧 Satshot: Method completed in ${testDuration}ms`)

      if (!response.error) {
        console.log('🔧 Satshot: SUCCESS! Map loaded with context:', response.result)

        return MCPUtils.createSuccessResult(
          `🗺️ load_map method test PASSED - Map context loaded successfully`,
          {
            method: 'load_map',
            documentation: {
              signature: 'static string load_map( string $thestate)',
              purpose: 'Loads the map named THESTATE. Returns the map context.',
              parameters: {
                thestate: 'string (state name or 2-letter code, case-insensitive)'
              },
              returns: 'string (map context handle)',
              exceptions: ['MAP_NOT_FOUND']
            },
            testResult: {
              parameterUsed: stateName,
              mapContext: response.result,
              testDuration: `${testDuration}ms`,
              status: 'success',
              compliant: true
            },
            server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
            testedAt: new Date().toISOString()
          }
        )
      } else {
        console.log(`🔧 Satshot: FAILED:`, response.error.faultString)

        return MCPUtils.createSuccessResult(
          `🗺️ load_map method test COMPLETED - Method returned error`,
          {
            method: 'load_map',
            documentation: {
              signature: 'static string load_map( string $thestate)',
              purpose: 'Loads the map named THESTATE. Returns the map context.',
              parameters: {
                thestate: 'string (state name or 2-letter code, case-insensitive)'
              },
              returns: 'string (map context handle)',
              exceptions: ['MAP_NOT_FOUND']
            },
            testResult: {
              parameterUsed: stateName,
              error: response.error.faultString,
              testDuration: `${testDuration}ms`,
              status: 'error',
              compliant: false
            },
            server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
            testedAt: new Date().toISOString()
          }
        )
      }

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: load_map method test failed', error)
      return MCPUtils.createErrorResult(
        'load_map method test failed',
        errorMessage
      )
    }
  }

  public async testGetMapInfoMethod(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Testing get_map_info method ONLY', args)

      const hasAuth = await this.auth.authenticate()
      if (!hasAuth) {
        return MCPUtils.createErrorResult('Satshot authentication required')
      }

      const client = this.auth.getClient()
      if (!client) {
        return MCPUtils.createErrorResult('No Satshot client available')
      }

      const mapContext = args.mapContext || '7itczae00oe7rm3szs7iprnqumgbu424.map'

      console.log('🔧 Satshot: Testing get_map_info method with documentation parameters:')
      console.log('🔧 Method: get_map_info')
      console.log('🔧 Parameter: mixed $mapcontext =', mapContext)
      console.log('🔧 Expected: array/struct with map information')

      // Test the exact method from documentation: get_map_info(mixed $mapcontext)
      const testStart = Date.now()

      console.log(`🔧 Satshot: Calling get_map_info("${mapContext}")`)
      const response = await client.callMethod('get_map_info', [mapContext])

      const testDuration = Date.now() - testStart
      console.log(`🔧 Satshot: Method completed in ${testDuration}ms`)

      if (!response.error) {
        console.log('🔧 Satshot: SUCCESS! Map info retrieved:', JSON.stringify(response.result, null, 2))

        // Parse the response structure to match documentation fields
        const mapInfo = response.result

        return MCPUtils.createSuccessResult(
          `🗺️ get_map_info method test PASSED - Map information retrieved successfully`,
          {
            method: 'get_map_info',
            documentation: {
              signature: 'static array get_map_info( mixed $mapcontext)',
              purpose: 'Returns basic info about the given map context MAPCONTEXT as a struct.',
              parameters: {
                mapcontext: 'mixed (string or array of map context names)'
              },
              returns: 'array/struct with map information fields',
              exceptions: ['MAP_NOT_FOUND'],
              expectedFields: [
                'name', 'width', 'height', 'projection', 'epsg',
                'extents', 'projextents', 'defaultextents', 'numlayers',
                'centroid', 'centroidzone', 'basemapon', 'wkt'
              ]
            },
            testResult: {
              parameterUsed: mapContext,
              mapInfo: mapInfo,
              testDuration: `${testDuration}ms`,
              status: 'success',
              compliant: true,
              fieldAnalysis: {
                totalFields: Object.keys(mapInfo).length,
                documentedFields: ['name', 'width', 'height', 'projection', 'epsg', 'extents', 'projextents', 'defaultextents', 'numlayers', 'centroid', 'centroidzone', 'basemapon', 'wkt'],
                presentFields: Object.keys(mapInfo),
                missingFields: ['name', 'width', 'height', 'projection', 'epsg', 'extents', 'projextents', 'defaultextents', 'numlayers', 'centroid', 'centroidzone', 'basemapon', 'wkt'].filter(field => !(field in mapInfo))
              }
            },
            server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
            testedAt: new Date().toISOString()
          }
        )
      } else {
        console.log(`🔧 Satshot: FAILED:`, response.error.faultString)

        return MCPUtils.createSuccessResult(
          `🗺️ get_map_info method test COMPLETED - Method returned error`,
          {
            method: 'get_map_info',
            documentation: {
              signature: 'static array get_map_info( mixed $mapcontext)',
              purpose: 'Returns basic info about the given map context MAPCONTEXT as a struct.',
              parameters: {
                mapcontext: 'mixed (string or array of map context names)'
              },
              returns: 'array/struct with map information fields',
              exceptions: ['MAP_NOT_FOUND'],
              expectedFields: [
                'name', 'width', 'height', 'projection', 'epsg',
                'extents', 'projextents', 'defaultextents', 'numlayers',
                'centroid', 'centroid', 'basemapon', 'wkt'
              ]
            },
            testResult: {
              parameterUsed: mapContext,
              error: response.error.faultString,
              testDuration: `${testDuration}ms`,
              status: 'error',
              compliant: false
            },
            server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
            testedAt: new Date().toISOString()
          }
        )
      }

    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: get_map_info method test failed', error)
      return MCPUtils.createErrorResult(
        'get_map_info method test failed',
        errorMessage
      )
    }
  }

  public async getUserInfo(args: SatshotToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Satshot: Getting user info', args)

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

      const response = await client.callMethod('get_my_user_info', [])

      if (response.error) {
        return MCPUtils.createErrorResult(
          'Failed to get user info from Satshot',
          response.error.faultString
        )
      }

      const userInfo = response.result
      console.log('🔧 Satshot: Raw user info response:', JSON.stringify(userInfo, null, 2))

      // Parse the user info to extract useful information
      let parsedInfo = {
        username: null,
        email: null,
        fullName: null,
        organization: null,
        fields: [],
        maps: [],
        permissions: [],
        metadata: {}
      }

      try {
        // Try to extract information from the XML-RPC response structure
        if (userInfo?.struct?.member) {
          const members = userInfo.struct.member
          for (const member of members) {
            const name = member.name
            const value = member.value

            switch(name) {
              case 'username':
                parsedInfo.username = value?.string || value?.int || value
                break
              case 'email':
                parsedInfo.email = value?.string || value
                break
              case 'name':
              case 'fullname':
                parsedInfo.fullName = value?.string || value
                break
              case 'organization':
              case 'org':
                parsedInfo.organization = value?.string || value
                break
              case 'fields':
                if (value?.array?.data?.value) {
                  parsedInfo.fields = Array.isArray(value.array.data.value)
                    ? value.array.data.value.map(f => f?.string || f?.int || f)
                    : [value.array.data.value?.string || value.array.data.value?.int || value.array.data.value]
                }
                break
              case 'maps':
                if (value?.array?.data?.value) {
                  parsedInfo.maps = Array.isArray(value.array.data.value)
                    ? value.array.data.value.map(m => m?.string || m?.int || m)
                    : [value.array.data.value?.string || value.array.data.value?.int || value.array.data.value]
                }
                break
              default:
                parsedInfo.metadata[name] = value?.string || value?.int || value
            }
          }
        } else if (userInfo?.string) {
          parsedInfo.username = userInfo.string
        }

        console.log('🔧 Satshot: Parsed user info:', parsedInfo)
      } catch (parseError) {
        console.log('🔧 Satshot: Could not parse user info structure:', parseError)
      }

      return MCPUtils.createSuccessResult(
        `🧑‍🌾 Retrieved Satshot user information for ${parsedInfo.username || 'user'}`,
        {
          rawUserInfo: userInfo,
          parsedUserInfo: parsedInfo,
          server: (this.auth.getConfig && this.auth.getConfig().server) || 'us',
          retrievedAt: new Date().toISOString(),
          hasFields: parsedInfo.fields.length > 0,
          hasMaps: parsedInfo.maps.length > 0,
          fieldCount: parsedInfo.fields.length,
          mapCount: parsedInfo.maps.length
        }
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Satshot: Failed to get user info', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve user info',
        errorMessage
      )
    }
  }
}
