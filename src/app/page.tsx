'use client'

import { useEffect, useRef, useState } from 'react'
import ChatLayout from '@/components/ChatLayout'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import MobileMenu from '@/components/MobileMenu'
import { ThinkingBubbles } from '@/components/LoadingStates'
import ProgressIndicator, { useProgressIndicator } from '@/components/ProgressIndicator'
import DataSourceIndicator from '@/components/DataSourceIndicator'
import MultiSourceIndicator from '@/components/MultiSourceIndicator'
import AuthModal from '@/components/AuthModal'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'

function ChatInterface() {
  const {
    currentSessionId,
    sessions,
    isLoading,
    error,
    currentDataSource,
    selectedDataSources,
    createSession,
    sendMessage,
    addMessage,
    loadSessions,
    setCurrentSession,
    setCurrentDataSource,
    setSelectedDataSources,
    reprocessLastFarmDataQuestion,
  } = useChatStore()

  const { user, loadUser, checkJohnDeereConnection, johnDeereConnection } = useAuthStore()
  const { steps, addStep, updateStep, clearSteps } = useProgressIndicator()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLDivElement>(null)

  // Get current session and messages
  const currentSession = sessions.find(s => s.id === currentSessionId)
  const messages = currentSession?.messages || []

  // Get the active organization ID
  const organizationId = johnDeereConnection.organizations?.[0]?.id;

  // Load user data on mount (for all users)
  useEffect(() => {
    loadUser().catch(() => {
      // Ignore errors for unauthenticated users
    })
  }, [loadUser])

  // Load sessions and John Deere connection only for authenticated users
  useEffect(() => {
    if (user) {
      loadSessions().catch(() => {
        // Ignore errors for authenticated users with session issues
      })
      checkJohnDeereConnection().catch(() => {
        // Ignore errors for authenticated users with connection issues
      })
    }
  }, [user, loadSessions, checkJohnDeereConnection])

  // Auto-add John Deere to selected sources when connected
  useEffect(() => {
    if (johnDeereConnection.isConnected && !selectedDataSources.includes('johndeere')) {
      setSelectedDataSources([...selectedDataSources, 'johndeere'])
    } else if (!johnDeereConnection.isConnected && selectedDataSources.includes('johndeere')) {
      // Remove John Deere from selected sources if disconnected
      setSelectedDataSources(selectedDataSources.filter(id => id !== 'johndeere'))
    }
  }, [johnDeereConnection.isConnected, selectedDataSources, setSelectedDataSources])

  // Clear auth errors for unauthenticated users (these are expected)
  useEffect(() => {
    if (!user) {
      // Clear any auth-related errors since they're expected for non-authenticated users
      useAuthStore.getState().setError(null)
    }
  }, [user])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Handle sending messages
  const handleSendMessage = async (content: string, fileAttachments: any[] = []) => {
    if (!user) {
      // Show authentication modal instead of blocking
      setShowAuthModal(true)
      setAuthModalMode('signin')
      return
    }

    try {
      let sessionId = currentSessionId

      // Create a new session if none exists (only when user actually sends a message)
      if (!sessionId) {
        const newSession = await createSession('New Chat')
        sessionId = newSession.id
      }

      // Send the message to the session
      if (sessionId) {
        await sendMessage(sessionId, content, fileAttachments)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // The error will be handled by the chat store and displayed in the UI
    }
  }



  // Enhanced data source selection handler that re-processes last farm data question
  const handleDataSourceSelect = async (sourceId: string, dataType: string) => {
    console.log('🔧 Data source selected:', sourceId, 'for', dataType)
    
    // Set the data source first
    setCurrentDataSource(sourceId)
    
    // Re-process the last farm data question if there is one
    if (currentSessionId) {
      try {
        await reprocessLastFarmDataQuestion(currentSessionId)
      } catch (error) {
        console.error('Error re-processing farm data question:', error)
      }
    }
  }

  return (
    <div className="relative">
      <ChatLayout>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header with data source indicator */}
          <div style={{
            flexShrink: 0,
            borderBottom: '1px solid #333',
            backgroundColor: '#1c1c1c',
            padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <MobileMenu />
                {user && (
                  <MultiSourceIndicator 
                    selectedSources={selectedDataSources}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: messages.length === 0 ? 'center' : 'flex-start'
          }}>
            <div style={{ 
              maxWidth: '768px', 
              margin: '0 auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              width: '100%',
              ...(messages.length === 0 ? { justifyContent: 'center', alignItems: 'center', flex: 1 } : {})
            }}>
              {messages.length === 0 && !isLoading && (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <h1 style={{ 
                    fontSize: '32px', 
                    fontWeight: '600', 
                    color: '#f5f5f5', 
                    marginBottom: '16px' 
                  }}>
                    Welcome to Farm MCP
                  </h1>
                  <p style={{ 
                    color: '#a0a0a0', 
                    marginBottom: '32px',
                    fontSize: '18px'
                  }}>
                    Your AI-powered agricultural management assistant for precision Ag apps
                  </p>
                  
                  {/* Authentication buttons for non-authenticated users */}
                  {!user && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => {
                          setAuthModalMode('signin')
                          setShowAuthModal(true)
                        }}
                        style={{
                          padding: '12px 20px',
                          fontSize: '15px',
                          fontWeight: '500',
                          color: 'rgba(255, 255, 255, 0.9)',
                          backgroundColor: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '24px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement
                          target.style.color = 'white'
                          target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                          target.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement
                          target.style.color = 'rgba(255, 255, 255, 0.9)'
                          target.style.backgroundColor = 'transparent'
                          target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                        }}
                      >
                        Log in
                      </button>
                      <button
                        onClick={() => {
                          setAuthModalMode('signup')
                          setShowAuthModal(true)
                        }}
                        style={{
                          padding: '12px 24px',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#1f2937',
                          backgroundColor: 'white',
                          border: 'none',
                          borderRadius: '24px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement
                          target.style.backgroundColor = '#f3f4f6'
                          target.style.transform = 'scale(1.05)'
                          target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement
                          target.style.backgroundColor = 'white'
                          target.style.transform = 'scale(1)'
                          target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                      >
                        Sign up for free
                      </button>
                    </div>
                  )}
                </div>
              )}

              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  messageId={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.createdAt}
                  fileAttachments={message.fileAttachments}
                  onDataSourceSelect={handleDataSourceSelect}
                  currentDataSource={currentDataSource}
                />
              ))}

              {isLoading && <ThinkingBubbles />}

              {/* Progress indicator */}
              {steps.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <ProgressIndicator steps={steps} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid #333',
            backgroundColor: '#1c1c1c'
          }}>
            <div style={{ maxWidth: '768px', margin: '0 auto' }}>
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                organizationId={organizationId}
                placeholder={user 
                  ? "Ask about your farm data or agricultural insights..." 
                  : "Ask anything about agriculture... (Sign in to connect to your FMS accounts)"
                }
              />
            </div>
          </div>
        </div>
      </ChatLayout>

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultMode={authModalMode}
      />
    </div>
  )
}

export default function Home() {
  return <ChatInterface />
}

