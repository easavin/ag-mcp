'use client'

import { User, Bot, Paperclip, Settings } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date | string
  fileAttachments?: Array<{
    filename: string
    fileType: string
    fileSize: number
  }>
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  fileAttachments,
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
            // For assistant messages, render markdown
            <ReactMarkdown
              components={{
                // Custom styling for markdown elements
                p: ({ children }: any) => <p style={{ marginBottom: '1em', lineHeight: '1.6' }}>{children}</p>,
                strong: ({ children }: any) => <strong style={{ fontWeight: '600', color: '#f5f5f5' }}>{children}</strong>,
                em: ({ children }: any) => <em style={{ fontStyle: 'italic', color: '#e0e0e0' }}>{children}</em>,
                ul: ({ children }: any) => <ul style={{ marginLeft: '1.5em', marginBottom: '1em' }}>{children}</ul>,
                ol: ({ children }: any) => <ol style={{ marginLeft: '1.5em', marginBottom: '1em' }}>{children}</ol>,
                li: ({ children }: any) => <li style={{ marginBottom: '0.5em' }}>{children}</li>,
                code: ({ children }: any) => (
                  <code style={{ 
                    backgroundColor: '#2a2a2a', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.9em',
                    color: '#f5f5f5'
                  }}>
                    {children}
                  </code>
                ),
                pre: ({ children }: any) => (
                  <pre style={{ 
                    backgroundColor: '#2a2a2a', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    overflow: 'auto',
                    marginBottom: '1em'
                  }}>
                    {children}
                  </pre>
                ),
                blockquote: ({ children }: any) => (
                  <blockquote style={{ 
                    borderLeft: '4px solid #059669', 
                    paddingLeft: '1em', 
                    marginLeft: '0',
                    marginBottom: '1em',
                    color: '#a0a0a0'
                  }}>
                    {children}
                  </blockquote>
                ),
                h1: ({ children }: any) => <h1 style={{ fontSize: '1.5em', fontWeight: '600', marginBottom: '0.5em', color: '#f5f5f5' }}>{children}</h1>,
                h2: ({ children }: any) => <h2 style={{ fontSize: '1.3em', fontWeight: '600', marginBottom: '0.5em', color: '#f5f5f5' }}>{children}</h2>,
                h3: ({ children }: any) => <h3 style={{ fontSize: '1.1em', fontWeight: '600', marginBottom: '0.5em', color: '#f5f5f5' }}>{children}</h3>,
              }}
            >
              {content}
            </ReactMarkdown>
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