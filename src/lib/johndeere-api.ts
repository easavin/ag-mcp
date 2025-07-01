import axios, { AxiosInstance } from 'axios'
import { prisma } from './prisma'
import FormData from 'form-data'

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
      this.getFarmsForConnectionTest(organizationId),
      this.getFilesForConnectionTest(organizationId),
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

  async uploadFile(organizationId: string, file: Buffer, fileName: string, contentType: string): Promise<any> {
    try {
      const form = new FormData();
      form.append('file', file, {
        filename: fileName,
        contentType: contentType,
      });

      const response = await this.axiosInstance.post(
        `/organizations/${organizationId}/files`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
        }
      );

      // After a successful upload, the response is a 204 No Content, 
      // but the location header contains the URL to the newly created file.
      if (response.status === 204 && response.headers.location) {
        return { success: true, fileUrl: response.headers.location };
      }
      
      return response.data;

    } catch (error) {
      this.handleApiError(error, 'uploadFile');
      throw error;
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

  /**
   * Helper method to get comprehensive farm data for an organization
   */
  async getComprehensiveFarmData(organizationId: string): Promise<{
    organization: JDOrganization
    fields: JDField[]
    equipment: JDEquipment[]
    operations: JDFieldOperation[]
    assets: JDAsset[]
    farms: any[]
  }> {
    try {
      const orgDetails = await this.axiosInstance.get(`/organizations/${organizationId}`)
      const organization = orgDetails.data

      const [fields, equipment, assets, farms] = await Promise.all([
        this.getFields(organizationId),
        this.getEquipment(organizationId),
        this.getAssets(organizationId),
        this.getFarms(organizationId),
      ])

      // Get all field operations for the organization
      const operations = await this.getFieldOperationsForOrganization(organizationId);
      
      return {
        organization,
        fields,
        equipment,
        operations,
        assets,
        farms,
      }
    } catch (error: any) {
      this.handleApiError(error, 'getComprehensiveFarmData')
      throw new Error(
        'Failed to fetch comprehensive farm data: ' +
          (error.message || 'Unknown error')
      )
    }
  }

  /**
   * Get farms for a specific organization (for connection testing - no mock fallback)
   */
  async getFarmsForConnectionTest(organizationId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/farms`)
      return response.data.values || []
    } catch (error: any) {
      // Don't fall back to mock data for connection testing
      throw error
    }
  }

  /**
   * Get assets for a specific organization (for connection testing - no mock fallback) 
   */
  async getAssetsForConnectionTest(organizationId: string): Promise<JDAsset[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/assets`)
      return response.data.values || []
    } catch (error: any) {
      // Don't fall back to mock data for connection testing
      throw error
    }
  }

  async getBoundariesForField(boundaryLink: string): Promise<JDBoundary | null> {
    try {
      if (!boundaryLink) {
        console.warn(`No boundary link provided.`);
        return null;
      }

      // The link is a full URL, so we need to make a request to it directly
      const response = await this.axiosInstance.get(boundaryLink);
      return response.data;
    } catch (error) {
      this.handleApiError(error, `getBoundariesForField`);
      throw error;
    }
  }

  async getFilesForConnectionTest(organizationId: string): Promise<any[]> {
    try {
      console.log(`🔍 Testing Files API access for organization ${organizationId}`);
      
      // First check if we have the files scope in our token
      const token = await this.getValidAccessToken();
      if (token) {
        try {
          const payload = token.split('.')[1];
          const paddedPayload = payload + '='.repeat(4 - payload.length % 4);
          const decoded = JSON.parse(Buffer.from(paddedPayload, 'base64').toString());
          const scopes = decoded.scp || [];
          
          if (!scopes.includes('files')) {
            console.log(`❌ Files scope not present in token. Available scopes:`, scopes);
            throw new Error('MISSING_FILES_SCOPE');
          }
          
          console.log(`✅ Files scope is present in token`);
        } catch (decodeError) {
          if (decodeError instanceof Error && decodeError.message === 'MISSING_FILES_SCOPE') {
            throw decodeError;
          }
          console.log(`⚠️ Could not decode token to check scopes:`, decodeError);
        }
      }
      
      // Try the standard files endpoint
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/files`, {
        params: { limit: 5 },
        headers: {
          'Accept': 'application/vnd.deere.axiom.v3+json',
          'Content-Type': 'application/vnd.deere.axiom.v3+json',
        }
      });
      
      console.log(`✅ Files API successful, response:`, response.data);
      return response.data?.values || [];
    } catch (error: any) {
      // Handle specific case where files scope is missing
      if (error.message === 'MISSING_FILES_SCOPE') {
        console.log(`❌ Files scope missing from token - need to re-authorize`);
        throw new Error('Files scope not granted. Please re-authorize with files permissions.');
      }
      
      console.log(`❌ Files API failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data,
        url: error.config?.url,
        message: error.message
      });
      
      // Check if this is a scope/permission issue
      if (error.response?.status === 403 && error.response?.headers?.['response-code-details'] === 'ext_authz_denied') {
        throw new Error('Files API access denied. Missing files scope or organization permissions.');
      }
      
      this.handleApiError(error, 'getFilesForConnectionTest');
      throw error;
    }
  }
}

// Singleton instance
let johnDeereClient: JohnDeereAPIClient | null = null

export function getJohnDeereAPIClient(): JohnDeereAPIClient {
  if (!johnDeereClient) {
    const environment = (process.env.JOHN_DEERE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    johnDeereClient = new JohnDeereAPIClient(environment)
  }
  return johnDeereClient
} 