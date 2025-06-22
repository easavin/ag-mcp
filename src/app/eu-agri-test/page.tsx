'use client'

import { useState, useEffect } from 'react'
import { MARKET_SECTORS } from '@/lib/eu-agri-api'

type MarketSector = keyof typeof MARKET_SECTORS
type DataType = 'prices' | 'production' | 'trade' | 'dashboard'

interface ApiResponse {
  success: boolean
  data: any
  metadata: {
    source: string
    lastUpdated: string
    disclaimer: string
    dataProvider: string
  }
  error?: string
}

export default function EUAgriTestPage() {
  const [selectedSector, setSelectedSector] = useState<MarketSector>('CEREALS')
  const [selectedDataType, setSelectedDataType] = useState<DataType>('prices')
  const [memberState, setMemberState] = useState<string>('EU')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        sector: selectedSector,
        dataType: selectedDataType,
        memberState,
        limit: '10'
      })

      const response = await fetch(`/api/eu-agri/markets?${params}`)
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedSector, selectedDataType, memberState])

  const renderData = () => {
    if (!data || !data.success) return null

    switch (selectedDataType) {
      case 'prices':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Prices</h3>
            <div className="grid gap-4">
              {data.data.map((item: any, index: number) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.product}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {item.memberState} • {item.category} • {item.quality}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        {item.price} {item.currency}/{item.unit}
                      </p>
                      <p className="text-sm text-gray-500">{item.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'production':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Production Statistics</h3>
            <div className="grid gap-4">
              {data.data.map((item: any, index: number) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.product}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {item.memberState} • {item.period}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-blue-600">
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-sm text-gray-500">Year {item.year}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'trade':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trade Data</h3>
            <div className="grid gap-4">
              {data.data.map((item: any, index: number) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.product}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {item.tradeType.toUpperCase()} • {item.partnerCountry} • {item.period}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-purple-600">
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-sm text-gray-500">€{item.value.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{data.data.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{data.data.description}</p>
            </div>

            {/* Key Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.data.keyIndicators.map((indicator: any, index: number) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-900 dark:text-white">{indicator.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {indicator.value} {indicator.unit}
                    </span>
                    {indicator.trend && (
                      <span className={`text-sm ${
                        indicator.trend === 'up' ? 'text-green-500' : 
                        indicator.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {indicator.trend === 'up' ? '↗' : indicator.trend === 'down' ? '↙' : '→'} 
                        {indicator.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Highlights */}
            {data.data.priceHighlights.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recent Prices</h4>
                <div className="grid gap-2">
                  {data.data.priceHighlights.slice(0, 3).map((price: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {price.product} ({price.memberState})
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {price.price} {price.currency}/{price.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return <div>Unknown data type</div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <img 
              src="/assets/logos/ec-logo.png" 
              alt="European Commission" 
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                EU Agricultural Markets
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                European Commission Agri-food Data Portal Integration Test
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sector Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Sector
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value as MarketSector)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(MARKET_SECTORS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Type
              </label>
              <select
                value={selectedDataType}
                onChange={(e) => setSelectedDataType(e.target.value as DataType)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="prices">Market Prices</option>
                <option value="production">Production Data</option>
                <option value="trade">Trade Statistics</option>
                <option value="dashboard">Market Dashboard</option>
              </select>
            </div>

            {/* Member State Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Member State
              </label>
              <select
                value={memberState}
                onChange={(e) => setMemberState(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="EU">European Union</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
                <option value="NL">Netherlands</option>
                <option value="PL">Poland</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">Loading agricultural data...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <div>
              {renderData()}
              
              {/* Metadata */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p><strong>Source:</strong> {data.metadata.source}</p>
                  <p><strong>Last Updated:</strong> {new Date(data.metadata.lastUpdated).toLocaleString()}</p>
                  <p><strong>Data Provider:</strong> {data.metadata.dataProvider}</p>
                  <p className="mt-2 italic">{data.metadata.disclaimer}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 