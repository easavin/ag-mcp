'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    johnDeereConnection,
    connectJohnDeere,
    disconnectJohnDeere,
    checkJohnDeereConnection,
    isLoading,
    error,
  } = useAuthStore()

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  useEffect(() => {
    if (isOpen) {
      checkJohnDeereConnection().then(() => {
        setConnectionStatus(johnDeereConnection.isConnected ? 'connected' : 'disconnected')
      })
    }
  }, [isOpen, checkJohnDeereConnection, johnDeereConnection.isConnected])

  const handleConnect = async () => {
    try {
      const authUrl = await connectJohnDeere()
      // Open John Deere authorization in a new window
      window.open(authUrl, 'johndeere-auth', 'width=600,height=700,scrollbars=yes,resizable=yes')
    } catch (error) {
      console.error('Failed to initiate John Deere connection:', error)
    }
  }

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your John Deere account? This will remove access to your farming data.')) {
      try {
        await disconnectJohnDeere()
        setConnectionStatus('disconnected')
      } catch (error) {
        console.error('Failed to disconnect John Deere account:', error)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* John Deere Connection Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white mb-3">John Deere Integration</h3>
            
            {/* Connection Status */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                {connectionStatus === 'checking' ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : connectionStatus === 'connected' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-white font-medium">
                  {connectionStatus === 'checking' 
                    ? 'Checking connection...'
                    : connectionStatus === 'connected' 
                    ? 'Connected to John Deere'
                    : 'Not connected to John Deere'
                  }
                </span>
              </div>
              
              {connectionStatus === 'connected' && johnDeereConnection.expiresAt && (
                <div className="text-sm text-gray-400">
                  <p>Scope: {johnDeereConnection.scope || 'ag1, ag2, ag3'}</p>
                  <p>Expires: {new Date(johnDeereConnection.expiresAt).toLocaleDateString()}</p>
                  {johnDeereConnection.lastSync && (
                    <p>Last sync: {new Date(johnDeereConnection.lastSync).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>

            {/* Connection Actions */}
            {connectionStatus === 'connected' ? (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Disconnect John Deere Account'
                )}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Connect John Deere Account
                  </>
                )}
              </button>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-900 border border-red-700 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-4 text-sm text-gray-400">
              <p>
                Connecting your John Deere Operations Center account allows the AI assistant to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Access your field boundaries and crop data</li>
                <li>View equipment location and status</li>
                <li>Upload prescription files</li>
                <li>Analyze work records and yield data</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 