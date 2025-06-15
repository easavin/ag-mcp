'use client'

import { useState } from 'react'
import { MessageSquare, Settings, Plus } from 'lucide-react'

interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
          <button className="new-chat-btn">
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          
          <div className="chat-history-section">
            <h3>Recent Chats</h3>
            <div>
              <div className="chat-history-item">
                <div className="title">Field Analysis</div>
                <div className="time">2 hours ago</div>
              </div>
              <div className="chat-history-item">
                <div className="title">Equipment Status</div>
                <div className="time">Yesterday</div>
              </div>
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