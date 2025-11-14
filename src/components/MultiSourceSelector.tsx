'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Cloud, Tractor, Wheat, Satellite } from 'lucide-react'

interface DataSource {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  category: 'platform' | 'environmental'
  color: string
  available: boolean
}

interface MultiSourceSelectorProps {
  selectedSources: string[]
  onSourcesChange: (sources: string[]) => void
  className?: string
  disabled?: boolean
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'weather',
    name: 'Weather',
    icon: <Cloud className="w-5 h-5" />,
    description: 'Current conditions, forecasts, agricultural insights',
    category: 'environmental',
    color: '#3B82F6',
    available: true
  },
  {
    id: 'johndeere',
    name: 'John Deere',
    icon: <Tractor className="w-5 h-5" />,
    description: 'Field operations, equipment data, work records',
    category: 'platform',
    color: '#367C2B',
    available: true
  },
  {
    id: 'auravant',
    name: 'Auravant', 
    icon: <Wheat className="w-5 h-5" />,
    description: 'Livestock, work orders, field management',
    category: 'platform',
    color: '#059669',
    available: true
  },
  {
    id: 'eu-commission',
    name: 'EU Markets',
    icon: <Cloud className="w-5 h-5" />,
    description: 'Agricultural market prices, production data, trade statistics',
    category: 'environmental',
    color: '#EAB308',
    available: true
  },
  {
    id: 'usda',
    name: 'USDA Markets',
    icon: <Cloud className="w-5 h-5" />,
    description: 'North American agricultural market data, production statistics, trade info',
    category: 'environmental',
    color: '#DC2626',
    available: true
  },
]

export default function MultiSourceSelector({ 
  selectedSources, 
  onSourcesChange, 
  className = '',
  disabled = false 
}: MultiSourceSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggleSource = (sourceId: string) => {
    if (disabled) return
    
    if (selectedSources.includes(sourceId)) {
      // Don't allow deselecting weather - it should always be selected
      if (sourceId === 'weather') return
      onSourcesChange(selectedSources.filter(id => id !== sourceId))
    } else {
      onSourcesChange([...selectedSources, sourceId])
    }
  }

  const selectedCount = selectedSources.length
  const platformSources = DATA_SOURCES.filter(s => s.category === 'platform')
  const environmentalSources = DATA_SOURCES.filter(s => s.category === 'environmental')

  return (
    <div className={`multi-source-selector ${className}`}>
      {/* Compact Display */}
      <div 
        className="selector-header"
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1
        }}
      >
        {/* Selected Sources Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {selectedSources.slice(0, 3).map(sourceId => {
            const source = DATA_SOURCES.find(s => s.id === sourceId)
            if (!source) return null
            return (
              <div 
                key={sourceId}
                style={{ 
                  color: source.color,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {source.icon}
              </div>
            )
          })}
          {selectedSources.length > 3 && (
            <span style={{ color: '#a0a0a0', fontSize: '12px' }}>
              +{selectedSources.length - 3}
            </span>
          )}
        </div>

        {/* Count and Label */}
        <span style={{ 
          color: '#e0e0e0', 
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {selectedCount} source{selectedCount !== 1 ? 's' : ''}
        </span>

        {/* Expand/Collapse Icon */}
        {!disabled && (
          isExpanded ? 
            <ChevronUp className="w-4 h-4" style={{ color: '#a0a0a0' }} /> :
            <ChevronDown className="w-4 h-4" style={{ color: '#a0a0a0' }} />
        )}
      </div>

      {/* Expanded Selection Interface */}
      {isExpanded && !disabled && (
        <div 
          className="selector-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 50,
            padding: '12px',
            minWidth: '300px'
          }}
        >
          {/* Selection Warning */}
          {selectedCount === 0 && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              marginBottom: '12px'
            }}>
              <span style={{ color: '#ef4444', fontSize: '12px' }}>
                ⚠️ Select at least one data source
              </span>
            </div>
          )}

          {/* Environmental Data Sources */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ 
              color: '#a0a0a0', 
              fontSize: '12px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Environmental
            </h4>
            {environmentalSources.map(source => (
              <div 
                key={source.id}
                className="source-option"
                onClick={() => handleToggleSource(source.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: source.available ? 'pointer' : 'not-allowed',
                  opacity: source.available ? 1 : 0.5,
                  transition: 'background-color 0.2s ease',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => {
                  if (source.available) {
                    e.currentTarget.style.background = '#333'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: `2px solid ${selectedSources.includes(source.id) ? source.color : '#555'}`,
                  borderRadius: '3px',
                  background: selectedSources.includes(source.id) ? source.color : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}>
                  {selectedSources.includes(source.id) && (
                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                  )}
                </div>

                {/* Icon */}
                <div style={{ color: source.color }}>
                  {source.icon}
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
                    {source.id === 'weather' && (
                      <span style={{ 
                        color: '#a0a0a0', 
                        fontSize: '11px',
                        marginLeft: '6px'
                      }}>
                        (Always Active)
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    color: '#a0a0a0', 
                    fontSize: '12px',
                    lineHeight: '1.3'
                  }}>
                    {source.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Platform Data Sources */}
          <div>
            <h4 style={{ 
              color: '#a0a0a0', 
              fontSize: '12px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Farm Platforms
            </h4>
            {platformSources.map(source => (
              <div 
                key={source.id}
                className="source-option"
                onClick={() => handleToggleSource(source.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: source.available ? 'pointer' : 'not-allowed',
                  opacity: source.available ? 1 : 0.5,
                  transition: 'background-color 0.2s ease',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => {
                  if (source.available) {
                    e.currentTarget.style.background = '#333'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: `2px solid ${selectedSources.includes(source.id) ? source.color : '#555'}`,
                  borderRadius: '3px',
                  background: selectedSources.includes(source.id) ? source.color : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}>
                  {selectedSources.includes(source.id) && (
                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                  )}
                </div>

                {/* Icon */}
                <div style={{ color: source.color }}>
                  {source.icon}
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
                  </div>
                  <div style={{ 
                    color: '#a0a0a0', 
                    fontSize: '12px',
                    lineHeight: '1.3'
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

          {/* Footer */}
          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #333',
            textAlign: 'center'
          }}>
            <span style={{ 
              color: '#777', 
              fontSize: '11px'
            }}>
              Select multiple sources for comprehensive insights
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 