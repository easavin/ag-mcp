export interface User {
  id: string
  email: string
  createdAt: Date
  johnDeereConnected: boolean
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