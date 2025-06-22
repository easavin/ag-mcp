export interface User {
  id: string
  email: string
  createdAt: Date
  johnDeereConnected: boolean
  auravantConnected: boolean
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  fileAttachments?: FileAttachment[]
  createdAt: Date
}

export interface FileAttachment {
  id: string
  filename: string
  fileType: string
  fileSize: number
  url: string
}

export interface JohnDeereToken {
  userId: string
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export interface JohnDeereOrganization {
  id: string
  name: string
  type: string
}

export interface JohnDeereField {
  id: string
  name: string
  organizationId: string
  boundaries: any // Will be updated to proper GeoJSON type after installation
  acres: number
}

export interface JohnDeereEquipment {
  id: string
  name: string
  type: string
  organizationId: string
  lastLocation?: {
    latitude: number
    longitude: number
    timestamp: Date
  }
}

export interface MCPResource {
  type: 'organization' | 'field' | 'equipment' | 'operation'
  id: string
  data: any
}

// Auravant Types
export interface AuravantToken {
  userId: string
  accessToken: string
  tokenType: string
  extensionId?: string
  expiresAt?: Date
}

export interface AuravantField {
  id: number
  name: string
  farm_id: number
  area: number
  boundary?: string // WKT format
}

export interface AuravantFarm {
  id: number
  name: string
  organization_id?: number
}

export interface AuravantLabour {
  uuid: string
  labour_type_id: number // 1=Application, 2=Harvest, 3=Sowing, 4=Other
  status: number // 1=Planned, 2=Executed, 3=Cancelled
  date: string
  field_id: number
  farm_id: number
  yeargroup: number
  surface: number // hectares
  rotation?: {
    crop_name: string
    crop_id: number
    uuid: string
  }
  inputs?: Array<{
    input_name: string
    dose: number
    unit: string
    input_uuid: string
  }>
  work_order_uuid?: string
}

export interface AuravantLabourResponse {
  data: AuravantLabour[]
  pagination: {
    total_page: number
    page: number
  }
}

export interface AuravantHerd {
  herd_uuid: string
  herd_name: string
  animal_count: number
  weight?: number
  weight_unit: string
  type_id: number
  paddock_id?: number
  field_id?: number
  farm_id?: number
}

export interface AuravantPaddock {
  paddock_id: number
  paddock_name?: string
  field_id?: number
  farm_id?: number
  boundary?: string // WKT format
  area?: number
}

export interface AuravantWorkOrder {
  uuid: string
  name: string
  yeargroup: number
  date: string
  notes?: string
  status: string
  labours?: Array<{
    uuid: string
    idLabourType: number
    fieldName: string
    farmName: string
  }>
  recomendations?: Array<{
    type: {
      id: number
      name: string
    }
    value: string
  }>
}

export interface AuravantInput {
  input_uuid: string
  input_name: string
  category?: string
  active_ingredient?: string
  concentration?: number
  unit?: string
}

// Standardized cross-platform types
export interface StandardizedFieldOperation {
  id: string
  type: 'application' | 'harvest' | 'sowing' | 'other'
  date: Date
  fieldId: string
  area?: number
  areaUnit: string
  crop?: string
  status: 'planned' | 'executed' | 'cancelled'
  dataSource: 'johndeere' | 'auravant'
  // Platform-specific fields
  yeargroup?: number
  workOrderUuid?: string
  herdUuid?: string
  paddockId?: number
}

export interface StandardizedHerd {
  id: string
  name: string
  animalCount: number
  weight?: number
  weightUnit: string
  category: string
  location?: {
    paddockId?: number
    fieldId?: number
    farmId?: number
  }
  dataSource: 'auravant'
}

export interface StandardizedWorkOrder {
  id: string
  name: string
  yeargroup: number
  date: Date
  notes?: string
  status: string
  recommendations?: Array<{
    type: string
    value: string
  }>
  labourOperations?: string[]
  dataSource: 'auravant'
}

// API Error types
export interface AuravantAPIError {
  code: number
  msg: string
}

export interface SyncResult {
  fields: number
  operations: number
  herds: number
  workOrders: number
  errors: string[]
} 