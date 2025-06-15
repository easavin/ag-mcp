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
  const [messages, setMessages] = useState<Message[]>([])
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

  const isInitialState = messages.length === 0;

  return (
    <ChatLayout>
      <div className="flex flex-col h-full" style={{ height: '100%' }}>
        <div 
          className={`messages-container ${isInitialState ? 'justify-center' : 'justify-end'}`}
          style={isInitialState ? {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          } : {}}
        >
          {isInitialState ? (
            <div className="welcome-container" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
              maxWidth: '900px',
              margin: '0 auto',
              padding: '2rem'
            }}>
              <h1 className="welcome-title" style={{
                fontSize: '3rem',
                fontWeight: 600,
                marginBottom: '1rem',
                color: '#f5f5f5'
              }}>Ag Assistant</h1>
              <p className="welcome-subtitle" style={{
                fontSize: '1.25rem',
                color: '#a0a0a0',
                marginBottom: '3rem',
                maxWidth: '600px'
              }}>Start a conversation to manage your farming operations.</p>
            </div>
          ) : (
            <div className="messages-content">
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
                <div className="loading-message">
                  <div className="loading-avatar" />
                  <div className="loading-content">
                    <div className="name">Ag Assistant</div>
                    <div className="text" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ 
          width: '100%', 
          maxWidth: '900px', 
          margin: '0 auto',
          padding: '1rem 0'
        }}>
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </ChatLayout>
  )
}
