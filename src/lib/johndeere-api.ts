import axios, { AxiosInstance } from 'axios'
import { prisma } from './prisma'
import FormData from 'form-data'
// Use global FormData and Blob (available in Node.js 18+)

// John Deere API Configuration
const JOHN_DEERE_CONFIG = {
  sandbox: {
    baseURL: 'https://sandboxapi.deere.com/platform',
    equipmentBaseURL: 'https://equipmentapi.deere.com',
    authURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
    tokenURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  },
  production: {
    baseURL: 'https://partnerapi.deere.com/platform',
    equipmentBaseURL: 'https://equipmentapi.deere.com',
    authURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
    tokenURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  },
}

// Error types for better error handling
export class JohnDeereConnectionError extends Error {
  constructor(
    message: string,
    public connectionUrl?: string,
    public organizationId?: string
  ) {
    super(message)
    this.name = 'JohnDeereConnectionError'
  }
}

export class JohnDeereRCAError extends Error {
  constructor(
    message: string,
    public rcaUrl: string,
    public organizationId?: string
  ) {
    super(message)
    this.name = 'JohnDeereRCAError'
  }
}

export class JohnDeerePermissionError extends Error {
  constructor(
    message: string,
    public requiredScopes?: string[],
    public currentScopes?: string[]
  ) {
    super(message)
    this.name = 'JohnDeerePermissionError'
  }
}

// Type definitions for John Deere API responses
export interface JDOrganization {
  '@type': string
  id: string
  name: string
  type: string
  member: boolean
  links: Array<{ rel: string; uri: string }>
}

export interface JDField {
  '@type': string
  id: string
  name: string
  archived: boolean
  area: {
    measurement: number
    unit: string
  }
  boundary?: {
    type: string
    coordinates: number[][][]
  }
  links: Array<{ rel: string; uri: string }>
}

export interface JDEquipment {
  '@type': string
  id: string
  name: string
  category?: string
  make: string | { name: string; id: string }
  model: string | { name: string; id: string }
  serialNumber?: string
  year?: number
  type?: { name: string; id: string }
  links?: Array<{ rel: string; uri: string }>
}

export interface JDFieldOperation {
  '@type': string
  id: string
  type: string
  operationType: string
  startTime: string
  endTime: string
  area: {
    measurement: number
    unit: string
  }
  totalDistance: {
    measurement: number
    unit: string
  }
  links: Array<{ rel: string; uri: string }>
}

export interface JDMachineLocation {
  '@type': string
  id: string
  timestamp: string
  geometry: {
    type: string
    coordinates: [number, number]
  }
  links: Array<{ rel: string; uri: string }>
}

export interface JDAsset {
  '@type': string
  id: string
  title: string
  assetCategory: string
  assetType: string
  assetSubType: string
  lastModifiedDate: string
  links: Array<{ rel: string; uri: string }>
}

export interface JDBoundaryPoint {
  '@type': 'Point'
  lat: number
  lon: number
}

export interface JDBoundaryRing {
  '@type': 'Ring'
  points: JDBoundaryPoint[]
}

export interface JDBoundaryPolygon {
  '@type': 'Polygon'
  rings: JDBoundaryRing[]
}

export interface JDBoundary {
  '@type': 'Boundary'
  multipolygons: JDBoundaryPolygon[]
}

export class JohnDeereAPIClient {
  private axiosInstance: AxiosInstance
  private equipmentAxiosInstance: AxiosInstance
  private environment: 'sandbox' | 'production'

