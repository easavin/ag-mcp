'use client'

import { User, Bot, Paperclip, Settings } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import DataSourceSelector from './DataSourceSelector'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date | string
  fileAttachments?: Array<{
    filename: string
    fileType: string
    fileSize: number
  }>
  onDataSourceSelect?: (sourceId: string, dataType: string) => void
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  fileAttachments,
  onDataSourceSelect,
}: MessageBubbleProps) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  const getIcon = () => {
    if (isUser) return <User className="w-4 h-4" />
    if (isSystem) return <Settings className="w-4 h-4" />
    return <Bot className="w-4 h-4" />
  }

  const getName = () => {
    if (isUser) return 'You'
    if (isSystem) return 'System'
    return 'Ag Assistant'
  }

  // Check if this message should show a data source selector
  const shouldShowDataSourceSelector = () => {
    if (isUser || isSystem) return false
    
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

  return (
    <div className={`message ${isUser ? 'user' : isSystem ? 'system' : 'assistant'}`}>
      <div className={`message-avatar ${isUser ? 'avatar-user' : isSystem ? 'avatar-system' : 'avatar-assistant'}`}>
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
        </div>
      </div>
    </div>
  )
} 