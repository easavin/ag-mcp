import { NextRequest, NextResponse } from 'next/server'
import { euAgriAPI, MARKET_SECTORS } from '@/lib/eu-agri-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector') as keyof typeof MARKET_SECTORS
    const memberState = searchParams.get('memberState')
    const dataType = searchParams.get('dataType') || 'prices'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Validate sector parameter
    if (sector && !Object.values(MARKET_SECTORS).includes(sector as any)) {
      return NextResponse.json(
        { 
          error: 'Invalid sector', 
          availableSectors: Object.values(MARKET_SECTORS) 
        },
        { status: 400 }
      )
    }

    let result

    switch (dataType) {
      case 'prices':
        result = await euAgriAPI.getMarketPrices(
          sector as any || MARKET_SECTORS.CEREALS,
          {
            memberState: memberState as any,
            limit
          }
        )
        break

      case 'production':
        result = await euAgriAPI.getProductionData(
          sector as any || MARKET_SECTORS.CEREALS,
          {
            memberState: memberState as any,
            limit
          }
        )
        break

      case 'trade':
        result = await euAgriAPI.getTradeData(
          sector as any || MARKET_SECTORS.CEREALS,
          {
            memberState: memberState as any,
            limit
          }
        )
        break

      case 'dashboard':
        result = await euAgriAPI.getMarketDashboard(
          sector as any || MARKET_SECTORS.CEREALS
        )
        break

      default:
        return NextResponse.json(
          { 
            error: 'Invalid data type', 
            availableTypes: ['prices', 'production', 'trade', 'dashboard'] 
          },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('EU Agri API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch agricultural market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, sector, dataType, limit } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const result = await euAgriAPI.searchMarkets(query, {
      sector: sector ? MARKET_SECTORS[sector as keyof typeof MARKET_SECTORS] : undefined,
      dataType,
      limit
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('EU Agri search error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search agricultural markets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 