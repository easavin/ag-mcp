// John Deere-specific types
export interface JohnDeereAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  sandboxMode: boolean
}

export interface JohnDeereTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope: string
}

export interface JohnDeereOrganization {
  id: string
  name: string
  type: string
  active: boolean
  attributes?: any
}

export interface JohnDeereField {
  id: string
  name: string
  archived: boolean
  organizationId: string
  boundary?: {
    type: string
    coordinates: number[][][]
  }
  area?: {
    value: number
    unit: string
  }
}

export interface JohnDeereEquipment {
  id: string
  name: string
  type: string
  subType?: string
  organizationId: string
  status?: string
  lastModified?: string
}

export interface JohnDeereOperation {
  id: string
  type: string
  status: string
  fieldId: string
  startTime?: string
  endTime?: string
  equipmentId?: string
  operationType?: string
}

export interface JohnDeereFile {
  id: string
  name: string
  type: string
  status: string
  uploadTime?: string
  size?: number
  organizationId: string
}

export interface JohnDeereToolArgs {
  organizationId?: string
  fieldId?: string
  fieldName?: string
  equipmentId?: string
  operationId?: string
  fileName?: string
  fileType?: string
  limit?: number
} 