// USDA Food Data Central API Types
export interface USDAFoodItem {
  fdcId: number
  description: string
  dataType: 'Foundation' | 'SR Legacy' | 'Survey (FNDDS)' | 'Experimental' | 'Branded'
  publicationDate: string
  brandOwner?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodNutrients: USDANutrient[]
  foodCategory?: {
    id: number
    code: string
    description: string
  }
}

export interface USDANutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
  rank?: number
}

export interface USDASearchResult {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDAFoodItem[]
}

export interface USDAMarketData {
  commodity: string
  category: 'grain' | 'livestock' | 'dairy' | 'poultry' | 'fruits' | 'vegetables' | 'specialty'
  region: 'US' | 'CA' | 'MX' | 'Midwest' | 'Southeast' | 'Northeast' | 'Southwest' | 'West'
  price: number
  currency: 'USD' | 'CAD' | 'MXN'
  unit: string
  date: string
  marketType: 'wholesale' | 'retail' | 'farm_gate' | 'futures'
  quality?: string
}

export interface USDAProductionData {
  commodity: string
  region: string
  production: number
  unit: string
  year: number
  acreage?: number
  yield?: number
  category: string
}

export interface USDATradeData {
  commodity: string
  country: string
  tradeType: 'export' | 'import'
  value: number
  quantity: number
  unit: string
  date: string
  currency: 'USD'
}

// USDA Market Categories
export const USDA_MARKET_CATEGORIES = {
  GRAIN: 'grain',
  LIVESTOCK: 'livestock', 
  DAIRY: 'dairy',
  POULTRY: 'poultry',
  FRUITS: 'fruits',
  VEGETABLES: 'vegetables',
  SPECIALTY: 'specialty'
} as const

export class USDAApi {
  private baseUrl = 'https://api.nal.usda.gov/fdc/v1'
  private apiKey = process.env.USDA_API_KEY || 'DEMO_KEY'

  // Market Data Methods (Mock Implementation)
  async getMarketPrices(category: string, options: {
    region?: string
    limit?: number
  } = {}): Promise<{ success: boolean; data?: USDAMarketData[]; error?: string }> {
    return this.generateMockMarketPrices(category, options)
  }

  async getProductionData(category: string, options: {
    region?: string
    year?: number
    limit?: number
  } = {}): Promise<{ success: boolean; data?: USDAProductionData[]; error?: string }> {
    return this.generateMockProductionData(category, options)
  }

  async getTradeData(category: string, options: {
    tradeType?: 'export' | 'import'
    country?: string
    limit?: number
  } = {}): Promise<{ success: boolean; data?: USDATradeData[]; error?: string }> {
    return this.generateMockTradeData(category, options)
  }

  async getMarketDashboard(category: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.generateMockMarketDashboard(category)
  }

  // Mock Data Generators
  private generateMockMarketPrices(category: string, options: any): { success: boolean; data: USDAMarketData[] } {
    const basePrice = Math.random() * 200 + 100
    const regions = ['US', 'Midwest', 'Southeast', 'Northeast', 'Southwest', 'West']
    
    const mockData: USDAMarketData[] = regions.map(region => ({
      commodity: this.getCommodityName(category),
      category: category as any,
      region: region as any,
      price: parseFloat((basePrice + (Math.random() - 0.5) * 50).toFixed(2)),
      currency: 'USD',
      unit: this.getUnit(category),
      date: new Date().toISOString().split('T')[0],
      marketType: 'wholesale' as const,
      quality: 'No. 2 Grade'
    }))

    return { success: true, data: mockData.slice(0, options.limit || 10) }
  }

  private generateMockProductionData(category: string, options: any): { success: boolean; data: USDAProductionData[] } {
    const currentYear = new Date().getFullYear()
    const years = [currentYear - 2, currentYear - 1, currentYear]
    
    const mockData: USDAProductionData[] = years.map(year => ({
      commodity: this.getCommodityName(category),
      region: options.region || 'US',
      production: Math.floor(Math.random() * 50000000 + 10000000),
      unit: this.getProductionUnit(category),
      year,
      acreage: Math.floor(Math.random() * 5000000 + 1000000),
      yield: parseFloat((Math.random() * 100 + 50).toFixed(1)),
      category
    }))

    return { success: true, data: mockData }
  }

  private generateMockTradeData(category: string, options: any): { success: boolean; data: USDATradeData[] } {
    const countries = ['Canada', 'Mexico', 'China', 'Japan', 'South Korea']
    const tradeTypes: ('export' | 'import')[] = ['export', 'import']
    
    const mockData: USDATradeData[] = []
    
    countries.forEach(country => {
      tradeTypes.forEach(tradeType => {
        mockData.push({
          commodity: this.getCommodityName(category),
          country,
          tradeType,
          value: Math.floor(Math.random() * 500000000 + 50000000),
          quantity: Math.floor(Math.random() * 10000000 + 1000000),
          unit: this.getUnit(category),
          date: new Date().toISOString().split('T')[0],
          currency: 'USD'
        })
      })
    })

    return { success: true, data: mockData.slice(0, options.limit || 10) }
  }

  private generateMockMarketDashboard(category: string): { success: boolean; data: any } {
    return {
      success: true,
      data: {
        category,
        overview: {
          currentPrice: parseFloat((Math.random() * 200 + 100).toFixed(2)),
          priceChange: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
          priceChangePercent: parseFloat(((Math.random() - 0.5) * 10).toFixed(1)),
          volume: Math.floor(Math.random() * 1000000 + 100000),
          marketCap: Math.floor(Math.random() * 10000000000 + 1000000000)
        },
        keyIndicators: {
          production: Math.floor(Math.random() * 50000000 + 10000000),
          consumption: Math.floor(Math.random() * 45000000 + 8000000),
          exports: Math.floor(Math.random() * 15000000 + 2000000),
          imports: Math.floor(Math.random() * 10000000 + 1000000),
          stocksToUse: parseFloat((Math.random() * 30 + 10).toFixed(1))
        },
        regionalPrices: [
          { region: 'Midwest', price: parseFloat((Math.random() * 200 + 100).toFixed(2)) },
          { region: 'Southeast', price: parseFloat((Math.random() * 200 + 100).toFixed(2)) },
          { region: 'Northeast', price: parseFloat((Math.random() * 200 + 100).toFixed(2)) },
          { region: 'West', price: parseFloat((Math.random() * 200 + 100).toFixed(2)) }
        ],
        lastUpdated: new Date().toISOString()
      }
    }
  }

  private getCommodityName(category: string): string {
    const commodityMap: { [key: string]: string } = {
      grain: 'Wheat',
      livestock: 'Cattle',
      dairy: 'Milk',
      poultry: 'Broilers',
      fruits: 'Apples',
      vegetables: 'Corn',
      specialty: 'Soybeans'
    }
    return commodityMap[category] || 'Agricultural Product'
  }

  private getUnit(category: string): string {
    const unitMap: { [key: string]: string } = {
      grain: 'bushel',
      livestock: 'cwt',
      dairy: 'cwt',
      poultry: 'lb',
      fruits: 'lb',
      vegetables: 'bushel',
      specialty: 'bushel'
    }
    return unitMap[category] || 'unit'
  }

  private getProductionUnit(category: string): string {
    const unitMap: { [key: string]: string } = {
      grain: 'million bushels',
      livestock: 'million head',
      dairy: 'billion lbs',
      poultry: 'billion lbs',
      fruits: 'million lbs',
      vegetables: 'million bushels',
      specialty: 'million bushels'
    }
    return unitMap[category] || 'million units'
  }
}

// Export singleton instance
export const usdaAPI = new USDAApi()
