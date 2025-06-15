'use client'

import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    <div className={cn('flex gap-3 p-4', isUser ? 'bg-gray-50' : 'bg-white')}>
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {isUser ? 'You' : 'Ag Assistant'}
          </span>
          <span className="text-xs text-gray-500">{formatDate(timestamp)}</span>
        </div>

        {/* File attachments */}
        {fileAttachments && fileAttachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {fileAttachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg text-sm"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-700">{file.filename}</span>
                <span className="text-gray-500">
                  ({(file.fileSize / 1024).toFixed(1)} KB)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        <div className="prose prose-sm max-w-none text-gray-900">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  )
} 