'use client'

import { useEffect } from 'react'
import ChatLayout from '@/components/ChatLayout'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import { useChatStore } from '@/stores/chatStore'

export default function Home() {
  const {
    currentSessionId,
    sessions,
    isLoading,
    error,
    createSession,
    addMessage,
    loadSessions,
    setCurrentSession,
  } = useChatStore()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Get current session and messages
  const currentSession = sessions.find(s => s.id === currentSessionId)
  const messages = currentSession?.messages || []

  const handleSendMessage = async (content: string, files?: File[]) => {
    try {
      let sessionId = currentSessionId

      // Create a new session if none exists
      if (!sessionId) {
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content
        const newSession = await createSession(title)
        sessionId = newSession.id
      }

      // Add user message
      const fileAttachments = files?.map(file => ({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
      }))

      await addMessage(sessionId, {
        role: 'user',
        content,
        fileAttachments,
      })

      // Generate and add assistant response
      const assistantResponse = getAssistantResponse(content, files)
      await addMessage(sessionId, {
        role: 'assistant',
        content: assistantResponse,
      })
    } catch (error) {
      console.error('Error sending message:', error)
    }
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

  const isInitialState = messages.length === 0

  if (error) {
    return (
      <ChatLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400 text-center">
            <p>Error: {error}</p>
            <button 
              onClick={() => loadSessions()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </ChatLayout>
    )
  }

  return (
    <ChatLayout>
      <div className="flex flex-col h-full" style={{ height: '100%' }}>
        {isInitialState ? (
          // Welcome screen layout with chat input positioned closer to title
          <div className="flex flex-col h-full">
            <div className="welcome-container-compact">
              <h1 className="welcome-title">Ag Assistant</h1>
              <p className="welcome-subtitle">Start a conversation to manage your farming operations.</p>
            </div>
            <div className="welcome-chat-input">
              <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
            </div>
            <div className="flex-1"></div> {/* Spacer to push everything up */}
          </div>
        ) : (
          // Regular chat layout
          <>
            <div className="messages-container justify-end">
              <div className="messages-content">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.createdAt}
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
            </div>
            <div className="chat-input-container">
              <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
            </div>
          </>
        )}
      </div>
    </ChatLayout>
  )
}
