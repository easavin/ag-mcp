import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPToolResult, MCPTool } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { WeatherToolArgs, WeatherLocation, WeatherData } from './types.js'
import { getWeatherAPIClient } from '../../lib/weather-api.js'

export class WeatherTools {
  private weatherClient = getWeatherAPIClient()

  public getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_current_weather',
        description: 'Get current weather conditions for a location with agricultural insights',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: { 
              type: 'number', 
              description: 'Latitude coordinate (-90 to 90)' 
            },
            longitude: { 
              type: 'number', 
              description: 'Longitude coordinate (-180 to 180)' 
            },
            location: { 
              type: 'string', 
              description: 'Location name (alternative to coordinates)' 
            },
          },
          anyOf: [
            { required: ['latitude', 'longitude'] },
            { required: ['location'] }
          ]
        },
      },
      {
        name: 'get_weather_forecast',
        description: 'Get weather forecast for a location (1-7 days)',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: { 
              type: 'number', 
              description: 'Latitude coordinate (-90 to 90)' 
            },
            longitude: { 
              type: 'number', 
              description: 'Longitude coordinate (-180 to 180)' 
            },
            location: { 
              type: 'string', 
              description: 'Location name (alternative to coordinates)' 
            },
            days: { 
              type: 'number', 
              minimum: 1, 
              maximum: 7, 
              default: 7,
              description: 'Number of forecast days (1-7)'
            },
          },
          anyOf: [
            { required: ['latitude', 'longitude'] },
            { required: ['location'] }
          ]
        },
      },
      {
        name: 'search_locations',
        description: 'Search for locations by name and get coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            query: { 
              type: 'string', 
              description: 'Location name or partial name to search for' 
            },
            limit: { 
              type: 'number', 
              minimum: 1, 
              maximum: 10, 
              default: 5,
              description: 'Maximum number of results to return'
            }
          },
          required: ['query']
        },
      }
    ]
  }

  public getMCPTools(): MCPTool[] {
    return [
      {
        name: 'get_current_weather',
        description: 'Get current weather conditions for a location with agricultural insights',
        inputSchema: this.getToolDefinitions()[0].inputSchema,
        handler: this.getCurrentWeather.bind(this)
      },
      {
        name: 'get_weather_forecast',
        description: 'Get weather forecast for a location (1-7 days)',
        inputSchema: this.getToolDefinitions()[1].inputSchema,
        handler: this.getWeatherForecast.bind(this)
      },
      {
        name: 'search_locations',
        description: 'Search for locations by name and get coordinates',
        inputSchema: this.getToolDefinitions()[2].inputSchema,
        handler: this.searchLocations.bind(this)
      }
    ]
  }

  private async resolveLocation(args: WeatherToolArgs): Promise<{ latitude: number; longitude: number }> {
    if (args.latitude !== undefined && args.longitude !== undefined) {
      // Validate coordinates
      if (args.latitude < -90 || args.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90')
      }
      if (args.longitude < -180 || args.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180')
      }
      
      return {
        latitude: args.latitude,
        longitude: args.longitude
      }
    } else if (args.location) {
      const locations = await this.weatherClient.searchLocations(args.location, 1)
      if (locations.length === 0) {
        throw new Error(`Location "${args.location}" not found`)
      }
      return {
        latitude: locations[0].latitude,
        longitude: locations[0].longitude
      }
    } else {
      throw new Error('Either coordinates (latitude, longitude) or location name required')
    }
  }

  public async getCurrentWeather(args: WeatherToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Weather: Getting current weather', args)
      
      const { latitude, longitude } = await this.resolveLocation(args)
      
      const weatherData = await this.weatherClient.getAgriculturalWeather(latitude, longitude, 1)
      
      return MCPUtils.createSuccessResult(
        `🌤️ Current weather conditions retrieved for ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        weatherData,
        'Retrieved current weather conditions with agricultural insights'
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Weather: Failed to get current weather', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve current weather conditions',
        errorMessage
      )
    }
  }

  public async getWeatherForecast(args: WeatherToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Weather: Getting weather forecast', args)
      
      const { latitude, longitude } = await this.resolveLocation(args)
      const days = Math.min(Math.max(args.days || 7, 1), 7) // Ensure days is between 1-7
      
      const weatherData = await this.weatherClient.getAgriculturalWeather(latitude, longitude, days)
      
      return MCPUtils.createSuccessResult(
        `📅 ${days}-day weather forecast retrieved for ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        weatherData,
        `Retrieved ${days}-day weather forecast with agricultural insights`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Weather: Failed to get weather forecast', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve weather forecast',
        errorMessage
      )
    }
  }

  public async searchLocations(args: { query: string; limit?: number }): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'Weather: Searching locations', args)
      
      const missing = MCPUtils.validateRequiredFields(args, ['query'])
      if (missing.length > 0) {
        return MCPUtils.createErrorResult(
          `Missing required fields: ${missing.join(', ')}`
        )
      }
      
      const limit = Math.min(Math.max(args.limit || 5, 1), 10) // Ensure limit is between 1-10
      const locations = await this.weatherClient.searchLocations(args.query, limit)
      
      return MCPUtils.createSuccessResult(
        `📍 Found ${locations.length} location(s) for "${args.query}"`,
        { 
          query: args.query,
          locations,
          count: locations.length 
        },
        `Searched and found ${locations.length} matching locations`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'Weather: Failed to search locations', error)
      return MCPUtils.createErrorResult(
        'Failed to search locations',
        errorMessage
      )
    }
  }
} 