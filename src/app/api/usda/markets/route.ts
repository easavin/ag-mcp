import { NextRequest, NextResponse } from 'next/server'
import { usdaAPI, USDA_MARKET_CATEGORIES } from '@/lib/usda-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const dataType = searchParams.get('dataType') || 'prices'
    const region = searchParams.get('region')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Validate category parameter
    if (category && !Object.values(USDA_MARKET_CATEGORIES).includes(category as any)) {
      return NextResponse.json(
        { 
          error: 'Invalid category', 
          availableCategories: Object.values(USDA_MARKET_CATEGORIES) 
        },
        { status: 400 }
      )
    }

    let result

    switch (dataType) {
      case 'prices':
        result = await usdaAPI.getMarketPrices(
          category || USDA_MARKET_CATEGORIES.GRAIN,
          {
            region: region as any,
            limit
          }
        )
        break

      case 'production':
        result = await usdaAPI.getProductionData(
          category || USDA_MARKET_CATEGORIES.GRAIN,
          {
            region: region as any,
            limit
          }
        )
        break

      case 'trade':
        result = await usdaAPI.getTradeData(
          category || USDA_MARKET_CATEGORIES.GRAIN,
          {
            limit
          }
        )
        break

      case 'dashboard':
        result = await usdaAPI.getMarketDashboard(
          category || USDA_MARKET_CATEGORIES.GRAIN
        )
        break

      default:
        return NextResponse.json(
          { 
            error: 'Invalid dataType', 
            availableTypes: ['prices', 'production', 'trade', 'dashboard'] 
          },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch USDA data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        category: category || 'grain',
        dataType,
        region: region || 'all',
        limit,
        source: 'USDA',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('USDA markets API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, category, dataType = 'prices', limit = 20 } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Simple search implementation - match query against commodity names
    const searchTerms = query.toLowerCase()
    let searchCategory = category

    // Auto-detect category from search terms
    if (!searchCategory) {
      if (searchTerms.includes('wheat') || searchTerms.includes('corn') || searchTerms.includes('grain')) {
        searchCategory = 'grain'
      } else if (searchTerms.includes('cattle') || searchTerms.includes('beef') || searchTerms.includes('livestock')) {
        searchCategory = 'livestock'
      } else if (searchTerms.includes('milk') || searchTerms.includes('dairy')) {
        searchCategory = 'dairy'
      } else if (searchTerms.includes('chicken') || searchTerms.includes('poultry')) {
        searchCategory = 'poultry'
      } else if (searchTerms.includes('apple') || searchTerms.includes('fruit')) {
        searchCategory = 'fruits'
      } else if (searchTerms.includes('vegetable')) {
        searchCategory = 'vegetables'
      } else {
        searchCategory = 'grain' // default
      }
    }

    let result

    switch (dataType) {
      case 'prices':
        result = await usdaAPI.getMarketPrices(searchCategory, { limit })
        break
      case 'production':
        result = await usdaAPI.getProductionData(searchCategory, { limit })
        break
      case 'trade':
        result = await usdaAPI.getTradeData(searchCategory, { limit })
        break
      default:
        result = await usdaAPI.getMarketPrices(searchCategory, { limit })
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to search USDA data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      query,
      detectedCategory: searchCategory,
      data: result.data,
      metadata: {
        dataType,
        limit,
        source: 'USDA',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('USDA markets search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 