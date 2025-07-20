// USDA-specific types
export interface USDAMarketData {
  commodity: string
  grade?: string
  region: string
  market: string
  price: number
  unit: string
  date: string
  trend?: 'up' | 'down' | 'stable'
  changePercent?: number
}

export interface USDAProductionData {
  crop: string
  region: string
  year: number
  production: number
  unit: string
  area: number
  areaUnit: string
  yield: number
  yieldUnit: string
}

export interface USDATradeData {
  commodity: string
  country: string
  type: 'export' | 'import'
  quantity: number
  unit: string
  value: number
  currency: string
  period: string
}

export interface USDAToolArgs {
  category?: string
  region?: string
  commodity?: string
  country?: string
  year?: number
  startDate?: string
  endDate?: string
  limit?: number
  crop?: string
  type?: 'export' | 'import' | 'both'
} 