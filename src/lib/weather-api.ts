import axios, { AxiosInstance } from 'axios'

// Open-Meteo API Configuration
const OPEN_METEO_CONFIG = {
  baseURL: 'https://api.open-meteo.com/v1',
  geocodingURL: 'https://geocoding-api.open-meteo.com/v1'
}

// Type definitions for weather data
export interface WeatherLocation {
  latitude: number
  longitude: number
  name?: string
  country?: string
  admin1?: string
  admin2?: string
  elevation?: number
}

export interface CurrentWeather {
  time: string
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  is_day: number
  precipitation: number
  rain: number
  showers: number
  snowfall: number
  weather_code: number
  cloud_cover: number
  surface_pressure: number
  wind_speed_10m: number
  wind_direction_10m: number
  wind_gusts_10m: number
}

export interface HourlyWeather {
  time: string[]
  temperature_2m: number[]
  relative_humidity_2m: number[]
  precipitation_probability: number[]
  precipitation: number[]
  rain: number[]
  weather_code: number[]
  surface_pressure: number[]
  cloud_cover: number[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  wind_gusts_10m: number[]
  soil_temperature_0cm?: number[]
  soil_temperature_6cm?: number[]
  soil_temperature_18cm?: number[]
  soil_moisture_0_1cm?: number[]
  soil_moisture_1_3cm?: number[]
  soil_moisture_3_9cm?: number[]
  uv_index?: number[]
  et0_fao_evapotranspiration?: number[]
}

export interface DailyWeather {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  apparent_temperature_max: number[]
  apparent_temperature_min: number[]
  sunrise: string[]
  sunset: string[]
  daylight_duration: number[]
  sunshine_duration: number[]
  uv_index_max: number[]
  precipitation_sum: number[]
  rain_sum: number[]
  showers_sum: number[]
  snowfall_sum: number[]
  precipitation_hours: number[]
  precipitation_probability_max: number[]
  wind_speed_10m_max: number[]
  wind_gusts_10m_max: number[]
  wind_direction_10m_dominant: number[]
  et0_fao_evapotranspiration?: number[]
}

export interface WeatherResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  current?: CurrentWeather
  hourly?: HourlyWeather
  daily?: DailyWeather
  current_units?: Record<string, string>
  hourly_units?: Record<string, string>
  daily_units?: Record<string, string>
}

