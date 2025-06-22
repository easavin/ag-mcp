import { NextRequest, NextResponse } from 'next/server'
import { getWeatherAPIClient } from '@/lib/weather-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const count = searchParams.get('count') || '10'

    if (!query) {
      return NextResponse.json({ 
        error: 'Search query is required' 
      }, { status: 400 })
    }

    const weatherClient = getWeatherAPIClient()
    const locations = await weatherClient.searchLocations(query, parseInt(count))

    return NextResponse.json({
      success: true,
      data: locations,
      count: locations.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Location search error:', error)
    return NextResponse.json({ 
      error: 'Failed to search locations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 