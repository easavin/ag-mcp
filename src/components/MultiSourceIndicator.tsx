'use client'

import { useState } from 'react'
import { Cloud, Wheat, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface DataSource {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  description: string
  features: string[]
  category: string
  status: 'connected' | 'connecting' | 'error' | 'available'
}

interface MultiSourceIndicatorProps {
  selectedSources: string[]
  className?: string
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'weather',
    name: 'Weather Data',
    icon: <Cloud className="w-5 h-5" />,
    color: '#3B82F6',
    description: 'Real-time weather conditions, forecasts, and agricultural insights',
    features: ['Current conditions', '5-day forecasts', 'Agricultural alerts', 'Historical data'],
    category: 'Environmental Data',
    status: 'connected'
  },
  {
    id: 'johndeere',
    name: 'John Deere Operations Center',
    icon: <Image src="/assets/logos/johndeere-logo.png" alt="John Deere" width={20} height={20} />,
    color: '#367C2B',
    description: 'Access your John Deere equipment, fields, and operations data',
    features: ['Field boundaries', 'Equipment tracking', 'Work records', 'Machine data'],
    category: 'Farm Management Platform',
    status: 'connected'
  },
  {
    id: 'auravant',
    name: 'Auravant Platform', 
    icon: <Wheat className="w-5 h-5" />,
    color: '#059669',
    description: 'Comprehensive agricultural management with livestock and work orders',
    features: ['Livestock management', 'Work order planning', 'Field operations', 'Multi-language support'],
    category: 'Farm Management Platform',
    status: 'connected'
  },
  {
    id: 'eu-commission',
    name: 'EU Agricultural Markets',
    icon: <Image src="/assets/logos/ec-logo.png" alt="EU Commission" width={20} height={20} />,
    color: '#EAB308',
    description: 'European Commission agricultural market data and statistics',
    features: ['Market prices', 'Production statistics', 'Trade data', 'Market dashboards'],
    category: 'Market Data',
    status: 'connected'
  },
  {
    id: 'usda',
    name: 'USDA Agricultural Markets',
    icon: <Image src="/assets/logos/usda-logo.png" alt="USDA" width={20} height={20} />,
    color: '#DC2626',
    description: 'USDA agricultural market data for North American markets',
    features: ['Market prices', 'Production data', 'Trade statistics', 'Regional analysis'],
    category: 'Market Data',
    status: 'connected'
  }
]

export default function MultiSourceIndicator({ 
  selectedSources, 
  className = ''
}: MultiSourceIndicatorProps) {
  const [hoveredSource, setHoveredSource] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  const getSourceData = (sourceId: string) => {
    return DATA_SOURCES.find(source => source.id === sourceId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'connecting':
        return <Clock className="w-3 h-3 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return <CheckCircle className="w-3 h-3 text-green-500" />
    }
  }

  const handleMouseEnter = (sourceId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    })
    setHoveredSource(sourceId)
  }

  const handleMouseLeave = () => {
    setHoveredSource(null)
  }

  if (selectedSources.length === 0) {
    return null
  }

  const hoveredSourceData = hoveredSource ? getSourceData(hoveredSource) : null

  return (
    <>
      <div className={`multi-source-indicator ${className}`}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}>
          {selectedSources.map(sourceId => {
            const source = getSourceData(sourceId)
            if (!source) return null
            
            return (
              <div
                key={sourceId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: source.color,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = source.color
                  e.currentTarget.style.background = `${source.color}15`
                  handleMouseEnter(sourceId, e)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#444'
                  e.currentTarget.style.background = '#2a2a2a'
                  handleMouseLeave()
                }}
              >
                {source.icon}
                
                {/* Connected indicator dot */}
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '8px',
                    height: '8px',
                    background: source.color,
                    borderRadius: '50%',
                    border: '1px solid #1c1c1c'
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Enhanced Tooltip */}
      {hoveredSourceData && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, 0%)',
            background: '#1a1a1a',
            border: `1px solid ${hoveredSourceData.color}`,
            borderRadius: '12px',
            padding: '16px',
            minWidth: '280px',
            maxWidth: '320px',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: `${hoveredSourceData.color}20`,
              border: `1px solid ${hoveredSourceData.color}`,
              borderRadius: '6px',
              color: hoveredSourceData.color
            }}>
              {hoveredSourceData.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                color: '#f5f5f5',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '2px'
              }}>
                {hoveredSourceData.name}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {getStatusIcon(hoveredSourceData.status)}
                <span style={{
                  color: '#a0a0a0',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {hoveredSourceData.category}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            color: '#e0e0e0',
            fontSize: '12px',
            lineHeight: '1.4',
            marginBottom: '12px'
          }}>
            {hoveredSourceData.description}
          </div>

          {/* Features */}
          <div>
            <div style={{
              color: '#f5f5f5',
              fontSize: '11px',
              fontWeight: '600',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Available Features
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px'
            }}>
              {hoveredSourceData.features.map((feature, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#c0c0c0',
                  fontSize: '11px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    background: hoveredSourceData.color,
                    borderRadius: '50%',
                    flexShrink: 0
                  }} />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip Arrow */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            width: '12px',
            height: '12px',
            background: '#1a1a1a',
            border: `1px solid ${hoveredSourceData.color}`,
            borderBottom: 'none',
            borderRight: 'none',
            transform: 'translateX(-50%) rotate(45deg)'
          }} />
        </div>
      )}
    </>
  )
} 