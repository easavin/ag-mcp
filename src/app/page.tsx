'use client'

import { useEffect, useRef } from 'react'
import ChatLayout from '@/components/ChatLayout'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import MobileMenu from '@/components/MobileMenu'
import { MessageSkeleton } from '@/components/LoadingStates'
import ProgressIndicator, { useProgressIndicator } from '@/components/ProgressIndicator'
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
  const { steps, addStep, updateStep, clearSteps } = useProgressIndicator()
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
        console.info('Files uploaded', `${files.length} file(s) attached to your message`)
      }

      // Send message and get LLM response
      await sendMessage(sessionId, content, fileAttachments)
    } catch (error) {
      console.error('Error sending message:', error)
      console.info('Message failed', 'Failed to send your message. Please try again.')
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
    if (sourceId !== 'johndeere') {
      // Handle other data sources in the future
      return
    }

    if (!currentSessionId) {
      console.error('No current session available')
      return
    }

    console.log(`🔄 Fetching ${dataType} data from John Deere...`)
    
    // Clear any previous progress steps
    clearSteps()
    
    // Add initial step
    const fetchStepId = addStep({
      status: 'loading',
      message: `Fetching data from John Deere...`,
      details: `Loading ${dataType} from johndeere`
    })

    try {
      // First, get organizations if needed
      let organizationStepId
      if (['fields', 'equipment', 'operations', 'comprehensive'].includes(dataType)) {
        organizationStepId = addStep({
          status: 'loading',
          message: 'Getting organization details...',
          details: 'Fetching your John Deere organizations'
        })
      }

      const response = await fetch('/api/chat/johndeere-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType,
          organizationId: null, // Let the API auto-select
          filters: {}
        }),
      })

      const result = await response.json()

      // Update organization step if it was created
      if (organizationStepId) {
        updateStep(organizationStepId, {
          status: 'success',
          message: 'Organization found',
          details: 'Using your default organization'
        })
      }

      if (!response.ok) {
        updateStep(fetchStepId, {
          status: 'error',
          message: 'Failed to fetch data',
          details: result.error || 'Unknown error occurred'
        })
        
        // Also add error message to chat
        addMessage(currentSessionId!, {
          role: 'assistant',
          content: `❌ **Error fetching ${dataType}**\n\n${result.error || 'Unknown error occurred'}\n\nPlease check your John Deere connection and try again.`
        })
        return
      }

      // Success!
      updateStep(fetchStepId, {
        status: 'success',
        message: `${dataType} data retrieved successfully`,
        details: result.mockData ? 'Using demo data (sandbox limitations)' : `Found ${Array.isArray(result.data) ? result.data.length : 'some'} items`
      })

      // Format and add the data response to chat
      let responseContent = ''
      
      if (result.mockData && result.message) {
        responseContent = `**John Deere ${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (Demo Data)**\n\n${result.message}`
      } else {
        // Format real data
        responseContent = `**Your ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}**\n\n`
        
        if (Array.isArray(result.data)) {
          if (dataType === 'fields') {
            responseContent += result.data.map((field: any) => 
              `• **${field.name}**: ${field.area?.measurement || 'Unknown'} ${field.area?.unit || 'acres'}`
            ).join('\n')
          } else if (dataType === 'equipment') {
            responseContent += result.data.map((equipment: any) => 
              `• **${equipment.name}** (${equipment.make} ${equipment.model})`
            ).join('\n')
          } else if (dataType === 'operations') {
            responseContent += result.data.map((op: any) => 
              `• **${op.operationType}** - ${new Date(op.startTime).toLocaleDateString()}`
            ).join('\n')
          } else {
            responseContent += JSON.stringify(result.data, null, 2)
          }
        } else {
          responseContent += JSON.stringify(result.data, null, 2)
        }
      }

      addMessage(currentSessionId!, {
        role: 'assistant',
        content: responseContent
      })

      // Clear progress steps after a short delay
      setTimeout(() => {
        clearSteps()
      }, 2000)

    } catch (error) {
      console.error('Error fetching John Deere data:', error)
      
      updateStep(fetchStepId, {
        status: 'error',
        message: 'Connection failed',
        details: error instanceof Error ? error.message : 'Network error'
      })

      addMessage(currentSessionId!, {
        role: 'assistant',
        content: `❌ **Connection Error**\n\nFailed to connect to John Deere API: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your internet connection and try again.`
      })
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
    <>
      {/* Mobile Menu - only visible on mobile */}
      <MobileMenu className="md:hidden" />
      
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
                  
                  {/* Show progress indicator if there are active steps */}
                  {steps.length > 0 && (
                    <ProgressIndicator steps={steps} />
                  )}
                  
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
    </>
  )
}

export default function Home() {
  return (
    <ChatInterface />
  )
}
