'use client'

import { useEffect, useRef } from 'react'
import ChatLayout from '@/components/ChatLayout'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import { NotificationProvider, useNotificationHelpers } from '@/components/NotificationSystem'
import { MessageSkeleton } from '@/components/LoadingStates'
// import JohnDeereDataButton from '@/components/JohnDeereDataButton'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'

function ChatInterface() {
  const {
    currentSessionId,
    sessions,
    isLoading,
    error,
    createSession,
    sendMessage,
    addMessage,
    loadSessions,
    setCurrentSession,
  } = useChatStore()

  const { user, loadUser, checkJohnDeereConnection } = useAuthStore()
  const { success, error: notifyError, info } = useNotificationHelpers()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLDivElement>(null)

  // Get current session and messages
  const currentSession = sessions.find(s => s.id === currentSessionId)
  const messages = currentSession?.messages || []

  // Load sessions and user data on mount
  useEffect(() => {
    loadSessions()
    loadUser()
    checkJohnDeereConnection()
  }, [loadSessions, loadUser, checkJohnDeereConnection])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Keep focus on chat input after sending message
  useEffect(() => {
    if (!isLoading && chatInputRef.current) {
      const textarea = chatInputRef.current.querySelector('textarea')
      if (textarea) {
        textarea.focus()
      }
    }
  }, [isLoading])

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

      // Show notification for file uploads
      if (files && files.length > 0) {
        info('Files uploaded', `${files.length} file(s) attached to your message`)
      }

      // Send message and get LLM response
      await sendMessage(sessionId, content, fileAttachments)
    } catch (error) {
      console.error('Error sending message:', error)
      notifyError('Message failed', 'Failed to send your message. Please try again.')
    }
  }

  const handleDataFetched = async (data: any) => {
    let content: string
    
    if (typeof data === 'string') {
      content = data
    } else if (data && typeof data === 'object') {
      // Handle the new structured data format
      if (data.title && data.content) {
        content = `**${data.title}**\n\n${data.content}`
      } else {
        content = JSON.stringify(data, null, 2)
      }
    } else {
      content = 'Received John Deere data'
    }

    // Send the fetched data as an assistant message
    await handleSendMessage(content)
  }

  const handleDataSourceSelect = async (sourceId: string, dataType: string) => {
    try {
      console.log('🎯 Data source selected:', { sourceId, dataType })
      info('Fetching data', `Loading ${dataType} from ${sourceId}...`)
      
      let response: Response
      let data: any
      
      if (dataType === 'organizations') {
        // Direct organizations endpoint
        response = await fetch(`/api/johndeere/${dataType}`)
      } else {
        // For other data types, we need to get organization first, then fetch the specific data
        console.log('🔍 Fetching organization first for nested endpoint...')
        const orgResponse = await fetch('/api/johndeere/organizations')
        
        if (!orgResponse.ok) {
          throw new Error('Failed to fetch organization data')
        }
        
        const orgData = await orgResponse.json()
        
        if (!orgData.organizations || orgData.organizations.length === 0) {
          throw new Error('No organizations found')
        }
        
        const orgId = orgData.organizations[0].id
        console.log('🏢 Using organization ID:', orgId)
        
        // Now fetch the specific data type for this organization
        response = await fetch(`/api/johndeere/organizations/${orgId}/${dataType}`)
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${dataType} data`)
      }
      
      data = await response.json()
      
      // Format the response based on data type
      let content: string
      if (dataType === 'organizations' && data.organizations && data.organizations.length > 0) {
        const org = data.organizations[0]
        content = `Your organization name is: **${org.name}**`
      } else if (dataType === 'equipment' && data.equipment && data.equipment.length > 0) {
        const equipmentList = data.equipment.map((eq: any) => `• **${eq.name}** (${eq.make} ${eq.model})`).join('\n')
        content = `**Your Equipment:**\n\n${equipmentList}`
      } else if (dataType === 'fields' && data.fields && data.fields.length > 0) {
        const fieldsList = data.fields.map((field: any) => `• **${field.name}** (${field.area.measurement} ${field.area.unit})`).join('\n')
        content = `**Your Fields:**\n\n${fieldsList}`
      } else if (dataType === 'operations' && data.operations && data.operations.length > 0) {
        const operationsList = data.operations.map((op: any) => `• **${op.type}** - ${op.operationType}`).join('\n')
        content = `**Your Recent Operations:**\n\n${operationsList}`
      } else if (data.title && data.content) {
        content = `**${data.title}**\n\n${data.content}`
      } else {
        content = JSON.stringify(data, null, 2)
      }
      
      // Add the response directly as an assistant message (no LLM call needed)
      if (currentSessionId) {
        await addMessage(currentSessionId, {
          role: 'assistant',
          content
        })
        success('Data loaded', `Successfully loaded ${dataType} data`)
      }
    } catch (error) {
      console.error('❌ Error fetching data source:', error)
      notifyError('Data fetch failed', `Couldn't load ${dataType} data. Please try again.`)
      
      // Add error message directly as assistant message
      if (currentSessionId) {
        await addMessage(currentSessionId, {
          role: 'assistant',
          content: `Sorry, I couldn't fetch the ${dataType} data. Please try again.`
        })
      }
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
          // Regular chat layout with proper scrolling
          <div className="flex flex-col h-full">
            <div 
              className="messages-container"
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                paddingBottom: '20px'
              }}
            >
              <div className="messages-content" style={{ flex: 1 }}>
                {/* <JohnDeereDataButton onDataReceived={handleDataFetched} /> */}
                
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    messageId={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.createdAt}
                    fileAttachments={message.fileAttachments}
                    onDataSourceSelect={handleDataSourceSelect}
                  />
                ))}
                
                {isLoading && (
                  <MessageSkeleton isUser={false} />
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="chat-input-container" style={{ flexShrink: 0 }} ref={chatInputRef}>
              <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
            </div>
          </div>
        )}
      </div>
    </ChatLayout>
  )
}

export default function Home() {
  return (
    <NotificationProvider>
      <ChatInterface />
    </NotificationProvider>
  )
}
