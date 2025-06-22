'use client'

import { useState } from 'react'

export default function USDATestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testUSDAAPI = async (category: string, dataType: string = 'prices') => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/usda/markets?category=${category}&dataType=${dataType}`)
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to fetch USDA data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🇺🇸 USDA Agricultural Markets Test</h1>
      <p>Test the USDA agricultural market data integration for North American markets.</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Market Prices</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => testUSDAAPI('grain')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Grain Prices
          </button>
          <button 
            onClick={() => testUSDAAPI('livestock')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Livestock Prices
          </button>
          <button 
            onClick={() => testUSDAAPI('dairy')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Dairy Prices
          </button>
          <button 
            onClick={() => testUSDAAPI('poultry')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Poultry Prices
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Production Data</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => testUSDAAPI('grain', 'production')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Grain Production
          </button>
          <button 
            onClick={() => testUSDAAPI('livestock', 'production')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#EC4899', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Livestock Production
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Trade Data</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => testUSDAAPI('grain', 'trade')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Grain Trade
          </button>
          <button 
            onClick={() => testUSDAAPI('specialty', 'trade')}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#F97316', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Specialty Trade
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Market Dashboard</h3>
        <button 
          onClick={() => testUSDAAPI('grain', 'dashboard')}
          disabled={loading}
          style={{ padding: '8px 16px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Grain Dashboard
        </button>
      </div>

      {loading && (
        <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
          <p>Loading USDA data...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '8px', marginBottom: '20px', color: '#dc2626' }}>
          <h4>Error:</h4>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '8px' }}>
          <h4>USDA Data Response:</h4>
          <div style={{ background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
            <pre style={{ fontSize: '12px', overflow: 'auto', margin: 0 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
          
          {result.data && Array.isArray(result.data) && (
            <div style={{ marginTop: '15px' }}>
              <h5>Summary:</h5>
              <ul>
                <li><strong>Source:</strong> {result.metadata?.source || 'USDA'}</li>
                <li><strong>Category:</strong> {result.metadata?.category}</li>
                <li><strong>Data Type:</strong> {result.metadata?.dataType}</li>
                <li><strong>Records:</strong> {result.data.length}</li>
                <li><strong>Timestamp:</strong> {result.metadata?.timestamp}</li>
              </ul>
              
              {result.data.length > 0 && (
                <div>
                  <h6>Sample Data:</h6>
                  <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', fontSize: '14px' }}>
                    {result.metadata?.dataType === 'prices' && (
                      <div>
                        <strong>{result.data[0].commodity}</strong> - {result.data[0].region}: 
                        ${result.data[0].price} {result.data[0].currency} per {result.data[0].unit}
                      </div>
                    )}
                    {result.metadata?.dataType === 'production' && (
                      <div>
                        <strong>{result.data[0].commodity}</strong> - {result.data[0].region} ({result.data[0].year}): 
                        {result.data[0].production.toLocaleString()} {result.data[0].unit}
                      </div>
                    )}
                    {result.metadata?.dataType === 'trade' && (
                      <div>
                        <strong>{result.data[0].commodity}</strong> - {result.data[0].tradeType} to {result.data[0].country}: 
                        ${result.data[0].value.toLocaleString()} {result.data[0].currency}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', background: '#f8fafc', borderRadius: '8px', fontSize: '14px' }}>
        <h4>About USDA Integration</h4>
        <ul>
          <li><strong>Market Categories:</strong> grain, livestock, dairy, poultry, fruits, vegetables, specialty</li>
          <li><strong>Regions:</strong> US, Canada, Mexico, Midwest, Southeast, Northeast, Southwest, West</li>
          <li><strong>Data Types:</strong> prices, production, trade, dashboard</li>
          <li><strong>Currency:</strong> USD (US Dollars)</li>
          <li><strong>Update Frequency:</strong> Real-time (mock data for demonstration)</li>
        </ul>
        <p>
          This integration provides comprehensive agricultural market data for North American markets,
          including current prices, production statistics, trade information, and market dashboards.
        </p>
      </div>
    </div>
  )
} 