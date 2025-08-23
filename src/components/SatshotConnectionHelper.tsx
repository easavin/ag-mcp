'use client'

import { useState, useEffect } from 'react'
import { Check, X, Loader2, Satellite, AlertTriangle, Info } from 'lucide-react'

interface SatshotConnectionStatus {
  connected: boolean
  hasToken: boolean
  connectionValid: boolean
  hasEnvCredentials: boolean
  server: string
  username?: string
  lastUsed?: string
  connectedAt?: string
}

interface SatshotConnectionHelperProps {
  onStatusChange?: (status: { connected: boolean }) => void
}

export default function SatshotConnectionHelper({ onStatusChange }: SatshotConnectionHelperProps) {
  const [status, setStatus] = useState<SatshotConnectionStatus>({
    connected: false,
    hasToken: false,
    connectionValid: false,
    hasEnvCredentials: false,
    server: 'us'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Check connection status
  const checkStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/satshot/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const result = await response.json()
        setStatus(result.data)
        onStatusChange?.({ connected: result.data.connected })
      } else {
        throw new Error('Failed to check status')
      }
    } catch (error) {
      console.error('Error checking Satshot status:', error)
      setError('Failed to check connection status')
    } finally {
      setIsLoading(false)
    }
  }

  // Connect to Satshot
  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/auth/satshot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSuccessMessage(result.message)
        await checkStatus() // Refresh status
      } else {
        setError(result.error || result.message || 'Connection failed')
      }
    } catch (error) {
      console.error('Satshot connection error:', error)
      setError('Failed to connect to Satshot')
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect from Satshot
  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/auth/satshot/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSuccessMessage(result.message)
        await checkStatus() // Refresh status
      } else {
        setError(result.error || 'Disconnection failed')
      }
    } catch (error) {
      console.error('Satshot disconnection error:', error)
      setError('Failed to disconnect from Satshot')
    } finally {
      setIsDisconnecting(false)
    }
  }

  // Clear messages after a delay
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, error])

  // Initial status check
  useEffect(() => {
    checkStatus()
  }, [])

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <div className="status-badge loading">
          <Loader2 className="status-icon animate-spin" size={12} />
          Checking...
        </div>
      )
    }

    if (status.connected && status.connectionValid) {
      return (
        <div className="status-badge connected">
          <div className="status-dot"></div>
          Connected
        </div>
      )
    }

    if (status.connected && !status.connectionValid) {
      return (
        <div className="status-badge warning">
          <AlertTriangle className="status-icon" size={12} />
          Connection Issues
        </div>
      )
    }

    return (
      <div className="status-badge disconnected">
        <X className="status-icon" size={12} />
        Not Connected
      </div>
    )
  }

  const getActionButton = () => {
    if (!status.hasEnvCredentials) {
      return (
        <div className="env-credentials-info">
          <Info className="w-4 h-4 text-blue-500" />
          <p className="text-sm text-gray-600">
            Satshot credentials need to be configured on the server.
            Contact your administrator to set up SATSHOT_USERNAME and SATSHOT_PASSWORD.
          </p>
        </div>
      )
    }

    if (status.connected) {
      return (
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="disconnect-button"
        >
          {isDisconnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Disconnecting...
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              Disconnect
            </>
          )}
        </button>
      )
    }

    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="connect-button"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Satellite className="w-4 h-4" />
            Connect to Satshot
          </>
        )}
      </button>
    )
  }

  return (
    <div className="satshot-connection-helper">
      {/* Status Section */}
      <div className="connection-status">
        <div className="status-header">
          <Satellite className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Satshot GIS Connection</span>
          {getStatusBadge()}
        </div>

        {/* Connection Details */}
        {status.connected && (
          <div className="connection-details">
            <div className="detail-item">
              <span className="detail-label">Server:</span>
              <span className="detail-value">{status.server}.satshot.com</span>
            </div>
            {status.username && (
              <div className="detail-item">
                <span className="detail-label">Username:</span>
                <span className="detail-value">{status.username}</span>
              </div>
            )}
            {status.connectedAt && (
              <div className="detail-item">
                <span className="detail-label">Connected:</span>
                <span className="detail-value">
                  {new Date(status.connectedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {status.lastUsed && (
              <div className="detail-item">
                <span className="detail-label">Last Used:</span>
                <span className="detail-value">
                  {new Date(status.lastUsed).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {successMessage && (
          <div className="message success-message">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="message error-message">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="connection-actions">
          {getActionButton()}
        </div>

        {/* Info Section */}
        <div className="connection-info">
          <h4>Satshot GIS Features:</h4>
          <ul className="feature-list">
            <li>Satellite imagery analysis</li>
            <li>Field mapping and boundaries</li>
            <li>Agricultural GIS tools</li>
            <li>Vegetation index calculations</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .satshot-connection-helper {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
        }

        .connection-status {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-left: auto;
        }

        .status-badge.connected {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.disconnected {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-badge.warning {
          background: #fef3c7;
          color: #d97706;
        }

        .status-badge.loading {
          background: #e0e7ff;
          color: #4338ca;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
        }

        .status-icon {
          width: 12px;
          height: 12px;
        }

        .connection-details {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .detail-item:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-weight: 500;
          color: #64748b;
        }

        .detail-value {
          color: #1e293b;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .success-message {
          background: #dcfce7;
          color: #166534;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
        }

        .connection-actions {
          display: flex;
          gap: 8px;
        }

        .connect-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .connect-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .connect-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .disconnect-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ef4444;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .disconnect-button:hover:not(:disabled) {
          background: #dc2626;
        }

        .disconnect-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .env-credentials-info {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 12px;
        }

        .connection-info {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
        }

        .connection-info h4 {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .feature-list li {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 4px;
          padding-left: 16px;
          position: relative;
        }

        .feature-list li:before {
          content: '•';
          color: #3b82f6;
          position: absolute;
          left: 0;
        }
      `}</style>
    </div>
  )
}
