'use client'

import { User, Bot, Paperclip, Settings, Cloud, Wheat } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import DataSourceSelector from './DataSourceSelector'
import MessageReactions from './MessageReactions'
import MessageVisualization from './MessageVisualization'
import { VisualizationData } from '@/types'
import Image from 'next/image'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date | string
  messageId?: string
  fileAttachments?: Array<{
    filename: string
    fileType: string
    fileSize: number
  }>
  visualizations?: VisualizationData[]
  metadata?: {
    model?: string
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    functionCalls?: Array<{
      name: string
      arguments: any
    }>
    visualizations?: VisualizationData[]
    reasoning?: {
      isValid: boolean
      confidence: number
      explanation: string
      suggestions?: string[]
    }
    dataSources?: string[]
  }
  onDataSourceSelect?: (sourceId: string, dataType: string) => void
  currentDataSource?: string | null
  reasoning?: {
    isValid: boolean
    confidence: number
    explanation: string
    suggestions?: string[]
  }
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  messageId,
  fileAttachments,
  visualizations,
  metadata,
  onDataSourceSelect,
  currentDataSource,
  reasoning,
}: MessageBubbleProps) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  // Extract data sources used from function calls in metadata
  const getDataSourcesUsed = (): string[] => {
    if (!metadata?.functionCalls) return []
    
    const dataSources = new Set<string>()
    
    metadata.functionCalls.forEach(functionCall => {
      const functionName = functionCall.name
      
      // Map function names to data sources
      if (['getOrganizations', 'getFields', 'getEquipment', 'getOperations', 'getComprehensiveData', 
           'scheduleFieldOperation', 'getFieldRecommendations', 'updateFieldStatus', 
           'scheduleEquipmentMaintenance', 'getEquipmentAlerts', 'updateEquipmentStatus',
           'get_equipment_details', 'get_field_operation_history', 'list_john_deere_files', 
           'get_field_boundary'].includes(functionName)) {
        dataSources.add('johndeere')
      }
      
      if (['getCurrentWeather', 'getWeatherForecast', 'getHistoricalWeather'].includes(functionName)) {
        dataSources.add('weather')
      }
      
      if (['getEUMarketPrices', 'getEUProductionData', 'getEUTradeData', 'getEUMarketDashboard'].includes(functionName)) {
        dataSources.add('eu-commission')
      }
      
      if (['getUSDAMarketPrices', 'getUSDAProductionData', 'getUSDATradeData', 'getUSDAMarketDashboard'].includes(functionName)) {
        dataSources.add('usda')
      }
      
      // Auravant functions
      if (['getAuravantFields', 'getAuravantFarms', 'getAuravantLabourOperations', 'getAuravantLivestock', 
           'createAuravantSowing', 'createAuravantHarvest', 'getAuravantWorkOrders', 'createAuravantHerd'].includes(functionName)) {
        dataSources.add('auravant')
      }
    })
    
    return Array.from(dataSources)
  }

  // Data source information for rendering
  const dataSourceInfo = {
    weather: {
      name: 'Weather Data',
      icon: <Image src="/assets/logos/weather-logo.svg" alt="Weather" width={12} height={12} />,
      color: '#3B82F6'
    },
    johndeere: {
      name: 'John Deere',
      icon: <Image src="/assets/logos/johndeere-logo.png" alt="John Deere" width={12} height={12} />,
      color: '#367C2B'
    },
    auravant: {
      name: 'Auravant',
      icon: <Wheat className="w-3 h-3" />,
      color: '#059669'
    },
    'eu-commission': {
      name: 'EU Commission',
      icon: <Image src="/assets/logos/ec-logo.png" alt="EU Commission" width={12} height={12} />,
      color: '#EAB308'
    },
    usda: {
      name: 'USDA',
      icon: <Image src="/assets/logos/usda-logo.png" alt="USDA" width={12} height={12} />,
      color: '#DC2626'
    }
  }

  const getIcon = () => {
    if (isUser) return <User className="w-4 h-4" />
    if (isSystem) return <Settings className="w-4 h-4" />
    
      // Check if this is a John Deere data response
  if (isJohnDeereResponse()) {
    return (
      <img
        src="/assets/logos/johndeere-logo.png"
        alt="John Deere"
        width={16}
        height={16}
        className="rounded-sm"
        onError={(e) => {
          console.error('Failed to load John Deere logo:', e)
          // Fallback to bot icon if image fails to load
          e.currentTarget.style.display = 'none'
        }}
        onLoad={() => {
          console.log('✅ John Deere logo loaded successfully')
        }}
      />
    )
  }
  
  // Check if this is an Auravant data response
  if (isAuravantResponse()) {
    return (
      <img
        src="/assets/logos/auravant-logo.png"
        alt="Auravant"
        width={16}
        height={16}
        className="rounded-sm"
        onError={(e) => {
          console.error('Failed to load Auravant logo:', e)
          // Fallback to bot icon if image fails to load
          e.currentTarget.style.display = 'none'
        }}
        onLoad={() => {
          console.log('✅ Auravant logo loaded successfully')
        }}
      />
    )
  }
    
    return <Bot className="w-4 h-4" />
  }

  const getName = () => {
    if (isUser) return 'You'
    if (isSystem) return 'System'
    
    // Show John Deere branding for John Deere data responses
    if (isJohnDeereResponse()) {
      return 'John Deere Data'
    }
    
    // Show Auravant branding for Auravant data responses
    if (isAuravantResponse()) {
      return 'Auravant Data'
    }
    
    return 'Ag Assistant'
  }

  // Check if this message contains John Deere data
  const isJohnDeereResponse = () => {
    if (isUser || isSystem) return false
    
    // Look for patterns that indicate this is John Deere data
    const johnDeerePatterns = [
      /Your organization name is:/i,
      /Your Equipment:/i,
      /Your Fields:/i,
      /Your Recent Operations:/i,
      /Green Growth/i, // Specific to the user's org
    ]
    
    return johnDeerePatterns.some(pattern => pattern.test(content))
  }

  // Check if this message contains Auravant data
  const isAuravantResponse = () => {
    if (isUser || isSystem) return false
    
    // Look for patterns that indicate this is Auravant data
    const auravantPatterns = [
      /Auravant/i,
      /Your Livestock:/i,
      /Your Herds:/i,
      /Work Orders:/i,
      /Labour Operations:/i,
      /Paddocks:/i,
      /from Auravant/i,
    ]
    
    return auravantPatterns.some(pattern => pattern.test(content))
  }

  // Check if this message contains Satshot data
  const isSatshotResponse = () => {
    if (isUser || isSystem) return false
    
    // Look for patterns that indicate this is Satshot data
    const satshotPatterns = [
      /Satshot/i,
      /satellite imagery/i,
      /field mapping/i,
      /NDVI/i,
      /vegetation index/i,
      /GIS/i,
      /satellite data/i,
      /from Satshot/i,
      /agricultural GIS/i,
    ]
    
    return satshotPatterns.some(pattern => pattern.test(content))
  }

  // Check if this message should show a data source selector
  const shouldShowDataSourceSelector = () => {
    if (isUser || isSystem) return false
    
    // Don't show selector if we already have a data source selected
    if (currentDataSource) return false
    
    // Look for specific patterns that indicate we should show the selector
    const patterns = [
      /show.*data.*source/i,
      /choose.*platform/i,
      /available.*data.*source/i,
      /which.*platform/i,
      /select.*data.*source/i,
      /access.*data.*from.*platform/i,
      /several.*platform/i,
      /multiple.*platform/i,
      /data.*from.*several/i,
      /choose.*which.*platform/i,
      /available.*option/i,
      /show.*available/i,
      /John Deere Operations Center.*Climate FieldView/i, // Specific pattern from system prompt
    ]
    
    return patterns.some(pattern => pattern.test(content))
  }

  // Extract data type from the message content
  const extractDataType = () => {
    if (content.includes('organization')) return 'organizations'
    if (content.includes('field')) return 'fields'
    if (content.includes('equipment')) return 'equipment'
    if (content.includes('operation')) return 'operations'
    return 'organizations' // default
  }

  const handleDataSourceSelect = async (sourceId: string, dataType: string) => {
    if (onDataSourceSelect) {
      await onDataSourceSelect(sourceId, dataType)
    }
  }

  const dataSourcesUsed = getDataSourcesUsed()

  return (
    <div className={`message group ${isUser ? 'user' : isSystem ? 'system' : 'assistant'}`}>
      <div className={`message-avatar ${
        isUser ? 'avatar-user' : 
        isSystem ? 'avatar-system' : 
        isJohnDeereResponse() ? 'avatar-johndeere' : 
        isAuravantResponse() ? 'avatar-auravant' :
        'avatar-assistant'
      }`}>
        {getIcon()}
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="name">
            {getName()}
          </span>
          <span className="time">{formatDate(timestamp)}</span>
        </div>

        <div className="message-text">
          {isUser ? (
            // For user messages, display as plain text
            <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {content}
            </div>
          ) : (
            // For assistant messages, render markdown with isolated styling
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  // Custom styling for markdown elements
                  p: ({ children }: any) => <p className="markdown-p">{children}</p>,
                  strong: ({ children }: any) => <strong className="markdown-strong">{children}</strong>,
                  em: ({ children }: any) => <em className="markdown-em">{children}</em>,
                  ul: ({ children }: any) => <ul className="markdown-ul">{children}</ul>,
                  ol: ({ children }: any) => <ol className="markdown-ol">{children}</ol>,
                  li: ({ children }: any) => <li className="markdown-li">{children}</li>,
                  code: ({ children }: any) => <code className="markdown-code">{children}</code>,
                  pre: ({ children }: any) => <pre className="markdown-pre">{children}</pre>,
                  blockquote: ({ children }: any) => <blockquote className="markdown-blockquote">{children}</blockquote>,
                  h1: ({ children }: any) => <h1 className="markdown-h1">{children}</h1>,
                  h2: ({ children }: any) => <h2 className="markdown-h2">{children}</h2>,
                  h3: ({ children }: any) => <h3 className="markdown-h3">{children}</h3>,
                }}
              >
                {content}
              </ReactMarkdown>
              
              {/* Show data source selector if the message indicates it */}
              {shouldShowDataSourceSelector() && onDataSourceSelect && (
                <DataSourceSelector
                  dataType={extractDataType()}
                  onSelect={handleDataSourceSelect}
                />
              )}
            </div>
          )}
          
          {/* Render visualizations if present */}
          {visualizations && visualizations.length > 0 && (
            <MessageVisualization visualizations={visualizations} />
          )}
          
          {/* Show reasoning validation results for assistant messages */}
          {!isUser && !isSystem && reasoning && (
            <div className={`mt-3 p-3 rounded-lg border ${
              reasoning.isValid 
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  reasoning.isValid ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Response Validation
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  reasoning.confidence >= 0.8 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
                    : reasoning.confidence >= 0.6 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
                }`}>
                  {Math.round(reasoning.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {reasoning.explanation}
              </p>
              {reasoning.suggestions && reasoning.suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">
                    Suggestions:
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {reasoning.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-gray-400">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {fileAttachments && fileAttachments.length > 0 && (
            <div className="mt-4">
              {fileAttachments.map((file, index) => (
                <div key={index} className="file-attachment">
                  <Paperclip className="icon" />
                  <div className="info">
                    <span className="name">{file.filename}</span>
                    <span className="size">({(file.fileSize / 1024).toFixed(1)} KB)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Data Sources Used Indicator - only show for assistant messages */}
          {!isUser && !isSystem && dataSourcesUsed.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '12px',
              paddingTop: '8px',
              borderTop: '1px solid #333'
            }}>
              <span style={{
                fontSize: '11px',
                color: '#777',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '500'
              }}>
                Data from:
              </span>
              {dataSourcesUsed.map(sourceId => {
                const source = dataSourceInfo[sourceId as keyof typeof dataSourceInfo]
                if (!source) return null
                
                return (
                  <div
                    key={sourceId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: '#2a2a2a',
                      border: `1px solid ${source.color}40`,
                      borderRadius: '12px',
                      color: source.color,
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                    title={source.name}
                  >
                    {source.icon}
                    <span>{source.name}</span>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Message Reactions - only show for assistant messages */}
          {!isUser && !isSystem && messageId && (
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <MessageReactions
                messageId={messageId}
                content={content}
                className="justify-end"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 