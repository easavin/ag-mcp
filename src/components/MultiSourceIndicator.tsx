'use client'

import { Cloud, Wheat } from 'lucide-react'
import Image from 'next/image'

interface DataSource {
  id: string
  name: string
  icon: React.ReactNode
  color: string
}

interface MultiSourceIndicatorProps {
  selectedSources: string[]
  className?: string
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'weather',
    name: 'Weather',
    icon: <Cloud className="w-5 h-5" />,
    color: '#3B82F6'
  },
  {
    id: 'johndeere',
    name: 'John Deere',
    icon: <Image src="/assets/logos/johndeere-logo.png" alt="John Deere" width={20} height={20} />,
    color: '#367C2B'
  },
  {
    id: 'auravant',
    name: 'Auravant', 
    icon: <Wheat className="w-5 h-5" />,
    color: '#059669'
  },
  {
    id: 'eu-commission',
    name: 'EU Markets',
    icon: <Image src="/assets/logos/ec-logo.png" alt="EU Commission" width={20} height={20} />,
    color: '#EAB308'
  }
]

export default function MultiSourceIndicator({ 
  selectedSources, 
  className = ''
}: MultiSourceIndicatorProps) {
  
  const getSourceData = (sourceId: string) => {
    return DATA_SOURCES.find(source => source.id === sourceId)
  }

  if (selectedSources.length === 0) {
    return null
  }

  return (
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
                position: 'relative'
              }}
              title={source.name}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = source.color
                e.currentTarget.style.background = `${source.color}15`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444'
                e.currentTarget.style.background = '#2a2a2a'
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
        
        {/* Source count if more than 3 */}
        {selectedSources.length > 3 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              background: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '8px',
              color: '#a0a0a0',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            +{selectedSources.length - 3}
          </div>
        )}
      </div>
    </div>
  )
} 