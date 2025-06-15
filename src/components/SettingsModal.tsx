'use client'

import { useState, useEffect } from 'react'
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
  } = useAuthStore()

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      checkJohnDeereConnection().then(() => {
        setConnectionStatus(johnDeereConnection.isConnected ? 'connected' : 'disconnected')
      })
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, checkJohnDeereConnection, johnDeereConnection.isConnected])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const authUrl = await connectJohnDeere()
      // Open John Deere authorization in a new window
      window.open(authUrl, 'johndeere-auth', 'width=600,height=700,scrollbars=yes,resizable=yes')
    } catch (error) {
      console.error('Failed to initiate John Deere connection:', error)
    } finally {
      setIsConnecting(false)
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3 className="modal-section-title">John Deere Integration</h3>
            
            <div className="connection-status">
              <div className={`status-indicator ${connectionStatus === 'connected' ? 'connected' : ''}`}></div>
              <span className="status-text">
                {connectionStatus === 'checking' 
                  ? 'Checking connection...'
                  : connectionStatus === 'connected' 
                  ? 'Connected to John Deere'
                  : 'Not connected to John Deere'
                }
              </span>
            </div>

            {connectionStatus === 'connected' && johnDeereConnection.expiresAt && (
              <div className="modal-section-description">
                <p>Scope: {johnDeereConnection.scope || 'ag1, ag2, ag3'}</p>
                <p>Expires: {new Date(johnDeereConnection.expiresAt).toLocaleDateString()}</p>
                {johnDeereConnection.lastSync && (
                  <p>Last sync: {new Date(johnDeereConnection.lastSync).toLocaleString()}</p>
                )}
              </div>
            )}

            {connectionStatus !== 'connected' ? (
              <>
                <button 
                  className="connect-btn" 
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect John Deere Account'}
                </button>
                
                <p className="modal-section-description">
                  Connecting your John Deere Operations Center account allows the AI assistant to:
                </p>
                
                <ul className="benefits-list">
                  <li>Access your field boundaries and crop data</li>
                  <li>View equipment location and status</li>
                  <li>Upload prescription files</li>
                  <li>Analyze work records and yield data</li>
                </ul>
              </>
            ) : (
              <button 
                className="disconnect-btn" 
                onClick={handleDisconnect}
              >
                Disconnect Account
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 