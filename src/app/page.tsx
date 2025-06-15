'use client'

import { useState } from 'react'
import ChatLayout from '@/components/ChatLayout'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import { generateId } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  fileAttachments?: Array<{
    filename: string
    fileType: string
    fileSize: number
  }>
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your Ag Assistant. I can help you manage your John Deere operations, analyze field data, and process prescription files. What would you like to know about your farming operations?",
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string, files?: File[]) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
      fileAttachments: files?.map(file => ({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
      })),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: getAssistantResponse(content, files),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  const getAssistantResponse = (content: string, files?: File[]): string => {
    if (files && files.length > 0) {
      return `I've received ${files.length} file(s): ${files.map(f => f.name).join(', ')}. Once you connect your John Deere account, I'll be able to process these prescription files and upload them to your Operations Center. For now, I can help you understand what these files contain and prepare them for upload.`
    }

    const lowerContent = content.toLowerCase()
    if (lowerContent.includes('field') || lowerContent.includes('crop')) {
      return "I'd be happy to help with field and crop information! To access your specific field data, you'll need to connect your John Deere Operations Center account. Once connected, I can show you field boundaries, crop types, planting data, and yield information."
    }
    
    if (lowerContent.includes('equipment') || lowerContent.includes('tractor')) {
      return "For equipment information, I'll need access to your John Deere Operations Center. Once connected, I can provide details about your equipment fleet, location tracking, maintenance schedules, and operational data."
    }

    if (lowerContent.includes('connect') || lowerContent.includes('login')) {
      return "To connect your John Deere Operations Center account, go to Settings and click 'Connect John Deere Account'. You'll be redirected to John Deere's secure login page to authorize the connection."
    }

    return "I'm here to help with your precision agriculture needs! Ask me about fields, equipment, prescriptions, or connecting your John Deere account. What would you like to know?"
  }

  return (
    <ChatLayout>
      <div className="flex flex-col h-full">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              fileAttachments={message.fileAttachments}
            />
          ))}
          
          {isLoading && (
            <div className="flex gap-3 p-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 mb-1">Ag Assistant</div>
                <div className="text-gray-500">Thinking...</div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </ChatLayout>
  )
}
