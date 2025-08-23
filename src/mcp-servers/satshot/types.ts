// Satshot MCP Server Types

export interface SatshotConfig {
  username: string
  password: string
  server: 'us' | 'ca' | 'mexico'
  baseUrl: string
}

export interface SatshotSession {
  sessionToken: string
  expiresAt?: Date
  server: string
  username: string
}

export interface SatshotToolArgs {
  [key: string]: any
}

// Map-related types
export interface SatshotMap {
  id: string
  name: string
  description?: string
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  layers?: SatshotLayer[]
  metadata?: Record<string, any>
}

export interface SatshotLayer {
  id: string
  name: string
  type: 'vector' | 'raster' | 'imagery' | 'analysis'
  visible: boolean
  opacity: number
  url?: string
  metadata?: Record<string, any>
}

// Field and Region types
export interface SatshotField {
  id: string
  name: string
  geometry: any // GeoJSON geometry
  area: number
  perimeter: number
  cropType?: string
  metadata?: Record<string, any>
}

export interface SatshotRegion {
  id: string
  name: string
  geometry: any
  type: 'field' | 'farm' | 'paddock' | 'boundary'
  area?: number
  metadata?: Record<string, any>
}

// Scene and Analysis types
export interface SatshotScene {
  id: string
  name: string
  acquisitionDate: string
  resolution: number
  bands: string[]
  cloudCover?: number
  url?: string
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  metadata?: Record<string, any>
}

export interface SatshotAnalysis {
  id: string
  type: 'ndvi' | 'evi' | 'change_detection' | 'stress_analysis' | 'yield_prediction'
  sceneId: string
  regionId?: string
  results: AnalysisResult[]
  statistics?: AnalysisStatistics
  metadata?: Record<string, any>
}

export interface AnalysisResult {
  id: string
  geometry?: any
  value: number
  classification?: string
  confidence?: number
  metadata?: Record<string, any>
}

export interface AnalysisStatistics {
  min: number
  max: number
  mean: number
  median?: number
  stdDev?: number
  count: number
  area?: number
  histogram?: { bin: number; count: number }[]
}

// Export and Report types
export interface SatshotExport {
  id: string
  type: 'shapefile' | 'kml' | 'geojson' | 'tiff' | 'pdf' | 'csv'
  name: string
  description?: string
  url?: string
  size?: number
  status: 'generating' | 'ready' | 'expired' | 'error'
  expiresAt?: string
  metadata?: Record<string, any>
}

export interface SatshotReport {
  id: string
  name: string
  type: 'field_analysis' | 'crop_health' | 'yield_prediction' | 'change_detection'
  regions: string[]
  scenes: string[]
  analyses: string[]
  format: 'pdf' | 'html' | 'json'
  url?: string
  status: 'generating' | 'ready' | 'expired' | 'error'
  metadata?: Record<string, any>
}

// Notification and Monitoring types
export interface SatshotNotification {
  id: string
  type: 'analysis_complete' | 'change_detected' | 'alert' | 'reminder'
  regionId?: string
  sceneId?: string
  analysisId?: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  read: boolean
  createdAt: string
  metadata?: Record<string, any>
}

// Photo and Field Data types
export interface SatshotGeoPhoto {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  altitude?: number
  heading?: number
  timestamp: string
  url?: string
  thumbnailUrl?: string
  tags?: string[]
  metadata?: Record<string, any>
}

export interface SatshotFieldData {
  id: string
  regionId: string
  type: 'soil_sample' | 'crop_observation' | 'equipment_reading' | 'manual_entry'
  latitude: number
  longitude: number
  timestamp: string
  data: Record<string, any>
  photos?: string[]
  metadata?: Record<string, any>
}

// API Response types
export interface SatshotAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  metadata?: Record<string, any>
}

// XML-RPC specific types
export interface XMLRPCError {
  faultCode: number
  faultString: string
}

export interface XMLRPCResponse<T = any> {
  result?: T
  error?: XMLRPCError
}

// Server configuration
export const SATSHOT_SERVERS = {
  us: 'https://us.satshot.com/xmlrpc.php',
  ca: 'https://ca.satshot.com/xmlrpc.php',
  mexico: 'https://mexico.satshot.com/xmlrpc.php'
} as const

export type SatshotServer = keyof typeof SATSHOT_SERVERS
