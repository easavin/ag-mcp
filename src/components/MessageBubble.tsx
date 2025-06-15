'use client'

import { User, Bot, Paperclip, Settings } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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
          {content}
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