'use client'

import { useState } from 'react'

interface DataSource {
  id: string
  name: string
  icon: string
  description: string
  available: boolean
}

interface DataSourceSelectorProps {
  onSelect: (sourceId: string, dataType: string) => void
  dataType: string // 'organizations', 'fields', 'equipment', etc.
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'weather',
    name: 'Weather Data',
    icon: '/assets/logos/weather-logo.svg',
    description: 'Access real-time weather data, forecasts, and agricultural conditions',
    available: true
  },
  {
    id: 'johndeere',
    name: 'John Deere Operations Center',
    icon: '/assets/logos/johndeere-logo.png',
    description: 'Access your John Deere equipment, fields, and operations data',
    available: true
  }
]

export default function DataSourceSelector({ onSelect, dataType }: DataSourceSelectorProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelect = async (sourceId: string) => {
    setLoading(sourceId)
    try {
      await onSelect(sourceId, dataType)
    } finally {
      setLoading(null)
    }
  }

  const getDataTypeLabel = (type: string) => {
    switch (type) {
      case 'organizations': return 'organization data'
      case 'fields': return 'field information'
      case 'equipment': return 'equipment details'
      case 'operations': return 'operation records'
      case 'comprehensive': return 'comprehensive farm data'
      default: return 'data'
    }
  }

  return (
    <div className="data-source-selector">
      <div className="selector-header">
        <h3>Choose Data Source</h3>
        <p>Which platform would you like me to fetch your {getDataTypeLabel(dataType)} from?</p>
      </div>
      
      <div className="data-sources">
        {DATA_SOURCES.map((source) => (
          <div 
            key={source.id}
            className={`data-source-card ${!source.available ? 'disabled' : ''}`}
          >
            <div className="source-icon">
              {source.icon.startsWith('/') ? (
                <img 
                  src={source.icon} 
                  alt={source.name}
                  width={32}
                  height={32}
                  className="source-logo"
                />
              ) : (
                source.icon
              )}
            </div>
            <div className="source-info">
              <h4>{source.name}</h4>
              <p>{source.description}</p>
            </div>
            <div className="source-action">
              {source.available ? (
                <button
                  onClick={() => handleSelect(source.id)}
                  disabled={loading === source.id}
                  className="select-btn"
                >
                  {loading === source.id ? (
                    <div className="loading-spinner" />
                  ) : (
                    'Select'
                  )}
                </button>
              ) : (
                <span className="coming-soon-badge">Coming Soon</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="selector-note">
        <p>💡 Additional data sources will be integrated soon to give you a complete view of your farming operation.</p>
      </div>
    </div>
  )
} 