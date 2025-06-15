'use client'

import { useState } from 'react'
import { MessageSquare, Settings, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col bg-white border-r border-gray-200 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Ag MCP</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <button className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-100 rounded-lg">
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
          
          {/* Chat History will go here */}
          <div className="px-4 pb-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Recent Chats
            </div>
            <div className="space-y-1">
              <div className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                <div className="text-sm text-gray-900">Field Analysis</div>
                <div className="text-xs text-gray-500">2 hours ago</div>
              </div>
              <div className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                <div className="text-sm text-gray-900">Equipment Status</div>
                <div className="text-xs text-gray-500">Yesterday</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-100 rounded-lg">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-lg z-10"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
} 