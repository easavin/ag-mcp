'use client'

import { useEffect } from 'react'
import ChatLayout from '@/components/ChatLayout'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'

export default function Home() {
  const {
    currentSessionId,
    sessions,
    isLoading,
    error,
    createSession,
    sendMessage,
    loadSessions,
    setCurrentSession,
  } = useChatStore()

  const { user, loadUser } = useAuthStore()

  // Load sessions and user data on mount
  useEffect(() => {
    loadSessions()
    loadUser()
  }, [loadSessions, loadUser])

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

      // Process file attachments
      const fileAttachments = files?.map(file => ({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
      }))

      // Send message and get LLM response
      await sendMessage(sessionId, content, fileAttachments)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }



  const isInitialState = messages.length === 0

  // Get the welcome title based on user data
  const getWelcomeTitle = () => {
    if (user?.name) {
      const firstName = user.name.split(' ')[0]
      return `Hi ${firstName},`
    }
    return 'Ag Assistant'
  }

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
              <h1 className="welcome-title">{getWelcomeTitle()}</h1>
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
