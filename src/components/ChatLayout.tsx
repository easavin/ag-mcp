'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Settings, Plus, Trash2, LogOut, ChevronUp } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import SettingsModal from './SettingsModal'
import IntegrationsModal from './IntegrationsModal'

interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])
  
  const {
    currentSessionId,
    sessions,
    createSession,
    deleteSession,
    setCurrentSession,
    isLoading,
  } = useChatStore()

  const { user } = useAuthStore()

  const handleNewChat = async () => {
    if (!user) return // Don't allow new chat for unauthenticated users
    
    try {
      const newSession = await createSession('New Chat')
      setCurrentSession(newSession.id)
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  const handleSelectSession = (sessionId: string) => {
    setCurrentSession(sessionId)
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

  return (
    <div className="chat-layout">
      {/* Sidebar - hidden on mobile and for unauthenticated users */}
      {user && (
        <div className={`sidebar hidden md:flex ${!sidebarOpen ? 'w-0 overflow-hidden' : ''}`}>
          <div className="sidebar-header">
            <h2>Farm MCP</h2>
          </div>
          
          <div className="sidebar-content">
            <button 
              className="new-chat-btn"
              onClick={handleNewChat}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            
            <div className="chat-history-section">
              <h3>Recent Chats</h3>
              <div>
                {sessions.length === 0 ? (
                  <div className="text-gray-500 text-sm p-4 text-center">
                    No chats yet. Start a new conversation!
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`chat-history-item ${
                        currentSessionId === session.id ? 'active' : ''
                      }`}
                      onClick={() => handleSelectSession(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="title">{session.title}</div>
                        <div className="time">
                          {formatDate(session.updatedAt)}
                        </div>
                      </div>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="sidebar-footer">
            <button 
              className="settings-btn"
              onClick={() => setShowIntegrations(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              Integrations
            </button>
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6"/>
                <path d="M1 12h6m6 0h6"/>
              </svg>
              Settings
            </button>
            
            {/* User Information with Dropdown */}
            <div ref={userMenuRef} className="user-info-container" style={{ position: 'relative' }}>
              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="user-dropdown" style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  zIndex: 1000,
                  backdropFilter: 'blur(8px)',
                  padding: '4px'
                }}>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      signOut()
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      color: '#e5e5e5',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#404040'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
              
              {/* User Info Button */}
              <button 
                className="user-info"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  color: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#333'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div className="user-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="user-details" style={{ flex: 1, textAlign: 'left' }}>
                  <div className="user-name">{user.name || 'User'}</div>
                  <div className="user-email">{user.email}</div>
                </div>
                <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="chat-main" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#1c1c1c',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        minHeight: 0
      }}>
        {user && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg z-10 border border-gray-600 hidden md:block"
          >
            <MessageSquare className="w-4 h-4 text-white" />
          </button>
        )}
        <div style={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0
        }}>
          {children}
        </div>
      </main>

      {/* Settings Modal - only for authenticated users */}
      {user && (
        <>
          <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
          />
          
          <IntegrationsModal 
            isOpen={showIntegrations} 
            onClose={() => setShowIntegrations(false)} 
          />
        </>
      )}
    </div>
  )
} 