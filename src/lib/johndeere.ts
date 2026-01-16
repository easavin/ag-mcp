import axios, { AxiosInstance } from 'axios'
import { v4 as uuidv4 } from 'uuid'

// John Deere API Configuration
const JOHN_DEERE_CONFIG = {
  sandbox: {
    baseURL: 'https://sandboxapi.deere.com/platform',
    authURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
    tokenURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  },
  production: {
    baseURL: 'https://partnerapi.deere.com/platform',
    authURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
    tokenURL: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  },
}

export interface JohnDeereTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface JohnDeereOrganization {
  id: string
  name: string
  type: string
  member: boolean
}

export interface JohnDeereField {
  id: string
  name: string
  archived: boolean
  area: {
    value: number
    unit: string
  }
  boundary?: {
    type: string
    coordinates: number[][][]
  }
}

export interface JohnDeereEquipment {
  id: string
  name: string
  type: string
  category: string
  make: string
  model: string
  serialNumber?: string
  lastLocation?: {
    geometry: {
      type: string
      coordinates: [number, number]
    }
    timestamp: string
  }
}

export interface JohnDeereWorkRecord {
  id: string
  type: string
  startTime: string
  endTime: string
  totalTime: number
  area: {
    value: number
    unit: string
  }
  field: {
    id: string
    name: string
  }
  machine: {
    id: string
    name: string
  }
}

export class JohnDeereAPI {
  private client: AxiosInstance
  private environment: 'sandbox' | 'production'
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUri = redirectUri
    this.environment = environment

    // IMPORTANT: In sandbox mode, John Deere requires using the 'production' OAuth URLs
    // The sandbox base URL is ONLY for API calls, not for authentication
    const config = JOHN_DEERE_CONFIG['production'] // Always use production config for OAuth
    
    this.client = axios.create({
      baseURL: JOHN_DEERE_CONFIG[environment].baseURL, // Use environment-specific API base URL
      headers: {
        'Accept': 'application/vnd.deere.axiom.v3+json',
        'Content-Type': 'application/json',
      },
    })
  }

  // OAuth Flow Methods
  generateAuthorizationUrl(scopes: string[] = ['ag1', 'ag2', 'ag3', 'eq1', 'eq2', 'work1', 'files', 'offline_access']): { url: string; state: string } {
    const state = uuidv4()
    // Always use production OAuth URL even for sandbox environment
    const config = JOHN_DEERE_CONFIG['production']
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri,
      state,
      prompt: 'consent',
    })

    return {
      url: `${config.authURL}?${params.toString()}`,
      state,
    }
  }

  async exchangeCodeForTokens(code: string): Promise<JohnDeereTokens> {
    // Always use production token URL even for sandbox environment
    const config = JOHN_DEERE_CONFIG['production']
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    })

    try {
      console.log('🔄 Making token exchange request to:', config.tokenURL)
      console.log('🔄 Request params:', {
        grant_type: 'authorization_code',
        code: code.substring(0, 10) + '...',
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret.substring(0, 10) + '...'
      })
      
      const response = await axios.post(config.tokenURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'AgMCP-JohnDeere/1.0',
        },
      })

      console.log('✅ Token exchange successful:', {
        hasAccessToken: !!response.data.access_token,
        hasRefreshToken: !!response.data.refresh_token,
        expiresIn: response.data.expires_in,
        scope: response.data.scope
      })

      return response.data
    } catch (error: any) {
      console.error('❌ Error exchanging code for tokens:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      })
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        throw new Error(`Invalid authorization code or expired: ${error.response.data?.error_description || error.response.data?.error || 'Bad Request'}`)
      } else if (error.response?.status === 401) {
        throw new Error(`Invalid client credentials: ${error.response.data?.error_description || 'Unauthorized'}`)
      } else if (error.response?.status >= 500) {
        throw new Error(`John Deere server error: ${error.response.statusText}`)
      }
      
      throw new Error(`Failed to exchange authorization code for tokens: ${error.message}`)
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<JohnDeereTokens> {
    // Always use production token URL even for sandbox environment
    const config = JOHN_DEERE_CONFIG['production']
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    })

    try {
      const response = await axios.post(config.tokenURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'AgMCP-JohnDeere/1.0',
        },
      })

      return response.data
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  // API Methods (require valid access token)
  setAccessToken(accessToken: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }

  async getOrganizations(): Promise<JohnDeereOrganization[]> {
    try {
      const response = await this.client.get('/organizations')
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching organizations:', error)
      throw new Error('Failed to fetch organizations')
    }
  }

  async getFields(organizationId: string): Promise<JohnDeereField[]> {
    try {
      const response = await this.client.get(`/organizations/${organizationId}/fields`)
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching fields:', error)
      throw new Error('Failed to fetch fields')
    }
  }

  async getField(organizationId: string, fieldId: string): Promise<JohnDeereField> {
    try {
      const response = await this.client.get(`/organizations/${organizationId}/fields/${fieldId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching field:', error)
      throw new Error('Failed to fetch field details')
    }
  }

  async getEquipment(organizationId: string): Promise<JohnDeereEquipment[]> {
    try {
      const response = await this.client.get(`/organizations/${organizationId}/machines`)
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching equipment:', error)
      throw new Error('Failed to fetch equipment')
    }
  }

  async getWorkRecords(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<JohnDeereWorkRecord[]> {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await this.client.get(
        `/organizations/${organizationId}/workRecords?${params.toString()}`
      )
      return response.data.values || []
    } catch (error) {
      console.error('Error fetching work records:', error)
      throw new Error('Failed to fetch work records')
    }
  }

  async uploadPrescription(
    organizationId: string,
    fieldId: string,
    prescriptionData: {
      name: string
      type: string
      cropYear: number
      fileContent: Buffer
      fileName: string
    }
  ): Promise<{ id: string; status: string }> {
    try {
      // First, create the prescription metadata
      const prescriptionResponse = await this.client.post(
        `/organizations/${organizationId}/fields/${fieldId}/prescriptions`,
        {
          name: prescriptionData.name,
          type: prescriptionData.type,
          cropYear: prescriptionData.cropYear,
        }
      )

      const prescriptionId = prescriptionResponse.data.id

      // Then upload the file
      const formData = new FormData()
      formData.append('file', new Blob([prescriptionData.fileContent]), prescriptionData.fileName)

      await this.client.post(
        `/organizations/${organizationId}/fields/${fieldId}/prescriptions/${prescriptionId}/files`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      return {
        id: prescriptionId,
        status: 'uploaded',
      }
    } catch (error) {
      console.error('Error uploading prescription:', error)
      throw new Error('Failed to upload prescription')
    }
  }
}

// Singleton instance
let johnDeereAPI: JohnDeereAPI | null = null

export function getJohnDeereAPI(forceRecreate: boolean = false): JohnDeereAPI {
  if (!johnDeereAPI || forceRecreate) {
    const clientId = process.env.JOHN_DEERE_CLIENT_ID
    const clientSecret = process.env.JOHN_DEERE_CLIENT_SECRET
    const environment = (process.env.JOHN_DEERE_ENVIRONMENT as 'sandbox' | 'production') || 'production'
    
    // Handle redirect URI - use NEXTAUTH_URL if available, otherwise default to localhost for development
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/auth/johndeere/callback`

    if (!clientId || !clientSecret) {
      throw new Error('John Deere API credentials not configured')
    }

    johnDeereAPI = new JohnDeereAPI(clientId, clientSecret, redirectUri, environment)
  }

  return johnDeereAPI
} 