  constructor(environment: 'sandbox' | 'production' = 'sandbox') {
    this.environment = environment
    const config = JOHN_DEERE_CONFIG[environment]
    
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Accept': 'application/vnd.deere.axiom.v3+json',
        'Content-Type': 'application/vnd.deere.axiom.v3+json',
      },
    })

    // Create separate axios instance for Equipment API
    this.equipmentAxiosInstance = axios.create({
      baseURL: config.equipmentBaseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor to include auth token for main API
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await this.getValidAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Add request interceptor to include auth token for equipment API
    this.equipmentAxiosInstance.interceptors.request.use(async (config) => {
      const token = await this.getValidAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Add response interceptor for error handling (main API)
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            // Token expired, try to refresh
            await this.refreshAccessToken()
            // Retry the original request
            const token = await this.getValidAccessToken()
            if (token) {
              error.config.headers.Authorization = `Bearer ${token}`
              return this.axiosInstance.request(error.config)
            }
          } catch (refreshError) {
            // If refresh fails (e.g., no refresh token), throw the original 401 error
            console.log('Token refresh failed:', refreshError instanceof Error ? refreshError.message : 'Unknown error')
            throw error
          }
        }
        
        // Handle 403 errors with proper connection management
        if (error.response?.status === 403) {
          this.handle403Error(error)
        }
        
        throw error
      }
    )

    // Add response interceptor for error handling (equipment API)
    this.equipmentAxiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            // Token expired, try to refresh
            await this.refreshAccessToken()
            // Retry the original request
            const token = await this.getValidAccessToken()
            if (token) {
              error.config.headers.Authorization = `Bearer ${token}`
              return this.equipmentAxiosInstance.request(error.config)
            }
          } catch (refreshError) {
            // If refresh fails (e.g., no refresh token), throw the original 401 error
            console.log('Token refresh failed:', refreshError instanceof Error ? refreshError.message : 'Unknown error')
            throw error
          }
        }
        
        // Handle 403 errors with proper connection management
        if (error.response?.status === 403) {
          this.handle403Error(error)
        }
        
        throw error
      }
    )
  }

  /**
   * Centralized API error handler
   */
  private handleApiError(error: any, context: string): void {
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred';
    const statusCode = error.response?.status;
    console.error(`❌ Error in ${context} [${statusCode}]:`, errorMessage, {
      url: error.config?.url,
      response: error.response?.data
    });

    if (error instanceof JohnDeereConnectionError || 
        error instanceof JohnDeereRCAError || 
        error instanceof JohnDeerePermissionError) {
      throw error;
    }
    
    if (statusCode === 403) {
      this.handle403Error(error); // Re-use the existing 403 handler
    }
  }

  /**
   * Handle 403 Forbidden errors with proper connection management
   */
  private handle403Error(error: any): void {
    const response = error.response
    const headers = response.headers || {}
    const data = response.data || {}

    console.error('🚫 403 Forbidden Error Details:', {
      status: response.status,
      headers: headers,
      data: data,
      url: error.config?.url
    })

    // Check for RCA (Required Customer Action) events
    const rcaWarning = headers['x-deere-warning'] || headers['X-Deere-Warning']
    const rcaLocation = headers['x-deere-terms-location'] || headers['X-Deere-Terms-Location']
    
    if (rcaWarning && rcaLocation) {
      console.error('🔒 RCA Event detected:', rcaWarning)
      throw new JohnDeereRCAError(
        `Required Customer Action: ${rcaWarning}. Please complete the required action.`,
        rcaLocation
      )
    }

    // Check for permission/scope issues
    if (data.message?.includes('proper access') || data.message?.includes('scope')) {
      throw new JohnDeerePermissionError(
        'Insufficient permissions or missing required scopes for this API endpoint.',
        data.required_scopes,
        data.current_scopes
      )
    }

    // Check for connection issues
    if (data.message?.includes('Access Denied') || data.message?.includes('connection')) {
      throw new JohnDeereConnectionError(
        'No connection established between application and organization. Please establish connection first.'
      )
    }

    // Generic 403 error
    throw new JohnDeereConnectionError(
      `Access denied: ${data.message || 'Unknown permission error'}`
    )
  }

  /**
   * Get valid access token from database
   */
  private async getValidAccessToken(): Promise<string | null> {
    try {
      // Get current authenticated user
      const { getCurrentUser } = await import('./auth')
      const authUser = await getCurrentUser()
      
      if (!authUser?.id) {
        console.error('No authenticated user found')
        return null
      }
      
      const tokenRecord = await prisma.johnDeereToken.findUnique({
        where: { userId: authUser.id },
      })

      if (!tokenRecord) {
        return null
      }

      // Check if token is expired
      if (new Date() >= tokenRecord.expiresAt) {
        try {
          // Try to refresh token
          await this.refreshAccessToken()
          // Get the refreshed token
          const refreshedToken = await prisma.johnDeereToken.findUnique({
            where: { userId: authUser.id },
          })
          return refreshedToken?.accessToken || null
        } catch (refreshError) {
          // If refresh fails, return null (token is expired and can't be refreshed)
          console.log('Token refresh failed in getValidAccessToken:', refreshError instanceof Error ? refreshError.message : 'Unknown error')
          return null
        }
      }

      return tokenRecord.accessToken
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      // Get current authenticated user
      const { getCurrentUser } = await import('./auth')
      const authUser = await getCurrentUser()
      
      if (!authUser?.id) {
        throw new Error('No authenticated user found')
      }
      
      const tokenRecord = await prisma.johnDeereToken.findUnique({
        where: { userId: authUser.id },
      })

      if (!tokenRecord?.refreshToken) {
        throw new Error('No refresh token available')
      }

      const config = JOHN_DEERE_CONFIG[this.environment]
      
      // Use form-encoded data for OAuth token endpoint
      const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenRecord.refreshToken,
        client_id: process.env.JOHN_DEERE_CLIENT_ID!,
        client_secret: process.env.JOHN_DEERE_CLIENT_SECRET!,
      })

      const response = await axios.post(config.tokenURL, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      })

      const { access_token, expires_in, refresh_token } = response.data

      // Calculate expiry date
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in)

      // Update token in database
      await prisma.johnDeereToken.update({
        where: { userId: authUser.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || tokenRecord.refreshToken, // Keep existing if not provided
          expiresAt,
          scope: tokenRecord.scope, // Keep existing scope
        },
      })

      console.log('✅ Access token refreshed successfully')
    } catch (error: any) {
      console.error('❌ Error refreshing access token:', error.response?.data || error.message)
      throw new Error('Failed to refresh access token')
    }
  }

  /**
   * Get organizations for the authenticated user
   */
  async getOrganizations(): Promise<JDOrganization[]> {
    try {
      const response = await this.axiosInstance.get('/organizations')
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching organizations:', error)
      throw error
    }
  }

  /**
   * Check organization connection status and get connection links if needed
   */
  async checkOrganizationConnection(organizationId: string): Promise<{
    isConnected: boolean
    connectionUrl?: string
    manageConnectionUrl?: string
    organization?: JDOrganization
  }> {
    try {
      const organizations = await this.getOrganizations()
      const organization = organizations.find(org => org.id === organizationId)
      
      if (!organization) {
        throw new Error(`Organization ${organizationId} not found or user doesn't have access`)
      }

      // Check for connection links
      const connectionLink = organization.links?.find(link => link.rel === 'connections')
      const manageConnectionLink = organization.links?.find(link => link.rel === 'manage_connection')
      
      // If there's a manage_connection link, the organization IS connected
      // If there's a connections link, the organization needs to be connected
      const isConnected = !!manageConnectionLink
      
      console.log(`🔗 Organization ${organizationId} connection status:`, {
        isConnected,
        hasConnectionLink: !!connectionLink,
        hasManageConnectionLink: !!manageConnectionLink,
        organization: organization.name
      })

      return {
        isConnected,
        connectionUrl: connectionLink?.uri,
        manageConnectionUrl: manageConnectionLink?.uri,
        organization
      }
    } catch (error) {
      console.error('Error checking organization connection:', error)
      throw error
    }
  }

  /**
   * Get organizations with connection status information
   */
  async getOrganizationsWithConnectionLinks(): Promise<{
    organizations: JDOrganization[]
    connectionLinks: string[]
  }> {
    try {
      const response = await this.axiosInstance.get('/organizations')
      const organizations = response.data.values || []
      
      // Log the full response for debugging
      console.log('🔍 Full organizations response:', JSON.stringify(response.data, null, 2))
      
      // Extract connection links from organization responses
      const connectionLinks: string[] = []
      organizations.forEach((org: JDOrganization) => {
        console.log(`🔗 Checking org ${org.name} for connection links:`, org.links)
        const connectionLink = org.links?.find(link => link.rel === 'connections')
        if (connectionLink) {
          connectionLinks.push(connectionLink.uri)
          console.log(`✅ Found connection link for ${org.name}: ${connectionLink.uri}`)
        }
      })
      
      // If no connection links found in individual orgs, check the main response
      if (connectionLinks.length === 0 && response.data.links) {
        console.log('🔍 Checking main response links:', response.data.links)
        const mainConnectionLink = response.data.links.find((link: any) => link.rel === 'connections')
        if (mainConnectionLink) {
          connectionLinks.push(mainConnectionLink.uri)
          console.log(`✅ Found main connection link: ${mainConnectionLink.uri}`)
        }
      }
      
      console.log('🎯 Final connection links:', connectionLinks)
      
      return {
        organizations,
        connectionLinks
      }
    } catch (error) {
      console.error('Error fetching organizations with connection links:', error)
      throw error
    }
  }

  /**
   * Test data access for an organization to check if connection is established
   */
  async testDataAccess(organizationId: string): Promise<{
    hasDataAccess: boolean
    hasPartialAccess: boolean
    testResults: {
      fields: { success: boolean; count: number; error?: string }
      equipment: { success: boolean; count: number; error?: string }
      farms: { success: boolean; count: number; error?: string }
      files: { success: boolean; count: number; error?: string }
    }
  }> {
    console.log(`🧪 Testing data access for organization ${organizationId}...`)
    
    // Test access to key endpoints
    const [fieldsResult, equipmentResult, farmsResult, filesResult] = await Promise.allSettled([
      this.getFieldsForConnectionTest(organizationId),
      this.getEquipmentForConnectionTest(organizationId),
      this.getFarms(organizationId),
      this.getFiles(organizationId),
    ]);

    const fields = fieldsResult.status === 'fulfilled' ? { success: true, count: fieldsResult.value.length } : { success: false, count: 0, error: this.formatError(fieldsResult.reason) };
    const equipment = equipmentResult.status === 'fulfilled' ? { success: true, count: equipmentResult.value.length } : { success: false, count: 0, error: this.formatError(equipmentResult.reason) };
    const farms = farmsResult.status === 'fulfilled' ? { success: true, count: farmsResult.value.length } : { success: false, count: 0, error: this.formatError(farmsResult.reason) };
    const files = filesResult.status === 'fulfilled' ? { success: true, count: filesResult.value.length } : { success: false, count: 0, error: this.formatError(filesResult.reason) };
    
    const allWorking = fields.success && equipment.success && farms.success && files.success;
    const someWorking = fields.success || equipment.success || farms.success || files.success;

    const summary = {
      fields: fields.success,
      equipment: equipment.success,
      farms: farms.success,
      files: files.success,
      allWorking: allWorking,
      someWorking: someWorking,
      hasPartialAccess: someWorking && !allWorking,
      overallResult: allWorking ? 'CONNECTED' : someWorking ? 'PARTIALLY_CONNECTED' : 'ERROR',
    }
    console.log('🎯 Connection test summary:', summary)

    return {
      hasDataAccess: someWorking,
      hasPartialAccess: someWorking && !allWorking,
      testResults: { fields, equipment, farms, files },
    };
  }

  private formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else {
      return 'Unknown error';
    }
  }

  /**
   * Get fields for a specific organization
   */
  async getFields(organizationId: string): Promise<JDField[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/fields`)
      return response.data.values || []
    } catch (error: any) {
      console.error('Error fetching fields:', error)
      
      // Don't fall back to mock data - throw the actual error
      if (error instanceof JohnDeereConnectionError || 
          error instanceof JohnDeereRCAError || 
          error instanceof JohnDeerePermissionError) {
        throw error
      }
      
      throw new Error('Failed to fetch fields: ' + (error.message || 'Unknown error'))
    }
  }

  /**
   * Get fields for a specific organization (for connection testing - no mock fallback)
   */
  async getFieldsForConnectionTest(organizationId: string): Promise<JDField[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/fields`)
      return response.data.values || []
    } catch (error: any) {
      // Don't fall back to mock data for connection testing
      throw error
    }
  }

  /**
   * Get specific field details including boundary
   */
  async getFieldDetails(fieldId: string): Promise<JDField> {
    try {
      const response = await this.axiosInstance.get(`/fields/${fieldId}`)
      return response.data
    } catch (error: any) {
      this.handleApiError(error, 'getFieldDetails')
      throw new Error(`Failed to fetch details for field ${fieldId}`)
    }
  }

  /**
   * Get equipment for a specific organization using the Equipment API
   */
  async getEquipment(organizationId: string): Promise<JDEquipment[]> {
    try {
      // Use the equipment-specific API instance with the correct /isg/ path
      console.log(`🚜 Fetching equipment for organization ${organizationId} using Equipment API`);
      const response = await this.equipmentAxiosInstance.get(`/isg/equipment`, {
        params: { organizationIds: organizationId }
      });

      const equipment = response.data.values || [];
      
      // Transform equipment data to handle make/model objects
      return equipment.map((item: any) => ({
        ...item,
        make: typeof item.make === 'object' ? item.make.name : item.make,
        model: typeof item.model === 'object' ? item.model.name : item.model,
      }));

    } catch (error: any) {
      this.handleApiError(error, 'getEquipment');
      return [];
    }
  }

  /**
   * Get a small sample of equipment for connection testing
   */
  async getEquipmentForConnectionTest(organizationId: string): Promise<JDEquipment[]> {
    try {
      // Use the Equipment API with correct endpoint
       console.log(`🔧 Testing equipment access for organization ${organizationId} using Equipment API`)
       const response = await this.equipmentAxiosInstance.get(`/isg/equipment`, {
        params: { organizationIds: organizationId, limit: 5 }
       });
       
       const equipment = response.data.values || []
       console.log(`📊 Equipment test retrieved ${equipment.length} items`)
       
       // Transform equipment data to handle make/model objects
       return equipment.map((item: any) => ({
         ...item,
         make: typeof item.make === 'object' ? item.make.name : item.make,
         model: typeof item.model === 'object' ? item.model.name : item.model,
       }));
     } catch (error: any) {
       this.handleApiError(error, 'getEquipmentForConnectionTest');
       throw error;
     }
  }

  /**
   * Get field operations for a specific organization
   */
  async getFieldOperations(organizationId: string, fieldId: string): Promise<JDFieldOperation[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/fields/${fieldId}/fieldOperations`);
      return response.data?.values || [];
    } catch (error) {
      this.handleApiError(error, `getFieldOperations for field ${fieldId}`);
      throw error;
    }
  }

  /**
   * Get all field operations for an organization (across all fields)
   */
  async getFieldOperationsForOrganization(organizationId: string, options?: {
    startDate?: string
    endDate?: string
    fieldId?: string
  }): Promise<JDFieldOperation[]> {
    try {
      // If a specific field is requested, use the field-specific method
      if (options?.fieldId) {
        return await this.getFieldOperations(organizationId, options.fieldId);
      }

      // Otherwise, get operations for all fields in the organization
      const fields = await this.getFields(organizationId);
      let allOperations: JDFieldOperation[] = [];

      // Fetch operations for each field
      const operationsPromises = fields.map(async (field) => {
        try {
          const fieldOperations = await this.getFieldOperations(organizationId, field.id);
          return fieldOperations;
        } catch (error) {
          console.warn(`Failed to get operations for field ${field.id}:`, error);
          return [];
        }
      });

      const results = await Promise.allSettled(operationsPromises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allOperations.push(...result.value);
        }
      });

      // Apply date filtering if provided
      if (options?.startDate || options?.endDate) {
        allOperations = allOperations.filter(operation => {
          const operationDate = new Date(operation.startTime);
          if (options.startDate && operationDate < new Date(options.startDate)) {
            return false;
          }
          if (options.endDate && operationDate > new Date(options.endDate)) {
            return false;
          }
          return true;
        });
      }

      return allOperations;
    } catch (error) {
      this.handleApiError(error, 'getFieldOperationsForOrganization');
      throw error;
    }
  }

  /**
   * Get machine locations for specific equipment
   */
  async getMachineLocations(equipmentId: string, options?: {
    startDate?: string
    endDate?: string
  }): Promise<JDMachineLocation[]> {
    try {
      let url = `/equipment/${equipmentId}/locations`
      const params = new URLSearchParams()
      
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await this.axiosInstance.get(url)
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching machine locations:', error)
      throw new Error('Failed to fetch machine locations')
    }
  }

  /**
   * Get assets for a specific organization
   */
  async getAssets(organizationId: string): Promise<JDAsset[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/assets`);
      return response.data?.values || [];
    } catch (error) {
      this.handleApiError(error, 'getAssets');
      throw error;
    }
  }

  async getFiles(organizationId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/files`);
      return response.data?.values || [];
    } catch (error) {
      this.handleApiError(error, 'getFiles');
      throw error;
    }
  }

  // John Deere supported file types
  static readonly FILE_TYPES = {
    PRESCRIPTION: 'PRESCRIPTION',
    BOUNDARY: 'BOUNDARY', 
    WORK_DATA: 'WORK_DATA',
    SETUP_FILE: 'SETUP_FILE',
    REPORT: 'REPORT',
    OTHER: 'OTHER'
  } as const;

  /**
   * Intelligently detect file type based on filename, content, and context
   */
  static detectFileType(fileName: string, userIntent?: string): { 
    fileType: string, 
    confidence: 'high' | 'medium' | 'low',
    reasoning: string 
  } {
    const name = fileName.toLowerCase();
    const intent = userIntent?.toLowerCase() || '';
    
    // High confidence detections
    if (name.includes('prescription') || name.includes('rx') || name.includes('variable_rate') || 
        intent.includes('prescription') || intent.includes('variable rate') || intent.includes('application rate')) {
      return {
        fileType: this.FILE_TYPES.PRESCRIPTION,
        confidence: 'high',
        reasoning: 'Filename or intent indicates prescription/variable rate application data'
      };
    }
    
    if (name.includes('boundary') || name.includes('field_boundary') || name.includes('border') ||
        intent.includes('boundary') || intent.includes('field border') || intent.includes('field shape')) {
      return {
        fileType: this.FILE_TYPES.BOUNDARY,
        confidence: 'high', 
        reasoning: 'Filename or intent indicates field boundary data'
      };
    }
    
    if (name.includes('harvest') || name.includes('planting') || name.includes('tillage') || name.includes('operation') ||
        intent.includes('harvest') || intent.includes('planting') || intent.includes('field work') || intent.includes('operation')) {
      return {
        fileType: this.FILE_TYPES.WORK_DATA,
        confidence: 'high',
        reasoning: 'Filename or intent indicates field operation/work data'
      };
    }
    
    if (name.includes('report') || name.includes('summary') || name.includes('analysis') ||
        intent.includes('report') || intent.includes('summary') || intent.includes('analysis')) {
      return {
        fileType: this.FILE_TYPES.REPORT,
        confidence: 'high',
        reasoning: 'Filename or intent indicates report or analysis document'
      };
    }
    
    // Medium confidence detections based on file extensions and patterns
    if (name.match(/\.(shp|kml|gpx|geojson)$/)) {
      return {
        fileType: this.FILE_TYPES.BOUNDARY,
        confidence: 'medium',
        reasoning: 'Geographic file format commonly used for boundaries'
      };
    }
    
    if (name.match(/\.(csv|xlsx|dat)$/) && (name.includes('yield') || name.includes('data'))) {
      return {
        fileType: this.FILE_TYPES.WORK_DATA,
        confidence: 'medium',
        reasoning: 'Data file format with yield/work indicators'
      };
    }
    
    if (name.match(/\.(pdf|doc|docx)$/)) {
      return {
        fileType: this.FILE_TYPES.REPORT,
        confidence: 'medium',
        reasoning: 'Document format commonly used for reports'
      };
    }
    
    // Low confidence - default to OTHER
    return {
      fileType: this.FILE_TYPES.OTHER,
      confidence: 'low',
      reasoning: 'Could not determine specific file type from filename or context'
    };
  }

  async uploadFile(organizationId: string, file: Buffer, fileName: string, contentType: string, fileType: string = 'OTHER'): Promise<any> {
    try {
      console.log(`🔧 Starting John Deere two-step upload process:`);
      console.log(`   Organization ID: ${organizationId}`);
      console.log(`   File name: ${fileName}`);
      console.log(`   Content type: ${contentType}`);
      console.log(`   File type: ${fileType}`);
      console.log(`   File size: ${file.length} bytes`);

      // Validate file type
      const validTypes = Object.values(JohnDeereAPIClient.FILE_TYPES);
      if (!validTypes.includes(fileType as any)) {
        throw new Error(`Invalid file type: ${fileType}. Valid types: ${validTypes.join(', ')}`);
      }

      // STEP 1: Create file record
      console.log(`📝 Step 1: Creating file record...`);
      
      const fileCreationPayload = {
        name: fileName,
        type: fileType
      };

      const createResponse = await this.axiosInstance.post(
        `/organizations/${organizationId}/files`,
        fileCreationPayload,
        {
          headers: {
            'Content-Type': 'application/vnd.deere.axiom.v3+json',
            'Accept': 'application/vnd.deere.axiom.v3+json'
          },
        }
      );

      // Extract file ID from location header
      const locationHeader = createResponse.headers.location;
      if (!locationHeader) {
        throw new Error('No location header received from file creation');
      }

      const fileId = locationHeader.split('/').pop();
      if (!fileId) {
        throw new Error('Could not extract file ID from location header');
      }

      console.log(`✅ Step 1 successful: File record created with ID: ${fileId}`);

      // STEP 2: Upload file content using PUT
      console.log(`📤 Step 2: Uploading file content to file ID ${fileId}...`);
      
      // Determine best content type for the PUT request
      const putContentType = contentType === 'application/zip' ? 'application/zip' : 'application/octet-stream';
      
      const uploadResponse = await this.axiosInstance.put(
        `/files/${fileId}`,
        file,
        {
          headers: {
            'Content-Type': putContentType,
            'Accept': 'application/vnd.deere.axiom.v3+json'
          },
        }
      );

      console.log(`✅ Step 2 complete: File content uploaded successfully`);
      console.log(`   Upload response status: ${uploadResponse.status}`);

      // Return combined result
      const result = {
        fileId: fileId,
        fileName: fileName,
        fileType: fileType,
        fileSize: file.length,
        createResponse: createResponse.data,
        uploadResponse: uploadResponse.data,
        location: createResponse.headers.location
      };

      console.log(`🎉 John Deere upload SUCCESS:`, result);
      return result;

    } catch (error: any) {
      console.log(`❌ John Deere upload failed:`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Status text: ${error.response?.statusText}`);
      console.log(`   Response headers:`, error.response?.headers);
      console.log(`   Response data:`, error.response?.data);
      console.log(`   Request URL:`, error.config?.url);
      console.log(`   Request method:`, error.config?.method);
      
      throw new Error(`Error uploading file to John Deere: ${error.message}`);
    }
  }

  async getBoundariesForField(boundaryUri: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(boundaryUri.replace('https://api.deere.com/platform', ''));
      return response.data;
    } catch (error: any) {
      this.handleApiError(error, `getBoundariesForField for URI ${boundaryUri}`);
      throw error;
    }
  }

  async getComprehensiveFarmData(organizationId: string): Promise<any> {
    try {
      console.log(`🌾 Getting comprehensive farm data for organization: ${organizationId}`);
      
      // Fetch all data in parallel for better performance
      const [fields, equipment, operations, assets, farms] = await Promise.allSettled([
        this.getFields(organizationId),
        this.getEquipment(organizationId),
        this.getFieldOperationsForOrganization(organizationId),
        this.getAssets(organizationId),
        this.getFarms(organizationId)
      ]);

      // Get organization info
      const organizations = await this.getOrganizations();
      const organization = organizations.find(org => org.id === organizationId) || organizations[0];

      return {
        organization,
        fields: fields.status === 'fulfilled' ? fields.value : [],
        equipment: equipment.status === 'fulfilled' ? equipment.value : [],
        operations: operations.status === 'fulfilled' ? operations.value : [],
        assets: assets.status === 'fulfilled' ? assets.value : [],
        farms: farms.status === 'fulfilled' ? farms.value : []
      };
    } catch (error: any) {
      this.handleApiError(error, `getComprehensiveFarmData for organization ${organizationId}`);
      throw error;
    }
  }

  async uploadFileViaTransfer(organizationId: string, file: Buffer, fileName: string, contentType: string, fileType: string = 'OTHER'): Promise<any> {
    try {
      console.log(`🔧 Trying alternative upload via fileTransfers endpoint:`);
      console.log(`   Organization ID: ${organizationId}`);
      console.log(`   File name: ${fileName}`);
      console.log(`   Content type: ${contentType}`);
      console.log(`   File type: ${fileType}`);
      console.log(`   File size: ${file.length} bytes`);

      // Use form-data package for proper multipart handling
      const form = new FormData();
      
      // Append the file with proper options
      form.append('file', file, {
        filename: fileName,
        contentType: contentType
      });
      
      // Add file type
      form.append('type', fileType);
      
      console.log(`🚀 Making request to: /organizations/${organizationId}/fileTransfers`);
      
      const response = await this.axiosInstance.post(
        `/organizations/${organizationId}/fileTransfers`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
        }
      );

      console.log(`✅ File transfer upload SUCCESS:`, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      return response.data;
    } catch (error: any) {
      console.log(`❌ FileTransfer upload error:`, {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.config?.headers
      });
      
      throw new Error(`Error uploading file via fileTransfers: ${error.message}`);
    }
  }

  /**
   * Get farms for a specific organization
   */
  async getFarms(organizationId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/farms`)
      return response.data.values || []
    } catch (error: any) {
      console.error('Error fetching farms:', error)
      
      // Handle both 403 and 404 errors (both indicate authorization/permission issues in sandbox)
      if (error.response?.status === 403 || error.response?.status === 404) {
        console.log('🔄 Farms access denied, falling back to mock data...')
        
        // Import mock data dynamically
        const { getMockDataForType } = await import('./johndeere-mock-data')
        const mockFarms = getMockDataForType('farms') as any[]
        
        console.log('📊 Using mock farms data:', mockFarms.length, 'items')
        return mockFarms
      }
      
      throw new Error('Failed to fetch farms')
    }
  }

  /**
   * Get crop types available in the system
   */
  async getCropTypes(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/cropTypes')
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching crop types:', error)
      throw new Error('Failed to fetch crop types')
    }
  }

  /**
   * Get machine alerts for specific equipment
   */
  async getMachineAlerts(equipmentId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/equipment/${equipmentId}/alerts`)
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching machine alerts:', error)
      throw new Error('Failed to fetch machine alerts')
    }
  }

  /**
   * Get machine engine hours for specific equipment
   */
  async getMachineEngineHours(machineId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/machines/${machineId}/engineHours`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, `getMachineEngineHours for machine ${machineId}`);
      throw error;
    }
  }
}

// Singleton instance
let johnDeereClient: JohnDeereAPIClient | null = null

export function getJohnDeereAPIClient(): JohnDeereAPIClient {
  if (!johnDeereClient) {
    const environment = (process.env.JOHN_DEERE_ENVIRONMENT as 'sandbox' | 'production') || 'production'
    johnDeereClient = new JohnDeereAPIClient(environment)
  }
  return johnDeereClient
}