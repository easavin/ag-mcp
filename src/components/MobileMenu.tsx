'use client'

import { useState } from 'react'
import { Menu, X, MessageSquare, Settings, Plus, Trash2, Layers } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { formatDate } from '@/lib/utils'
import SettingsModal from './SettingsModal'
import IntegrationsModal from './IntegrationsModal'

interface MobileMenuProps {
  className?: string
}

export default function MobileMenu({ className = '' }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  
  const {
    currentSessionId,
    sessions,
    createSession,
    deleteSession,
    setCurrentSession,
    isLoading,
  } = useChatStore()

  const handleNewChat = async () => {
    try {
      const newSession = await createSession('New Chat')
      setCurrentSession(newSession.id)
      setIsOpen(false) // Close menu after creating new chat
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  const handleSelectSession = (sessionId: string) => {
    setCurrentSession(sessionId)
    setIsOpen(false) // Close menu after selecting session
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteSession(sessionId)
      } catch (error) {
        console.error('Failed to delete session:', error)
      }
    }
  }

  const openSettings = () => {
    setShowSettings(true)
    setIsOpen(false)
  }

  const openIntegrations = () => {
    setShowIntegrations(true)
    setIsOpen(false)
  }

  return (
    <>
      {/* Burger Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`mobile-menu-trigger ${className}`}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          background: 'rgba(42, 42, 42, 0.9)',
          border: '1px solid #444',
          borderRadius: '12px',
          color: '#e0e0e0',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease'
        }}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="mobile-menu-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`mobile-menu-panel ${isOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '280px',
          height: '100vh',
          background: '#111111',
          borderRight: '1px solid #333',
          zIndex: 1002,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Menu Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#111111'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#f5f5f5',
              letterSpacing: '-0.01em'
            }}
          >
            Farm MCP
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '8px',
              border: 'none',
              background: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#a0a0a0',
              transition: 'all 0.15s ease'
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px'
          }}
        >
          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            disabled={isLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              background: 'none',
              border: '1px solid #444',
              borderRadius: '12px',
              fontSize: '15px',
              color: '#f5f5f5',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit'
            }}
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          {/* Chat History */}
          <div>
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#a0a0a0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 16px 0'
              }}
            >
              Recent Chats
            </h3>
            <div>
              {sessions.length === 0 ? (
                <div
                  style={{
                    color: '#777',
                    fontSize: '14px',
                    padding: '16px',
                    textAlign: 'center'
                  }}
                >
                  No chats yet. Start a new conversation!
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: currentSessionId === session.id ? '#2563eb' : 'transparent'
                    }}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: '#a0a0a0' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          color: currentSessionId === session.id ? 'white' : '#f5f5f5',
                          fontWeight: 500,
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {session.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: currentSessionId === session.id ? 'rgba(255,255,255,0.7)' : '#777',
                          marginTop: '2px'
                        }}
                      >
                        {formatDate(session.updatedAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        flexShrink: 0,
                        opacity: 0.7
                      }}
                      title="Delete chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Menu Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <button
            onClick={openIntegrations}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: '#a0a0a0',
              textAlign: 'left',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '15px'
            }}
          >
            <Layers className="w-5 h-5" />
            Integrations
          </button>
          <button
            onClick={openSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: '#a0a0a0',
              textAlign: 'left',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '15px'
            }}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
      
      <IntegrationsModal 
        isOpen={showIntegrations} 
        onClose={() => setShowIntegrations(false)} 
      />
    </>
  )
} 