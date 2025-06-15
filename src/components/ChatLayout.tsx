'use client'

import { useState } from 'react'
import { MessageSquare, Settings, Plus, Trash2 } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { formatDate } from '@/lib/utils'

interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
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
      {/* Sidebar */}
      <div className={`sidebar ${!sidebarOpen ? 'w-0 overflow-hidden' : ''}`}>
        <div className="sidebar-header">
          <h2>Ag MCP</h2>
          <button onClick={() => setSidebarOpen(false)}>
            <MessageSquare className="w-4 h-4" />
          </button>
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
          <button className="settings-btn">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

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
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg z-10 border border-gray-600"
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
    </div>
  )
} 