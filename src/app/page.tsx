'use client'

import { useEffect, useRef, useState } from 'react'
import ChatLayout from '@/components/ChatLayout'
import MessageBubble from '@/components/MessageBubble'
import ChatInput from '@/components/ChatInput'
import MobileMenu from '@/components/MobileMenu'
import { MessageSkeleton } from '@/components/LoadingStates'
import ProgressIndicator, { useProgressIndicator } from '@/components/ProgressIndicator'
import DataSourceIndicator from '@/components/DataSourceIndicator'
import AuthHeader from '@/components/AuthHeader'
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
    createSession,
    sendMessage,
    addMessage,
    loadSessions,
    setCurrentSession,
    setCurrentDataSource,
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

  // Load sessions and user data on mount (but don't block if not authenticated)
  useEffect(() => {
    loadSessions().catch(() => {
      // Ignore errors for unauthenticated users
    })
    loadUser().catch(() => {
      // Ignore errors for unauthenticated users
    })
    checkJohnDeereConnection().catch(() => {
      // Ignore errors for unauthenticated users
    })
  }, [loadSessions, loadUser, checkJohnDeereConnection])

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

  // Create initial session if none exists and user is authenticated
  useEffect(() => {
    if (!currentSessionId && sessions.length === 0 && user) {
      createSession('New Chat')
    }
  }, [currentSessionId, sessions.length, createSession, user])

  // Handle sending messages
  const handleSendMessage = async (content: string, fileAttachments: any[] = []) => {
    if (!user) {
      // Show authentication modal instead of blocking
      setShowAuthModal(true)
      setAuthModalMode('signin')
      return
    }

    if (!currentSessionId) {
      const newSession = await createSession('New Chat')
      if (newSession?.id) {
        await sendMessage(newSession.id, content, fileAttachments)
      }
    } else {
      await sendMessage(currentSessionId, content, fileAttachments)
    }
  }

  return (
    <div className="relative">
      {/* Auth Header */}
      <AuthHeader />
      
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
                  <DataSourceIndicator 
                    currentSource={currentDataSource}
                    onSourceChange={setCurrentDataSource}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {messages.length === 0 && !isLoading && (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <h1 style={{ 
                    fontSize: '24px', 
                    fontWeight: '600', 
                    color: '#f5f5f5', 
                    marginBottom: '16px' 
                  }}>
                    Welcome to Ag MCP
                  </h1>
                  <p style={{ 
                    color: '#a0a0a0', 
                    marginBottom: '32px',
                    fontSize: '16px'
                  }}>
                    Your AI-powered agricultural management assistant for precision Ag apps
                  </p>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: '16px', 
                    maxWidth: '640px', 
                    margin: '0 auto' 
                  }}>
                    <div style={{
                      backgroundColor: '#2a3f2a',
                      border: '1px solid #4a6741',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <h3 style={{ fontWeight: '500', color: '#90c695', marginBottom: '8px' }}>Farm Data Access</h3>
                      <p style={{ fontSize: '14px', color: '#a0c4a5' }}>
                        Connect your FMS accounts to access field data, equipment status, and operations history
                      </p>
                    </div>
                    <div style={{
                      backgroundColor: '#2a3a4f',
                      border: '1px solid #4167a1',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <h3 style={{ fontWeight: '500', color: '#9bb4d4', marginBottom: '8px' }}>AI-Powered Insights</h3>
                      <p style={{ fontSize: '14px', color: '#a5b8d1' }}>
                        Get intelligent recommendations for planting, harvesting, and field management
                      </p>
                    </div>
                  </div>
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
                />
              ))}

              {isLoading && <MessageSkeleton />}

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

