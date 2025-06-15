'use client'

import { User, Bot, Paperclip } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="name">
            {isUser ? 'You' : 'Ag Assistant'}
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