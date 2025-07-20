import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPToolResult, MCPTool } from '../base/types.js'
import { MCPUtils } from '../base/utils.js'
import { USDAToolArgs, USDAMarketData, USDAProductionData, USDATradeData } from './types.js'

export class USDATools {

  public getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_usda_market_prices',
        description: 'Get USDA market prices for agricultural commodities',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Commodity category (e.g., grain, livestock, dairy)',
              enum: ['grain', 'livestock', 'dairy', 'fruits', 'vegetables']
            },
            region: {
              type: 'string',
              description: 'US region (e.g., Midwest, Southeast, West)'
            },
            commodity: {
              type: 'string',
              description: 'Specific commodity (e.g., corn, soybeans, wheat)'
            }
          }
        },
      },
      {
        name: 'get_usda_production_data',
        description: 'Get USDA crop production statistics',
        inputSchema: {
          type: 'object',
          properties: {
            crop: {
              type: 'string',
              description: 'Crop name (e.g., corn, soybeans, wheat)'
            },
            region: {
              type: 'string',
              description: 'US region or state'
            },
            year: {
              type: 'number',
              minimum: 2020,
              maximum: 2024,
              description: 'Production year'
            }
          }
        },
      },
      {
        name: 'get_usda_trade_data',
        description: 'Get USDA agricultural trade data (imports/exports)',
        inputSchema: {
          type: 'object',
          properties: {
            commodity: {
              type: 'string',
              description: 'Commodity for trade data'
            },
            country: {
              type: 'string',
              description: 'Trading partner country'
            },
            type: {
              type: 'string',
              enum: ['export', 'import', 'both'],
              description: 'Type of trade data'
            }
          }
        },
      },
      {
        name: 'get_usda_market_dashboard',
        description: 'Get comprehensive USDA market overview dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'US region for market overview'
            }
          }
        },
      }
    ]
  }

  public getMCPTools(): MCPTool[] {
    return [
      {
        name: 'get_usda_market_prices',
        description: 'Get USDA market prices for agricultural commodities',
        inputSchema: this.getToolDefinitions()[0].inputSchema,
        handler: this.getMarketPrices.bind(this)
      },
      {
        name: 'get_usda_production_data',
        description: 'Get USDA crop production statistics',
        inputSchema: this.getToolDefinitions()[1].inputSchema,
        handler: this.getProductionData.bind(this)
      },
      {
        name: 'get_usda_trade_data',
        description: 'Get USDA agricultural trade data (imports/exports)',
        inputSchema: this.getToolDefinitions()[2].inputSchema,
        handler: this.getTradeData.bind(this)
      },
      {
        name: 'get_usda_market_dashboard',
        description: 'Get comprehensive USDA market overview dashboard',
        inputSchema: this.getToolDefinitions()[3].inputSchema,
        handler: this.getMarketDashboard.bind(this)
      }
    ]
  }

  public async getMarketPrices(args: USDAToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'USDA: Getting market prices', args)

      // Mock market prices data
      const marketPrices: USDAMarketData[] = [
        {
          commodity: 'Corn',
          grade: 'No. 2 Yellow',
          region: args.region || 'Midwest',
          market: 'Chicago Board of Trade',
          price: 4.85,
          unit: '$/bushel',
          date: new Date().toISOString().split('T')[0],
          trend: 'up',
          changePercent: 2.1
        },
        {
          commodity: 'Soybeans',
          grade: 'No. 1',
          region: args.region || 'Midwest',
          market: 'Chicago Board of Trade',
          price: 14.25,
          unit: '$/bushel',
          date: new Date().toISOString().split('T')[0],
          trend: 'stable',
          changePercent: 0.3
        },
        {
          commodity: 'Wheat',
          grade: 'Hard Red Winter',
          region: args.region || 'Great Plains',
          market: 'Kansas City Board of Trade',
          price: 6.12,
          unit: '$/bushel',
          date: new Date().toISOString().split('T')[0],
          trend: 'down',
          changePercent: -1.8
        }
      ]

      // Filter by category if specified
      let filteredPrices = marketPrices
      if (args.category) {
        if (args.category === 'grain') {
          filteredPrices = marketPrices.filter(p => ['Corn', 'Soybeans', 'Wheat'].includes(p.commodity))
        }
      }

      // Filter by commodity if specified
      if (args.commodity) {
        filteredPrices = filteredPrices.filter(p => 
          p.commodity.toLowerCase().includes(args.commodity!.toLowerCase())
        )
      }

      return MCPUtils.createSuccessResult(
        `📊 Retrieved ${filteredPrices.length} USDA market price(s)`,
        { 
          prices: filteredPrices, 
          category: args.category,
          region: args.region,
          count: filteredPrices.length 
        },
        `Found ${filteredPrices.length} market prices`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'USDA: Failed to get market prices', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve USDA market prices',
        errorMessage
      )
    }
  }

  public async getProductionData(args: USDAToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'USDA: Getting production data', args)

      // Mock production data
      const productionData: USDAProductionData[] = [
        {
          crop: 'Corn',
          region: args.region || 'Iowa',
          year: args.year || 2024,
          production: 2450000,
          unit: 'bushels',
          area: 13800000,
          areaUnit: 'acres',
          yield: 177.5,
          yieldUnit: 'bushels/acre'
        },
        {
          crop: 'Soybeans', 
          region: args.region || 'Illinois',
          year: args.year || 2024,
          production: 692000,
          unit: 'bushels',
          area: 11200000,
          areaUnit: 'acres',
          yield: 61.8,
          yieldUnit: 'bushels/acre'
        },
        {
          crop: 'Wheat',
          region: args.region || 'Kansas',
          year: args.year || 2024,
          production: 265000,
          unit: 'bushels',
          area: 6800000,
          areaUnit: 'acres',
          yield: 39.0,
          yieldUnit: 'bushels/acre'
        }
      ]

      // Filter by crop if specified
      let filteredData = productionData
      if (args.crop) {
        filteredData = productionData.filter(d => 
          d.crop.toLowerCase().includes(args.crop!.toLowerCase())
        )
      }

      return MCPUtils.createSuccessResult(
        `🌾 Retrieved ${filteredData.length} USDA production record(s)`,
        { 
          production: filteredData,
          crop: args.crop,
          region: args.region,
          year: args.year,
          count: filteredData.length 
        },
        `Found ${filteredData.length} production records`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'USDA: Failed to get production data', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve USDA production data',
        errorMessage
      )
    }
  }

  public async getTradeData(args: USDAToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'USDA: Getting trade data', args)

      // Mock trade data
      const tradeData: USDATradeData[] = [
        {
          commodity: 'Corn',
          country: 'China',
          type: 'export',
          quantity: 15000000,
          unit: 'metric tons',
          value: 3200000000,
          currency: 'USD',
          period: '2024'
        },
        {
          commodity: 'Soybeans',
          country: 'China',
          type: 'export',
          quantity: 25000000,
          unit: 'metric tons',
          value: 12500000000,
          currency: 'USD',
          period: '2024'
        },
        {
          commodity: 'Wheat',
          country: 'Mexico',
          type: 'export',
          quantity: 3200000,
          unit: 'metric tons',
          value: 850000000,
          currency: 'USD',
          period: '2024'
        }
      ]

      // Filter by commodity if specified
      let filteredData = tradeData
      if (args.commodity) {
        filteredData = tradeData.filter(d => 
          d.commodity.toLowerCase().includes(args.commodity!.toLowerCase())
        )
      }

      // Filter by country if specified
      if (args.country) {
        filteredData = filteredData.filter(d => 
          d.country.toLowerCase().includes(args.country!.toLowerCase())
        )
      }

      // Filter by type if specified
      if (args.type && args.type !== 'both') {
        filteredData = filteredData.filter(d => d.type === args.type)
      }

      return MCPUtils.createSuccessResult(
        `🚢 Retrieved ${filteredData.length} USDA trade record(s)`,
        { 
          trade: filteredData,
          commodity: args.commodity,
          country: args.country,
          type: args.type,
          count: filteredData.length 
        },
        `Found ${filteredData.length} trade records`
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'USDA: Failed to get trade data', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve USDA trade data',
        errorMessage
      )
    }
  }

  public async getMarketDashboard(args: USDAToolArgs): Promise<MCPToolResult> {
    try {
      MCPUtils.logWithTimestamp('INFO', 'USDA: Getting market dashboard', args)

      // Get data from other methods
      const marketPrices = await this.getMarketPrices(args)
      const productionData = await this.getProductionData(args)
      const tradeData = await this.getTradeData(args)

      const dashboard = {
        region: args.region || 'United States',
        lastUpdated: new Date().toISOString(),
        marketPrices: marketPrices.data?.prices || [],
        production: productionData.data?.production || [],
        trade: tradeData.data?.trade || [],
        summary: {
          totalCommodities: 3,
          avgCornPrice: 4.85,
          totalCornProduction: '2.45 billion bushels',
          majorExportDestination: 'China'
        }
      }

      return MCPUtils.createSuccessResult(
        `📈 Retrieved USDA market dashboard for ${dashboard.region}`,
        dashboard,
        'Market dashboard generated successfully'
      )
    } catch (error) {
      const errorMessage = MCPUtils.formatError(error)
      MCPUtils.logWithTimestamp('ERROR', 'USDA: Failed to get market dashboard', error)
      return MCPUtils.createErrorResult(
        'Failed to retrieve USDA market dashboard',
        errorMessage
      )
    }
  }
} 