export interface AgricultureWeatherData {
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
    hourly: Array<{
      time: string
      temperature: number
      precipitation: number
      precipitationProbability: number
      windSpeed: number
      humidity: number
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

// Weather condition mapping from WMO codes
const WEATHER_CONDITIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
}

export class WeatherAPIClient {
  private axiosInstance: AxiosInstance
  private geocodingInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: OPEN_METEO_CONFIG.baseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000
    })

    this.geocodingInstance = axios.create({
      baseURL: OPEN_METEO_CONFIG.geocodingURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000
    })
  }

  /**
   * Search for locations by name (geocoding)
   */
  async searchLocations(query: string, count: number = 10): Promise<WeatherLocation[]> {
    try {
      const response = await this.geocodingInstance.get('/search', {
        params: {
          name: query,
          count,
          language: 'en',
          format: 'json'
        }
      })

      return response.data.results?.map((result: any) => ({
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
        country: result.country,
        admin1: result.admin1,
        admin2: result.admin2,
        elevation: result.elevation
      })) || []
    } catch (error) {
      console.error('Error searching locations:', error)
      throw new Error('Failed to search locations')
    }
  }

  /**
   * Get comprehensive agricultural weather data
   */
  async getAgriculturalWeather(
    latitude: number,
    longitude: number,
    forecastDays: number = 7
  ): Promise<AgricultureWeatherData> {
    try {
      const response = await this.axiosInstance.get('/forecast', {
        params: {
          latitude,
          longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'rain',
            'showers',
            'snowfall',
            'weather_code',
            'cloud_cover',
            'surface_pressure',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m'
          ].join(','),
          hourly: [
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation_probability',
            'precipitation',
            'rain',
            'weather_code',
            'surface_pressure',
            'cloud_cover',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m',
            'soil_temperature_0cm',
            'soil_temperature_6cm',
            'soil_temperature_18cm',
            'soil_moisture_0_1cm',
            'soil_moisture_1_3cm',
            'soil_moisture_3_9cm',
            'uv_index',
            'et0_fao_evapotranspiration'
          ].join(','),
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'sunrise',
            'sunset',
            'daylight_duration',
            'sunshine_duration',
            'uv_index_max',
            'precipitation_sum',
            'rain_sum',
            'showers_sum',
            'snowfall_sum',
            'precipitation_hours',
            'precipitation_probability_max',
            'wind_speed_10m_max',
            'wind_gusts_10m_max',
            'wind_direction_10m_dominant',
            'et0_fao_evapotranspiration'
          ].join(','),
          forecast_days: forecastDays,
          timezone: 'auto'
        }
      })

      const data: WeatherResponse = response.data
      return this.transformToAgriculturalData(data)
    } catch (error) {
      console.error('Error fetching agricultural weather:', error)
      throw new Error('Failed to fetch weather data')
    }
  }

  /**
   * Get current weather only (lighter request)
   */
  async getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
    try {
      const response = await this.axiosInstance.get('/forecast', {
        params: {
          latitude,
          longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'rain',
            'showers',
            'snowfall',
            'weather_code',
            'cloud_cover',
            'surface_pressure',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m'
          ].join(','),
          timezone: 'auto'
        }
      })

      return response.data.current
    } catch (error) {
      console.error('Error fetching current weather:', error)
      throw new Error('Failed to fetch current weather')
    }
  }

  /**
   * Get weather forecast for field operations
   */
  async getFieldOperationWeather(
    latitude: number,
    longitude: number,
    days: number = 3
  ): Promise<{
    current: CurrentWeather
    forecast: DailyWeather
    sprayingConditions: Array<{
      date: string
      suitable: boolean
      windSpeed: number
      humidity: number
      temperature: number
      notes: string[]
    }>
  }> {
    const data = await this.getAgriculturalWeather(latitude, longitude, days)
    
    return {
      current: {
        time: new Date().toISOString(),
        temperature_2m: data.current.temperature,
        relative_humidity_2m: data.current.humidity,
        apparent_temperature: data.current.temperature,
        is_day: data.current.isDay ? 1 : 0,
        precipitation: data.current.precipitation,
        rain: data.current.precipitation,
        showers: 0,
        snowfall: 0,
        weather_code: this.getWeatherCode(data.current.weatherCondition),
        cloud_cover: 0,
        surface_pressure: data.current.pressure,
        wind_speed_10m: data.current.windSpeed,
        wind_direction_10m: data.current.windDirection,
        wind_gusts_10m: data.current.windSpeed * 1.3
      },
      forecast: {
        time: data.forecast.daily.map(d => d.date),
        weather_code: data.forecast.daily.map(d => this.getWeatherCode(d.weatherCondition)),
        temperature_2m_max: data.forecast.daily.map(d => d.maxTemp),
        temperature_2m_min: data.forecast.daily.map(d => d.minTemp),
        apparent_temperature_max: data.forecast.daily.map(d => d.maxTemp),
        apparent_temperature_min: data.forecast.daily.map(d => d.minTemp),
        sunrise: data.forecast.daily.map(d => d.sunrise),
        sunset: data.forecast.daily.map(d => d.sunset),
        daylight_duration: [],
        sunshine_duration: [],
        uv_index_max: data.forecast.daily.map(d => d.uvIndex),
        precipitation_sum: data.forecast.daily.map(d => d.precipitation),
        rain_sum: data.forecast.daily.map(d => d.precipitation),
        showers_sum: [],
        snowfall_sum: [],
        precipitation_hours: [],
        precipitation_probability_max: data.forecast.daily.map(d => d.precipitationProbability),
        wind_speed_10m_max: data.forecast.daily.map(d => d.windSpeed),
        wind_gusts_10m_max: data.forecast.daily.map(d => d.windSpeed * 1.3),
        wind_direction_10m_dominant: [],
        et0_fao_evapotranspiration: [data.agriculture.evapotranspiration]
      },
      sprayingConditions: data.forecast.daily.map(day => ({
        date: day.date,
        suitable: this.evaluateSprayConditions(day.windSpeed, 50, day.maxTemp).suitable,
        windSpeed: day.windSpeed,
        humidity: 50, // approximation
        temperature: day.maxTemp,
        notes: this.evaluateSprayConditions(day.windSpeed, 50, day.maxTemp).notes
      }))
    }
  }

  /**
   * Transform raw API response to agricultural data format
   */
  private transformToAgriculturalData(data: WeatherResponse): AgricultureWeatherData {
    const sprayConditions = this.evaluateSprayConditions(
      data.current?.wind_speed_10m || 0,
      data.current?.relative_humidity_2m || 0,
      data.current?.temperature_2m || 0
    )

    return {
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation
      },
      current: {
        temperature: data.current?.temperature_2m || 0,
        humidity: data.current?.relative_humidity_2m || 0,
        precipitation: data.current?.precipitation || 0,
        windSpeed: data.current?.wind_speed_10m || 0,
        windDirection: data.current?.wind_direction_10m || 0,
        pressure: data.current?.surface_pressure || 0,
        weatherCondition: WEATHER_CONDITIONS[data.current?.weather_code || 0] || 'Unknown',
        isDay: (data.current?.is_day || 0) === 1
      },
      forecast: {
        daily: data.daily?.time.map((time, index) => ({
          date: time,
          maxTemp: data.daily?.temperature_2m_max[index] || 0,
          minTemp: data.daily?.temperature_2m_min[index] || 0,
          precipitation: data.daily?.precipitation_sum[index] || 0,
          precipitationProbability: data.daily?.precipitation_probability_max[index] || 0,
          windSpeed: data.daily?.wind_speed_10m_max[index] || 0,
          weatherCondition: WEATHER_CONDITIONS[data.daily?.weather_code[index] || 0] || 'Unknown',
          sunrise: data.daily?.sunrise[index] || '',
          sunset: data.daily?.sunset[index] || '',
          uvIndex: data.daily?.uv_index_max[index] || 0
        })) || [],
        hourly: data.hourly?.time.slice(0, 24).map((time, index) => ({
          time,
          temperature: data.hourly?.temperature_2m[index] || 0,
          precipitation: data.hourly?.precipitation[index] || 0,
          precipitationProbability: data.hourly?.precipitation_probability[index] || 0,
          windSpeed: data.hourly?.wind_speed_10m[index] || 0,
          humidity: data.hourly?.relative_humidity_2m[index] || 0
        })) || []
      },
      agriculture: {
        soilTemperature: {
          surface: data.hourly?.soil_temperature_0cm?.[0] || 0,
          depth6cm: data.hourly?.soil_temperature_6cm?.[0] || 0,
          depth18cm: data.hourly?.soil_temperature_18cm?.[0] || 0
        },
        soilMoisture: {
          surface: data.hourly?.soil_moisture_0_1cm?.[0] || 0,
          shallow: data.hourly?.soil_moisture_1_3cm?.[0] || 0,
          medium: data.hourly?.soil_moisture_3_9cm?.[0] || 0
        },
        evapotranspiration: data.hourly?.et0_fao_evapotranspiration?.[0] || 0,
        uvIndex: data.hourly?.uv_index?.[0] || 0,
        sprayConditions
      }
    }
  }

  /**
   * Evaluate spraying conditions based on weather parameters
   */
  private evaluateSprayConditions(windSpeed: number, humidity: number, temperature: number): {
    suitable: boolean
    windSpeed: number
    humidity: number
    temperature: number
    notes: string[]
  } {
    const notes: string[] = []
    let suitable = true

    // Wind speed check (ideal: 3-15 km/h)
    if (windSpeed < 3) {
      notes.push('Wind too calm - may cause drift and poor coverage')
      suitable = false
    } else if (windSpeed > 15) {
      notes.push('Wind too strong - high drift risk')
      suitable = false
    }

    // Temperature check (ideal: 10-25°C)
    if (temperature < 10) {
      notes.push('Temperature too low - reduced efficacy')
      suitable = false
    } else if (temperature > 25) {
      notes.push('Temperature too high - evaporation risk')
      suitable = false
    }

    // Humidity check (ideal: 50-95%)
    if (humidity < 50) {
      notes.push('Low humidity - increased evaporation risk')
      suitable = false
    }

    if (suitable) {
      notes.push('Good conditions for spraying')
    }

    return {
      suitable,
      windSpeed,
      humidity,
      temperature,
      notes
    }
  }

  /**
   * Get weather code from condition string
   */
  private getWeatherCode(condition: string): number {
    const entry = Object.entries(WEATHER_CONDITIONS).find(([code, desc]) => 
      desc.toLowerCase() === condition.toLowerCase()
    )
    return entry ? parseInt(entry[0]) : 0
  }
}

// Singleton instance
let weatherAPIInstance: WeatherAPIClient | null = null

export function getWeatherAPIClient(): WeatherAPIClient {
  if (!weatherAPIInstance) {
    weatherAPIInstance = new WeatherAPIClient()
  }
  return weatherAPIInstance
} 