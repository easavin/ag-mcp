import { NextRequest, NextResponse } from 'next/server'
import { getWeatherAPIClient } from '@/lib/weather-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')
    const days = searchParams.get('days') || '7'
    const type = searchParams.get('type') || 'agricultural'

    if (!latitude || !longitude) {
      return NextResponse.json({ 
        error: 'Latitude and longitude are required' 
      }, { status: 400 })
    }

    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)
    const forecastDays = parseInt(days)

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ 
        error: 'Invalid latitude or longitude values' 
      }, { status: 400 })
    }

    const weatherClient = getWeatherAPIClient()

    switch (type) {
      case 'current':
        const currentWeather = await weatherClient.getCurrentWeather(lat, lon)
        return NextResponse.json({
          success: true,
          data: currentWeather,
          timestamp: new Date().toISOString()
        })

      case 'agricultural':
        const agricultureData = await weatherClient.getAgriculturalWeather(lat, lon, forecastDays)
        return NextResponse.json({
          success: true,
          data: agricultureData,
          timestamp: new Date().toISOString()
        })

      case 'operations':
        const operationsData = await weatherClient.getFieldOperationWeather(lat, lon, forecastDays)
        return NextResponse.json({
          success: true,
          data: operationsData,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({ 
          error: 'Invalid type. Use: current, agricultural, or operations' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { location, days = 7, type = 'agricultural' } = body

    if (!location) {
      return NextResponse.json({ 
        error: 'Location is required' 
      }, { status: 400 })
    }

    const weatherClient = getWeatherAPIClient()

    // If location is a string, search for it
    if (typeof location === 'string') {
      const locations = await weatherClient.searchLocations(location, 1)
      if (locations.length === 0) {
        return NextResponse.json({ 
          error: 'Location not found' 
        }, { status: 404 })
      }

      const { latitude, longitude } = locations[0]
      const weatherData = await weatherClient.getAgriculturalWeather(latitude, longitude, days)
      
      return NextResponse.json({
        success: true,
        data: {
          ...weatherData,
          location: locations[0]
        },
        location: locations[0],
        timestamp: new Date().toISOString()
      })
    }

    // If location has coordinates
    if (location.latitude && location.longitude) {
      const weatherData = await weatherClient.getAgriculturalWeather(
        location.latitude, 
        location.longitude, 
        days
      )
      
      return NextResponse.json({
        success: true,
        data: weatherData,
        location,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ 
      error: 'Invalid location format. Provide either a string or {latitude, longitude}' 
    }, { status: 400 })

  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 