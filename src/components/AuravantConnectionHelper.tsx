'use client';

import React, { useState, useEffect } from 'react';

interface AuravantConnectionStatus {
  connected: boolean;
  extensionId?: string;
  lastUpdated?: string;
  tokenExpiry?: string;
  error?: string;
}

interface AuravantConnectionHelperProps {
  onStatusChange?: (status: AuravantConnectionStatus) => void;
}

export default function AuravantConnectionHelper({ onStatusChange }: AuravantConnectionHelperProps) {
  const [connectionStatus, setConnectionStatus] = useState<AuravantConnectionStatus>({ connected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [token, setToken] = useState('');
  const [extensionId, setExtensionId] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(connectionStatus);
    }
  }, [connectionStatus, onStatusChange]);

  const checkConnectionStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/auth/auravant/status');
      const data = await response.json();
      
      if (response.ok) {
        setConnectionStatus({
          connected: data.connected,
          extensionId: data.extensionId,
          lastUpdated: data.lastUpdated,
          tokenExpiry: data.tokenExpiry
        });
      } else {
        setConnectionStatus({ 
          connected: false, 
          error: data.error || 'Failed to check connection status' 
        });
      }
    } catch (error) {
      console.error('Failed to check Auravant connection status:', error);
      setConnectionStatus({ 
        connected: false, 
        error: 'Failed to check connection status' 
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async () => {
    if (!token.trim()) {
      alert('Please enter your Auravant developer token');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/auth/auravant/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.trim(),
          extensionId: extensionId.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setConnectionStatus({ connected: true, extensionId: extensionId.trim() || undefined });
        setToken('');
        setExtensionId('');
        setShowTokenInput(false);
        alert('Successfully connected to Auravant!');
        await checkConnectionStatus(); // Refresh status
      } else {
        alert(`Connection failed: ${data.error || 'Unknown error'}`);
        setConnectionStatus({ 
          connected: false, 
          error: data.error || 'Connection failed' 
        });
      }
    } catch (error) {
      console.error('Auravant connection failed:', error);
      alert('Connection failed. Please check your network and try again.');
      setConnectionStatus({ 
        connected: false, 
        error: 'Network error' 
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Auravant? This will remove access to your agricultural data.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/auravant/disconnect', {
        method: 'POST'
      });

      if (response.ok) {
        setConnectionStatus({ connected: false });
        alert('Successfully disconnected from Auravant');
      } else {
        const data = await response.json();
        alert(`Disconnect failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Auravant disconnect failed:', error);
      alert('Disconnect failed. Please try again.');
    }
  };

  const renderConnectionStatus = () => {
    if (isChecking) {
      return (
        <div className="connection-status loading">
          <span className="status-icon">⏳</span>
          <span>Checking connection...</span>
        </div>
      );
    }

    if (connectionStatus.connected) {
      return (
        <div className="connection-status connected">
          <span className="status-icon">✅</span>
          <span>Connected to Auravant</span>
          {connectionStatus.extensionId && (
            <div className="connection-details">
              <p>Extension ID: {connectionStatus.extensionId}</p>
            </div>
          )}
          {connectionStatus.lastUpdated && (
            <div className="connection-details">
              <p>Last Updated: {new Date(connectionStatus.lastUpdated).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      );
    }

    if (connectionStatus.error) {
      return (
        <div className="connection-status error">
          <span className="status-icon">❌</span>
          <span>Connection Error</span>
          <p className="error-message">{connectionStatus.error}</p>
        </div>
      );
    }

    return (
      <div className="connection-status disconnected">
        <span className="status-icon">⚪</span>
        <span>Not Connected</span>
        <p className="status-message">Connect your Auravant account to access agricultural data.</p>
      </div>
    );
  };

  return (
    <div className="auravant-connection-helper">
      {renderConnectionStatus()}

      {!connectionStatus.connected && !showTokenInput && (
        <div className="connection-actions">
          <button 
            className="connect-btn"
            onClick={() => setShowTokenInput(true)}
          >
            Connect to Auravant
          </button>
        </div>
      )}

      {!connectionStatus.connected && showTokenInput && (
        <div className="token-input-form">
          <div className="form-group">
            <label htmlFor="auravant-token">Developer Token *</label>
            <input
              id="auravant-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Auravant developer token"
              className="token-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="extension-id">Extension ID (Optional)</label>
            <input
              id="extension-id"
              type="text"
              value={extensionId}
              onChange={(e) => setExtensionId(e.target.value)}
              placeholder="Enter your Extension ID"
              className="extension-input"
            />
          </div>

          <div className="form-actions">
            <button 
              className="connect-btn primary"
              onClick={handleConnect}
              disabled={isConnecting || !token.trim()}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
            <button 
              className="cancel-btn"
              onClick={() => {
                setShowTokenInput(false);
                setToken('');
                setExtensionId('');
              }}
              disabled={isConnecting}
            >
              Cancel
            </button>
          </div>

          <div className="help-text">
            <h4>How to get your Auravant developer token:</h4>
            <ol>
              <li>Login to your Auravant account</li>
              <li>Go to Settings → Apply for developer status</li>
              <li>Create an Extension in the Developer Space</li>
              <li>Generate a test token for development</li>
              <li>Copy the token and paste it above</li>
            </ol>
            <p>
              <strong>Need help?</strong> Contact{' '}
              <a href="mailto:devhelp@auravant.com" target="_blank" rel="noopener noreferrer">
                devhelp@auravant.com
              </a>
            </p>
          </div>
        </div>
      )}

      {connectionStatus.connected && (
        <div className="connected-actions">
          <div className="action-buttons">
            <button 
              className="refresh-btn"
              onClick={checkConnectionStatus}
              disabled={isChecking}
            >
              {isChecking ? '↻ Refreshing...' : '↻ Refresh Status'}
            </button>
            <button 
              className="disconnect-btn"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .auravant-connection-helper {
          width: 100%;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .connection-status.loading {
          background-color: #374151;
          color: #d1d5db;
        }

        .connection-status.connected {
          background-color: #064e3b;
          color: #a7f3d0;
        }

        .connection-status.disconnected {
          background-color: #374151;
          color: #d1d5db;
        }

        .connection-status.error {
          background-color: #7f1d1d;
          color: #fca5a5;
        }

        .status-icon {
          font-size: 16px;
        }

        .connection-details {
          margin-top: 8px;
          font-size: 14px;
          opacity: 0.8;
        }

        .connection-details p {
          margin: 4px 0;
        }

        .error-message, .status-message {
          margin-top: 4px;
          font-size: 14px;
        }

        .token-input-form {
          border: 1px solid #444;
          border-radius: 12px;
          padding: 24px;
          background-color: #2a2a2a;
          margin-top: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #e0e0e0;
          font-size: 14px;
        }

        .token-input, .extension-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #555;
          border-radius: 8px;
          font-size: 14px;
          background-color: #1c1c1c;
          color: #e0e0e0;
          transition: all 0.2s ease;
        }

        .token-input::placeholder, .extension-input::placeholder {
          color: #888;
        }

        .token-input:focus, .extension-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          background-color: #222;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .connect-btn, .cancel-btn, .refresh-btn, .disconnect-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .connect-btn.primary {
          background-color: #3b82f6;
          color: white;
        }

        .connect-btn.primary:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .connect-btn.primary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .cancel-btn {
          background-color: #444;
          color: #e0e0e0;
          border: 1px solid #555;
        }

        .cancel-btn:hover:not(:disabled) {
          background-color: #555;
          border-color: #666;
        }

        .refresh-btn {
          background-color: #10b981;
          color: white;
        }

        .refresh-btn:hover:not(:disabled) {
          background-color: #059669;
        }

        .disconnect-btn {
          background-color: #ef4444;
          color: white;
        }

        .disconnect-btn:hover {
          background-color: #dc2626;
        }

        .connect-btn:not(.primary) {
          background-color: #3b82f6;
          color: white;
        }

        .connect-btn:not(.primary):hover {
          background-color: #2563eb;
        }

        .help-text {
          font-size: 13px;
          color: #a0a0a0;
          line-height: 1.5;
          background-color: #1c1c1c;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #333;
        }

        .help-text h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #e0e0e0;
          font-weight: 600;
        }

        .help-text ol {
          margin: 8px 0;
          padding-left: 20px;
        }

        .help-text li {
          margin: 6px 0;
          color: #c0c0c0;
        }

        .help-text a {
          color: #60a5fa;
          text-decoration: none;
        }

        .help-text a:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .help-text p {
          margin: 12px 0 0 0;
          color: #c0c0c0;
        }

        .connected-actions {
          margin-top: 16px;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
} 