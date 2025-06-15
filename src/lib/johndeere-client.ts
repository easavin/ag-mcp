// Client-side utility for fetching John Deere data
export interface JohnDeereDataRequest {
  dataType: 'organizations' | 'fields' | 'equipment' | 'operations' | 'comprehensive'
  organizationId?: string
  filters?: {
    startDate?: string
    endDate?: string
    fieldId?: string
  }
}

export interface JohnDeereDataResponse {
  success: boolean
  data?: any
  error?: string
  details?: string
}

export class JohnDeereClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:3000'
  }

  /**
   * Fetch John Deere data
   */
  async fetchData(request: JohnDeereDataRequest): Promise<JohnDeereDataResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/johndeere-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.error || 'Failed to fetch data',
          details: errorData.details,
        }
      }

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get organizations
   */
  async getOrganizations(): Promise<JohnDeereDataResponse> {
    return this.fetchData({ dataType: 'organizations' })
  }

  /**
   * Get fields for an organization
   */
  async getFields(organizationId: string): Promise<JohnDeereDataResponse> {
    return this.fetchData({ 
      dataType: 'fields', 
      organizationId 
    })
  }

  /**
   * Get equipment for an organization
   */
  async getEquipment(organizationId: string): Promise<JohnDeereDataResponse> {
    return this.fetchData({ 
      dataType: 'equipment', 
      organizationId 
    })
  }

  /**
   * Get field operations for an organization
   */
  async getOperations(
    organizationId: string, 
    filters?: { startDate?: string; endDate?: string; fieldId?: string }
  ): Promise<JohnDeereDataResponse> {
    return this.fetchData({ 
      dataType: 'operations', 
      organizationId,
      filters 
    })
  }

  /**
   * Get comprehensive farm data for an organization
   */
  async getComprehensiveData(organizationId: string): Promise<JohnDeereDataResponse> {
    return this.fetchData({ 
      dataType: 'comprehensive', 
      organizationId 
    })
  }
}

// Singleton instance
let johnDeereClient: JohnDeereClient | null = null

export function getJohnDeereClient(): JohnDeereClient {
  if (!johnDeereClient) {
    johnDeereClient = new JohnDeereClient()
  }
  return johnDeereClient
}

// Helper function to format John Deere data for display
export function formatJohnDeereData(data: any, dataType: string): string {
  if (!data) return 'No data available'

  try {
    switch (dataType) {
      case 'organizations':
        if (Array.isArray(data)) {
          return data.map(org => `• ${org.name} (${org.type})`).join('\n')
        }
        break

      case 'fields':
        if (Array.isArray(data)) {
          return data.map(field => 
            `• ${field.name}: ${field.area?.measurement || 'Unknown'} ${field.area?.unit || 'acres'}`
          ).join('\n')
        }
        break

      case 'equipment':
        if (Array.isArray(data)) {
          return data.map(equipment => 
            `• ${equipment.name} (${equipment.make} ${equipment.model})`
          ).join('\n')
        }
        break

      case 'operations':
        if (Array.isArray(data)) {
          return data.map(op => 
            `• ${op.operationType} - ${new Date(op.startTime).toLocaleDateString()}`
          ).join('\n')
        }
        break

      case 'comprehensive':
        if (data.summary) {
          return `Farm Summary:
• Total Fields: ${data.summary.totalFields}
• Total Equipment: ${data.summary.totalEquipment}
• Total Operations: ${data.summary.totalOperations}
• Total Acres: ${data.summary.totalAcres?.toFixed(1) || 0}`
        }
        break

      default:
        return JSON.stringify(data, null, 2)
    }
  } catch (error) {
    console.error('Error formatting John Deere data:', error)
  }

  return JSON.stringify(data, null, 2)
} 