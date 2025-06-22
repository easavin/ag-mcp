'use client'

import { useState } from 'react'
import { ChevronDown, Database } from 'lucide-react'

interface DataSource {
  id: string
  name: string
  icon: string
  description: string
  available: boolean
  color: string
}

interface DataSourceIndicatorProps {
  currentSource: string | null
  onSourceChange: (sourceId: string) => void
  className?: string
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'weather',
    name: 'Weather',
    icon: '/assets/logos/weather-logo.svg',
    description: 'Real-time weather data',
    available: true,
    color: '#3B82F6'
  },
  {
    id: 'johndeere',
    name: 'John Deere',
    icon: '/assets/logos/johndeere-logo.png',
    description: 'John Deere Operations Center',
    available: true,
    color: '#367C2B'
  }
  // Removed mock apps - only showing available integrations
]

export default function DataSourceIndicator({ currentSource, onSourceChange, className = '' }: DataSourceIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentSourceData = DATA_SOURCES.find(source => source.id === currentSource) || DATA_SOURCES[0]
  const availableSources = DATA_SOURCES.filter(source => source.available)

  const handleSourceSelect = (sourceId: string) => {
    onSourceChange(sourceId)
    setIsOpen(false)
  }

  return (
    <div className={`data-source-indicator ${className}`}>
      {/* Current Source Display */}
      <div 
        className="current-source"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#555'
          e.currentTarget.style.background = '#333'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#444'
          e.currentTarget.style.background = '#2a2a2a'
        }}
      >
        {/* Source Icon Only */}
        {currentSourceData?.icon.startsWith('/') ? (
          <img 
            src={currentSourceData.icon} 
            alt={currentSourceData.name}
            width={20}
            height={20}
            style={{ borderRadius: '2px' }}
          />
        ) : (
          <span style={{ fontSize: '16px' }}>{currentSourceData?.icon || <Database className="w-4 h-4" />}</span>
        )}
        
        {/* Small dropdown indicator */}
        <ChevronDown 
          className="w-2 h-2" 
          style={{ 
            color: '#a0a0a0',
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div 
            className="source-dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              minWidth: '200px',
              background: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              zIndex: 50,
              overflow: 'hidden'
            }}
          >
            {DATA_SOURCES.map((source) => (
              <div
                key={source.id}
                className={`source-option ${!source.available ? 'disabled' : ''} ${source.id === currentSource ? 'selected' : ''}`}
                onClick={() => source.available && handleSourceSelect(source.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  cursor: source.available ? 'pointer' : 'not-allowed',
                  opacity: source.available ? 1 : 0.5,
                  background: source.id === currentSource ? '#333' : 'transparent',
                  borderBottom: DATA_SOURCES.length > 1 ? '1px solid #333' : 'none',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (source.available && source.id !== currentSource) {
                    e.currentTarget.style.background = '#333'
                  }
                }}
                onMouseLeave={(e) => {
                  if (source.id !== currentSource) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {/* Icon */}
                <div style={{ width: '20px', height: '20px' }}>
                  {source.icon.startsWith('/') ? (
                    <img 
                      src={source.icon} 
                      alt={source.name}
                      width={20}
                      height={20}
                      style={{ borderRadius: '2px' }}
                    />
                  ) : (
                    <span style={{ fontSize: '16px' }}>{source.icon}</span>
                  )}
                </div>
                
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: '#e0e0e0', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    marginBottom: '2px'
                  }}>
                    {source.name}
                    {source.id === currentSource && (
                      <span style={{ color: '#4ade80', marginLeft: '8px', fontSize: '12px' }}>
                        ✓ Active
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    color: '#a0a0a0', 
                    fontSize: '12px' 
                  }}>
                    {source.description}
                  </div>
                </div>
                
                {/* Status */}
                {!source.available && (
                  <span style={{ 
                    color: '#a0a0a0', 
                    fontSize: '11px',
                    background: '#444',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
} 