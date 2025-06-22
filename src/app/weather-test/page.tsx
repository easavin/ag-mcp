'use client'

import { useState } from 'react'
import { Cloud, Thermometer, Droplets, Wind, Sun, Eye, Gauge } from 'lucide-react'

interface WeatherLocation {
  latitude: number
  longitude: number
  name?: string
  country?: string
  admin1?: string
  elevation?: number
}

interface AgricultureWeatherData {
  location: WeatherLocation
  current: {
    temperature: number
    humidity: number
    precipitation: number
    windSpeed: number
    windDirection: number
    pressure: number
    weatherCondition: string
    isDay: boolean
  }
  forecast: {
    daily: Array<{
      date: string
      maxTemp: number
      minTemp: number
      precipitation: number
      precipitationProbability: number
      windSpeed: number
      weatherCondition: string
      sunrise: string
      sunset: string
      uvIndex: number
    }>
  }
  agriculture: {
    soilTemperature: {
      surface: number
      depth6cm: number
      depth18cm: number
    }
    soilMoisture: {
      surface: number
      shallow: number
      medium: number
    }
    evapotranspiration: number
    uvIndex: number
    sprayConditions: {
      suitable: boolean
      windSpeed: number
      humidity: number
      temperature: number
      notes: string[]
    }
  }
}

export default function WeatherTestPage() {
  const [location, setLocation] = useState('Iowa City, IA')
  const [weatherData, setWeatherData] = useState<AgricultureWeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWeatherData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          days: 7,
          type: 'agricultural'
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch weather data')
      }

      setWeatherData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatTemperature = (temp: number) => `${Math.round(temp)}°C`
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Agricultural Weather Data Test
          </h1>
          <p className="text-gray-600">
            Test the Open-Meteo weather API integration for agricultural purposes
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location (e.g., Iowa City, IA)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchWeatherData}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Get Weather'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {weatherData && (
          <>
            {/* Current Conditions */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Current Conditions - {weatherData.location.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center space-x-3">
                  <Thermometer className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600">Temperature</p>
                    <p className="text-xl font-semibold">{formatTemperature(weatherData.current.temperature)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Droplets className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Humidity</p>
                    <p className="text-xl font-semibold">{Math.round(weatherData.current.humidity)}%</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Wind className="h-8 w-8 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Wind Speed</p>
                    <p className="text-xl font-semibold">{Math.round(weatherData.current.windSpeed)} km/h</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Cloud className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Condition</p>
                    <p className="text-xl font-semibold">{weatherData.current.weatherCondition}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agricultural Data */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Agricultural Conditions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Soil Temperature */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Soil Temperature</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Surface (0cm)</span>
                      <span className="font-medium">{formatTemperature(weatherData.agriculture.soilTemperature.surface)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">6cm depth</span>
                      <span className="font-medium">{formatTemperature(weatherData.agriculture.soilTemperature.depth6cm)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">18cm depth</span>
                      <span className="font-medium">{formatTemperature(weatherData.agriculture.soilTemperature.depth18cm)}</span>
                    </div>
                  </div>
                </div>

                {/* Soil Moisture */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Soil Moisture</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Surface (0-1cm)</span>
                      <span className="font-medium">{weatherData.agriculture.soilMoisture.surface.toFixed(1)} m³/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shallow (1-3cm)</span>
                      <span className="font-medium">{weatherData.agriculture.soilMoisture.shallow.toFixed(1)} m³/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Medium (3-9cm)</span>
                      <span className="font-medium">{weatherData.agriculture.soilMoisture.medium.toFixed(1)} m³/m³</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Agricultural Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="flex items-center space-x-3">
                  <Droplets className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Evapotranspiration</p>
                    <p className="text-xl font-semibold">{weatherData.agriculture.evapotranspiration.toFixed(2)} mm</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Sun className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600">UV Index</p>
                    <p className="text-xl font-semibold">{weatherData.agriculture.uvIndex.toFixed(1)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Gauge className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Pressure</p>
                    <p className="text-xl font-semibold">{Math.round(weatherData.current.pressure)} hPa</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Spray Conditions */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Spray Application Conditions
              </h2>
              <div className={`p-4 rounded-lg ${weatherData.agriculture.sprayConditions.suitable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${weatherData.agriculture.sprayConditions.suitable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`font-medium ${weatherData.agriculture.sprayConditions.suitable ? 'text-green-800' : 'text-red-800'}`}>
                    {weatherData.agriculture.sprayConditions.suitable ? 'Suitable for Spraying' : 'Not Suitable for Spraying'}
                  </span>
                </div>
                <div className="space-y-1">
                  {weatherData.agriculture.sprayConditions.notes.map((note, index) => (
                    <p key={index} className={`text-sm ${weatherData.agriculture.sprayConditions.suitable ? 'text-green-700' : 'text-red-700'}`}>
                      • {note}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* 7-Day Forecast */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                7-Day Forecast
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                {weatherData.forecast.daily.slice(0, 7).map((day, index) => (
                  <div key={index} className="text-center p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {index === 0 ? 'Today' : formatDate(day.date)}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">{day.weatherCondition}</p>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">{formatTemperature(day.maxTemp)}</p>
                      <p className="text-sm text-gray-500">{formatTemperature(day.minTemp)}</p>
                      <div className="flex items-center justify-center space-x-1 text-blue-600">
                        <Droplets className="h-4 w-4" />
                        <span className="text-sm">{Math.round(day.precipitationProbability)}%</span>
                      </div>
                      <div className="flex items-center justify-center space-x-1 text-gray-600">
                        <Wind className="h-4 w-4" />
                        <span className="text-sm">{Math.round(day.windSpeed)} km/h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 