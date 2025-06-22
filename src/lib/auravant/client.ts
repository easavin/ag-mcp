import { 
  AuravantField, 
  AuravantFarm, 
  AuravantLabour, 
  AuravantLabourResponse,
  AuravantHerd, 
  AuravantPaddock, 
  AuravantWorkOrder,
  AuravantInput
} from '@/types'

export class AuravantAPIError extends Error {
  constructor(public code: number, public message: string) {
    super(`Auravant API Error ${code}: ${message}`)
    this.name = 'AuravantAPIError'
  }
}

export class AuravantClient {
  private baseUrl: string
  private token: string

  constructor(token: string) {
    this.baseUrl = process.env.AURAVANT_API_BASE_URL || 'https://api.auravant.com/api'
    this.token = token
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle Auravant-specific error codes
      if (data.code !== undefined && data.code !== 0) {
        throw new AuravantAPIError(data.code, data.msg || 'Unknown error')
      }

      return data
    } catch (error) {
      if (error instanceof AuravantAPIError) {
        throw error
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Auravant API request failed: ${errorMessage}`)
    }
  }

  // Authentication test
  async testConnection(): Promise<boolean> {
    try {
      await this.getFields()
      return true
    } catch (error) {
      console.error('Auravant connection test failed:', error)
      return false
    }
  }

  // Field & Farm Management
  async getFields(): Promise<AuravantField[]> {
    const response = await this.request<{ data?: AuravantField[] }>('/fields')
    return response.data || response as AuravantField[]
  }

  async getField(fieldId: number): Promise<AuravantField> {
    return this.request<AuravantField>(`/fields/${fieldId}`)
  }

  async getFarms(): Promise<AuravantFarm[]> {
    const response = await this.request<{ data?: AuravantFarm[] }>('/farms')
    return response.data || response as AuravantFarm[]
  }

  async getFarm(farmId: number): Promise<AuravantFarm> {
    return this.request<AuravantFarm>(`/farms/${farmId}`)
  }

  // Labour Operations
  async getLabourOperations(params: {
    yeargroup: number
    page?: number
    page_size?: number
    farm_id?: number
    field_id?: number
    date_from?: string
    date_to?: string
    status?: number
  }): Promise<AuravantLabourResponse> {
    const searchParams = new URLSearchParams()
    
    // Add required parameters
    searchParams.append('yeargroup', params.yeargroup.toString())
    
    // Add optional parameters
    if (params.page !== undefined) searchParams.append('page', params.page.toString())
    if (params.page_size !== undefined) searchParams.append('page_size', params.page_size.toString())
    if (params.farm_id !== undefined) searchParams.append('farm_id', params.farm_id.toString())
    if (params.field_id !== undefined) searchParams.append('field_id', params.field_id.toString())
    if (params.date_from) searchParams.append('date_from', params.date_from)
    if (params.date_to) searchParams.append('date_to', params.date_to)
    if (params.status !== undefined) searchParams.append('status', params.status.toString())

    return this.request<AuravantLabourResponse>(`/activities/labour?${searchParams.toString()}`)
  }

  // Create labour operations
  async createSowing(data: {
    field_id: number
    yeargroup: number
    date: string
    surface: number
    crop_id: number
    variety_id?: number
    inputs?: Array<{
      input_uuid: string
      dose: number
      unit: string
    }>
  }): Promise<{ uuid: string }> {
    return this.request<{ uuid: string }>('/registro_campo/siembra', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createHarvest(data: {
    field_id: number
    yeargroup: number
    date: string
    surface: number
    crop_id: number
    yield?: number
    humidity?: number
  }): Promise<{ uuid: string }> {
    return this.request<{ uuid: string }>('/registro_campo/cosecha', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createApplication(data: {
    field_id: number
    yeargroup: number
    date: string
    surface: number
    inputs: Array<{
      input_uuid: string
      dose: number
      unit: string
    }>
  }): Promise<{ uuid: string }> {
    return this.request<{ uuid: string }>('/registro_campo/aplicacion', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createOtherLabour(data: {
    field_id: number
    yeargroup: number
    date: string
    surface: number
    labour_name: string
    description?: string
  }): Promise<{ uuid: string }> {
    return this.request<{ uuid: string }>('/registro_campo/otroslabores', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Livestock Management (Unique to Auravant)
  async getHerds(): Promise<AuravantHerd[]> {
    const response = await this.request<{ data?: AuravantHerd[] }>('/livestock/herd')
    return response.data || response as AuravantHerd[]
  }

  async createHerd(data: {
    herd_name: string
    animal_count: number
    weight?: number
    weight_unit?: string
    type_id: number
    paddock_id?: number
    field_id?: number
    farm_id?: number
  }): Promise<{ herd_uuid: string }> {
    return this.request<{ herd_uuid: string }>('/livestock/herd', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getPaddocks(): Promise<AuravantPaddock[]> {
    const response = await this.request<{ data?: AuravantPaddock[] }>('/livestock/paddock')
    return response.data || response as AuravantPaddock[]
  }

  async createPaddock(data: {
    paddock_name: string
    field_id?: number
    farm_id?: number
    boundary?: string // WKT format
    area?: number
  }): Promise<{ paddock_id: number }> {
    return this.request<{ paddock_id: number }>('/livestock/paddock', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Livestock transactions
  async moveHerdToPaddock(data: {
    herd_uuid: string
    paddock_id: number
    date: string
    notes?: string
  }): Promise<void> {
    await this.request<void>('/livestock/transaction/paddock', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async recordLivestockExit(data: {
    herd_uuid: string
    animal_count: number
    weight?: number
    exit_type: string // 'sale' | 'death' | 'transfer'
    date: string
    notes?: string
    price?: number
  }): Promise<void> {
    await this.request<void>('/livestock/transaction/exit', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Work Orders (Unique to Auravant)
  async getWorkOrders(params?: {
    yeargroup?: number
    status?: string
    page?: number
    page_size?: number
  }): Promise<AuravantWorkOrder[]> {
    const searchParams = new URLSearchParams()
    
    if (params?.yeargroup !== undefined) searchParams.append('yeargroup', params.yeargroup.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page !== undefined) searchParams.append('page', params.page.toString())
    if (params?.page_size !== undefined) searchParams.append('page_size', params.page_size.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/work_orders?${queryString}` : '/work_orders'
    
    const response = await this.request<{ data?: AuravantWorkOrder[] }>(endpoint)
    return response.data || response as AuravantWorkOrder[]
  }

  async createWorkOrder(data: {
    name: string
    yeargroup: number
    date: string
    notes?: string
    labours?: Array<{
      field_id: number
      labour_type_id: number
      date: string
      surface: number
    }>
  }): Promise<{ uuid: string }> {
    return this.request<{ uuid: string }>('/work_orders', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getWorkOrderRecommendationTypes(): Promise<Array<{ id: number; name: string }>> {
    const response = await this.request<{ data?: Array<{ id: number; name: string }> }>('/work_orders/recomendations/types')
    return response.data || response as Array<{ id: number; name: string }>
  }

  async downloadWorkOrder(uuid: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/work_orders/${uuid}/download?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download work order: ${response.statusText}`)
    }

    return response.blob()
  }

  // Inputs & Supplies
  async getInputs(params?: {
    category?: string
    active?: boolean
    search?: string
  }): Promise<AuravantInput[]> {
    const searchParams = new URLSearchParams()
    
    if (params?.category) searchParams.append('category', params.category)
    if (params?.active !== undefined) searchParams.append('active', params.active.toString())
    if (params?.search) searchParams.append('search', params.search)

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/registro_campo/insumos?${queryString}` : '/registro_campo/insumos'
    
    const response = await this.request<{ data?: AuravantInput[] }>(endpoint)
    return response.data || response as AuravantInput[]
  }

  async createInput(data: {
    input_name: string
    category?: string
    active_ingredient?: string
    concentration?: number
    unit?: string
  }): Promise<{ input_uuid: string }> {
    return this.request<{ input_uuid: string }>('/registro_campo/insumo', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateInput(inputUuid: string, data: {
    input_name?: string
    category?: string
    active_ingredient?: string
    concentration?: number
    unit?: string
  }): Promise<void> {
    await this.request<void>(`/registro_campo/insumo/${inputUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  async deleteInput(inputUuid: string): Promise<void> {
    await this.request<void>(`/registro_campo/insumo/${inputUuid}`, {
      method: 'DELETE'
    })
  }

  // Crops & Varieties
  async getCrops(): Promise<Array<{ id: number; name: string }>> {
    const response = await this.request<{ data?: Array<{ id: number; name: string }> }>('/getcultivos')
    return response.data || response as Array<{ id: number; name: string }>
  }

  async getSowings(params?: {
    yeargroup?: number
    field_id?: number
    crop_id?: number
  }): Promise<Array<{
    uuid: string
    crop_name: string
    variety_name?: string
    field_name: string
    date: string
    surface: number
  }>> {
    const searchParams = new URLSearchParams()
    
    if (params?.yeargroup !== undefined) searchParams.append('yeargroup', params.yeargroup.toString())
    if (params?.field_id !== undefined) searchParams.append('field_id', params.field_id.toString())
    if (params?.crop_id !== undefined) searchParams.append('crop_id', params.crop_id.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/siembras?${queryString}` : '/siembras'
    
    const response = await this.request<{ data?: Array<any> }>(endpoint)
    return response.data || response as Array<any>
  }
} 