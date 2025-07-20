// Weather-specific types
export interface WeatherLocation {
  latitude: number
  longitude: number
  name?: string
  country?: string
}

export interface WeatherData {
  current?: {
    temperature: number
    humidity: number
    windSpeed: number
    windDirection: number
    precipitation: number
    uvIndex: number
    visibility: number
  }
  forecast?: {
    daily: Array<{
      date: string
      temperatureMax: number
      temperatureMin: number
      precipitation: number
      humidity: number
      windSpeed: number
      uvIndex: number
    }>
  }
  agriculture?: {
    soilTemperature: number
    soilMoisture: number
    evapotranspiration: number
    sprayConditions: {
      suitable: boolean
      factors: string[]
    }
  }
}

export interface WeatherToolArgs {
  latitude?: number
  longitude?: number
  location?: string
  days?: number
} 