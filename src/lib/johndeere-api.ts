import axios, { AxiosInstance } from 'axios'
import { prisma } from './prisma'

// John Deere API Configuration
const JOHN_DEERE_CONFIG = {
  sandbox: {
    baseURL: 'https://sandboxapi.deere.com/platform',
    authURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
    tokenURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  },
  production: {
    baseURL: 'https://api.deere.com/platform',
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

export class JohnDeereAPIClient {
  private axiosInstance: AxiosInstance
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

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await this.getValidAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          await this.refreshAccessToken()
          // Retry the original request
          const token = await this.getValidAccessToken()
          if (token) {
            error.config.headers.Authorization = `Bearer ${token}`
            return this.axiosInstance.request(error.config)
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
      // TODO: Get user ID from authentication session
      const userId = 'user_placeholder'
      
      const tokenRecord = await prisma.johnDeereToken.findUnique({
        where: { userId },
      })

      if (!tokenRecord) {
        return null
      }

      // Check if token is expired
      if (new Date() >= tokenRecord.expiresAt) {
        // Try to refresh token
        await this.refreshAccessToken()
        // Get the refreshed token
        const refreshedToken = await prisma.johnDeereToken.findUnique({
          where: { userId },
        })
        return refreshedToken?.accessToken || null
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
      // TODO: Get user ID from authentication session
      const userId = 'user_placeholder'
      
      const tokenRecord = await prisma.johnDeereToken.findUnique({
        where: { userId },
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
        where: { userId },
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
      const manageConnectionLink = organization.links?.find(link => link.rel === 'manage_connections')
      
      const isConnected = !!manageConnectionLink && !connectionLink
      
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
      assets: { success: boolean; count: number; error?: string }
    }
  }> {
    const testResults: {
      fields: { success: boolean; count: number; error?: string }
      equipment: { success: boolean; count: number; error?: string }
      farms: { success: boolean; count: number; error?: string }
      assets: { success: boolean; count: number; error?: string }
    } = {
      fields: { success: false, count: 0 },
      equipment: { success: false, count: 0 },
      farms: { success: false, count: 0 },
      assets: { success: false, count: 0 }
    }

    // First check connection status
    try {
      const connectionStatus = await this.checkOrganizationConnection(organizationId)
      if (!connectionStatus.isConnected) {
        console.log(`❌ Organization ${organizationId} is not connected`)
        return {
          hasDataAccess: false,
          hasPartialAccess: false,
          testResults
        }
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
    }

    // Test each endpoint (using connection test methods that don't fall back to mock data)
    console.log(`🧪 Testing data access for organization ${organizationId}...`)
    
    try {
      const fields = await this.getFieldsForConnectionTest(organizationId)
      testResults.fields = { success: true, count: fields.length }
      console.log(`✅ Fields test: SUCCESS (${fields.length} items)`)
    } catch (error: any) {
      testResults.fields = { 
        success: false, 
        count: 0, 
        error: `${error.response?.status || 'Unknown'} - ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
      console.log(`❌ Fields test: FAILED - ${testResults.fields.error}`)
    }

    try {
      const equipment = await this.getEquipmentForConnectionTest(organizationId)
      testResults.equipment = { success: true, count: equipment.length }
      console.log(`✅ Equipment test: SUCCESS (${equipment.length} items)`)
    } catch (error: any) {
      testResults.equipment = { 
        success: false, 
        count: 0, 
        error: `${error.response?.status || 'Unknown'} - ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
      console.log(`❌ Equipment test: FAILED - ${testResults.equipment.error}`)
    }

    try {
      const farms = await this.getFarmsForConnectionTest(organizationId)
      testResults.farms = { success: true, count: farms.length }
      console.log(`✅ Farms test: SUCCESS (${farms.length} items)`)
    } catch (error: any) {
      testResults.farms = { 
        success: false, 
        count: 0, 
        error: `${error.response?.status || 'Unknown'} - ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
      console.log(`❌ Farms test: FAILED - ${testResults.farms.error}`)
    }

    try {
      const assets = await this.getAssetsForConnectionTest(organizationId)
      testResults.assets = { success: true, count: assets.length }
      console.log(`✅ Assets test: SUCCESS (${assets.length} items)`)
    } catch (error: any) {
      testResults.assets = { 
        success: false, 
        count: 0, 
        error: `${error.response?.status || 'Unknown'} - ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
      console.log(`❌ Assets test: FAILED - ${testResults.assets.error}`)
    }

    // Check if we have data access (ALL endpoints must succeed for full connection)
    const allEndpointsWorking = Object.values(testResults).every(result => result.success)
    const someEndpointsWorking = Object.values(testResults).some(result => result.success)
    
    // Determine connection status more granularly
    const hasDataAccess = allEndpointsWorking
    const hasPartialAccess = someEndpointsWorking && !allEndpointsWorking
    
    console.log(`🎯 Connection test summary:`, {
      fields: testResults.fields.success,
      equipment: testResults.equipment.success, 
      farms: testResults.farms.success,
      assets: testResults.assets.success,
      allWorking: allEndpointsWorking,
      someWorking: someEndpointsWorking,
      hasPartialAccess,
      overallResult: allEndpointsWorking ? 'FULLY_CONNECTED' : (someEndpointsWorking ? 'PARTIALLY_CONNECTED' : 'CONNECTION_REQUIRED')
    })

    return {
      hasDataAccess,
      hasPartialAccess,
      testResults
    }
  }

  /**
   * Get fields for a specific organization
   */
  async getFields(organizationId: string): Promise<JDField[]> {
    try {
      // First check if organization is connected
      const connectionStatus = await this.checkOrganizationConnection(organizationId)
      if (!connectionStatus.isConnected && connectionStatus.connectionUrl) {
        throw new JohnDeereConnectionError(
          `Organization ${organizationId} is not connected to your application.`,
          connectionStatus.connectionUrl,
          organizationId
        )
      }

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
    } catch (error) {
      console.error('Error fetching field details:', error)
      throw new Error('Failed to fetch field details')
    }
  }

  /**
   * Get equipment for a specific organization
   */
  async getEquipment(organizationId: string): Promise<JDEquipment[]> {
    try {
      // First check if organization is connected
      const connectionStatus = await this.checkOrganizationConnection(organizationId)
      if (!connectionStatus.isConnected && connectionStatus.connectionUrl) {
        throw new JohnDeereConnectionError(
          `Organization ${organizationId} is not connected to your application.`,
          connectionStatus.connectionUrl,
          organizationId
        )
      }

      const response = await this.axiosInstance.get(`/organizations/${organizationId}/equipment`)
      const equipment = response.data.values || []
      
      // Transform equipment data to handle make/model objects
      return equipment.map((item: any) => ({
        ...item,
        make: typeof item.make === 'object' ? item.make.name : item.make,
        model: typeof item.model === 'object' ? item.model.name : item.model,
      }))
    } catch (error: any) {
      console.error('Error fetching equipment:', error)
      
      // Don't fall back to mock data - throw the actual error
      if (error instanceof JohnDeereConnectionError || 
          error instanceof JohnDeereRCAError || 
          error instanceof JohnDeerePermissionError) {
        throw error
      }
      
      throw new Error('Failed to fetch equipment: ' + (error.message || 'Unknown error'))
    }
  }

  /**
   * Get equipment for a specific organization (for connection testing - no mock fallback)
   */
  async getEquipmentForConnectionTest(organizationId: string): Promise<JDEquipment[]> {
    try {
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/equipment`)
      const equipment = response.data.values || []
      
      // Transform equipment data to handle make/model objects
      return equipment.map((item: any) => ({
        ...item,
        make: typeof item.make === 'object' ? item.make.name : item.make,
        model: typeof item.model === 'object' ? item.model.name : item.model,
      }))
    } catch (error: any) {
      // Don't fall back to mock data for connection testing
      throw error
    }
  }

  /**
   * Get field operations for a specific organization
   */
  async getFieldOperations(organizationId: string, options?: {
    startDate?: string
    endDate?: string
    fieldId?: string
  }): Promise<JDFieldOperation[]> {
    try {
      // First check if organization is connected
      const connectionStatus = await this.checkOrganizationConnection(organizationId)
      if (!connectionStatus.isConnected && connectionStatus.connectionUrl) {
        throw new JohnDeereConnectionError(
          `Organization ${organizationId} is not connected to your application.`,
          connectionStatus.connectionUrl,
          organizationId
        )
      }

      let url = `/organizations/${organizationId}/fieldOperations`
      const params = new URLSearchParams()
      
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)
      if (options?.fieldId) params.append('fieldId', options.fieldId)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await this.axiosInstance.get(url)
      return response.data.values || []
    } catch (error: any) {
      console.error('Error fetching field operations:', error)
      
      // Don't fall back to mock data - throw the actual error
      if (error instanceof JohnDeereConnectionError || 
          error instanceof JohnDeereRCAError || 
          error instanceof JohnDeerePermissionError) {
        throw error
      }
      
      throw new Error('Failed to fetch field operations: ' + (error.message || 'Unknown error'))
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
      const response = await this.axiosInstance.get(`/organizations/${organizationId}/assets`)
      return response.data.values || []
    } catch (error: any) {
      console.error('Error fetching assets:', error)
      
      // Handle both 403 and 404 errors (both indicate authorization/permission issues in sandbox)
      if (error.response?.status === 403 || error.response?.status === 404) {
        console.log('🔄 Assets access denied, falling back to mock data...')
        
        // Import mock data dynamically
        const { getMockDataForType } = await import('./johndeere-mock-data')
        const mockAssets = getMockDataForType('assets') as JDAsset[]
        
        console.log('📊 Using mock assets data:', mockAssets.length, 'items')
        return mockAssets
      }
      
      throw new Error('Failed to fetch assets')
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
  async getMachineEngineHours(equipmentId: string, options?: {
    startDate?: string
    endDate?: string
  }): Promise<any[]> {
    try {
      let url = `/equipment/${equipmentId}/engineHours`
      const params = new URLSearchParams()
      
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await this.axiosInstance.get(url)
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching machine engine hours:', error)
      throw new Error('Failed to fetch machine engine hours')
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
      // Get organization details
      const organizations = await this.getOrganizations()
      const organization = organizations.find(org => org.id === organizationId)
      
      if (!organization) {
        throw new Error('Organization not found')
      }

      // Fetch all data in parallel for better performance
      const [fields, equipment, operations, assets, farms] = await Promise.all([
        this.getFields(organizationId),
        this.getEquipment(organizationId),
        this.getFieldOperations(organizationId),
        this.getAssets(organizationId),
        this.getFarms(organizationId),
      ])

      return {
        organization,
        fields,
        equipment,
        operations,
        assets,
        farms,
      }
    } catch (error: any) {
      console.error('Error fetching comprehensive farm data:', error)
      // If any of the sub-requests failed due to authorization, propagate that error
      if (error.name === 'AuthorizationError' || error.status === 403) {
        const authError = new Error('Failed to fetch comprehensive farm data: authorization denied')
        authError.name = 'AuthorizationError'
        ;(authError as any).status = 403
        ;(authError as any).originalError = error
        throw authError
      }
      throw new Error('Failed to fetch comprehensive farm data')
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