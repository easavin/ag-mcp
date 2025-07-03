'use client';

import React, { useState, useEffect } from 'react';

interface AuravantConnectionStatus {
  connected: boolean;
  extensionId?: string;
  lastUpdated?: string;
  tokenExpiry?: string;
  error?: string;
}

interface ExtensionStatus {
  configured: boolean;
  extension_id?: string;
  users_count?: number;
  status?: string;
  error?: string;
}

interface AuravantConnectionHelperProps {
  onStatusChange?: (status: AuravantConnectionStatus) => void;
}

export default function AuravantConnectionHelper({ onStatusChange }: AuravantConnectionHelperProps) {
  const [connectionStatus, setConnectionStatus] = useState<AuravantConnectionStatus>({ connected: false });
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({ configured: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [auravantUserId, setAuravantUserId] = useState('');
  const [showConnectionForm, setShowConnectionForm] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
    checkExtensionStatus();
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

  const checkExtensionStatus = async () => {
    try {
      const response = await fetch('/api/auth/auravant/extension');
      const data = await response.json();
      
      setExtensionStatus({
        configured: data.configured,
        extension_id: data.extension_id,
        users_count: data.users_count,
        status: data.status,
        error: data.error
      });
    } catch (error) {
      console.error('Failed to check Extension status:', error);
      setExtensionStatus({ configured: false, error: 'Failed to check Extension status' });
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const requestBody = {
        useExtension: true,
        auravantUserId: auravantUserId.trim() || undefined
      };

      const response = await fetch('/api/auth/auravant/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        setConnectionStatus({ connected: true, extensionId: data.extension_id });
        setAuravantUserId('');
        setShowConnectionForm(false);
        alert('Successfully connected to Auravant via Extension!');
        await checkConnectionStatus(); // Refresh status
      } else {
        let errorMessage = data.error || 'Unknown error';
        if (data.details) {
          errorMessage += `\n\nDetails: ${data.details}`;
        }
        alert(`Connection failed: ${errorMessage}`);
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

  const renderExtensionStatus = () => {
    if (!extensionStatus.configured) {
      return (
        <div className="extension-status not-configured">
          <span className="status-icon">⚙️</span>
          <span>Extension not configured</span>
          <p className="status-message">Server-side Extension authentication is not available.</p>
        </div>
      );
    }

    if (extensionStatus.status === 'active') {
      return (
        <div className="extension-status active">
          <span className="status-icon">🔗</span>
          <span>Extension Ready</span>
          <p className="status-message">
            Extension {extensionStatus.extension_id} is active with {extensionStatus.users_count || 0} users.
          </p>
        </div>
      );
    }

    return (
      <div className="extension-status error">
        <span className="status-icon">❌</span>
        <span>Extension Error</span>
        <p className="status-message">{extensionStatus.error}</p>
      </div>
    );
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

      {!connectionStatus.connected && renderExtensionStatus()}

      {!connectionStatus.connected && !showConnectionForm && (
        <div className="connection-actions">
          <button 
            className="connect-btn"
            onClick={() => setShowConnectionForm(true)}
          >
            Connect to Auravant
          </button>
        </div>
      )}

      {!connectionStatus.connected && showConnectionForm && (
        <div className="connection-form">
          <div className="form-group">
            <label htmlFor="auravant-user-id">Your Auravant User ID (Optional)</label>
            <input
              id="auravant-user-id"
              type="text"
              value={auravantUserId}
              onChange={(e) => setAuravantUserId(e.target.value)}
              placeholder="Leave empty to use general Extension token"
              className="extension-input"
            />
            <p className="help-text">
              💡 If you know your Auravant User ID, enter it for personalized access. Otherwise, leave empty for general Extension access.
            </p>
          </div>

          <div className="form-actions">
            <button 
              className="connect-btn primary"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect via Extension'}
            </button>
            <button 
              className="cancel-btn"
              onClick={() => {
                setShowConnectionForm(false);
                setAuravantUserId('');
              }}
              disabled={isConnecting}
            >
              Cancel
            </button>
          </div>

          {extensionStatus.configured && (
          <div className="help-text">
              <h4>✨ Extension Authentication</h4>
              <p>You're using the recommended Extension-based authentication. This provides:</p>
              <ul>
                <li>🔒 Enhanced security (server-to-server authentication)</li>
                <li>🚀 Better user experience (no manual token management)</li>
                <li>🔄 Automatic token refresh</li>
                <li>👥 Multi-user support</li>
              </ul>
          </div>
          )}
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

        .connection-status, .extension-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .connection-status.loading, .extension-status.not-configured {
          background-color: #374151;
          color: #d1d5db;
        }

        .connection-status.connected, .extension-status.active {
          background-color: #064e3b;
          color: #a7f3d0;
        }

        .connection-status.disconnected {
          background-color: #374151;
          color: #d1d5db;
        }

        .connection-status.error, .extension-status.error {
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

        .connection-form {
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

        .extension-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #555;
          border-radius: 8px;
          font-size: 14px;
          background-color: #1c1c1c;
          color: #e0e0e0;
          transition: all 0.2s ease;
        }

        .extension-input::placeholder {
          color: #888;
        }

        .extension-input:focus {
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
        }

        .cancel-btn:hover:not(:disabled) {
          background-color: #555;
        }

        .refresh-btn {
          background-color: #059669;
          color: white;
        }

        .refresh-btn:hover:not(:disabled) {
          background-color: #047857;
        }

        .disconnect-btn {
          background-color: #dc2626;
          color: white;
        }

        .disconnect-btn:hover {
          background-color: #b91c1c;
        }

        .help-text {
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .help-text h4 {
          margin: 0 0 12px 0;
          color: #f3f4f6;
          font-size: 16px;
        }

        .help-text p {
          margin: 8px 0;
          color: #d1d5db;
          font-size: 14px;
          line-height: 1.5;
        }

        .help-text ul {
          margin: 12px 0;
          padding-left: 20px;
          color: #d1d5db;
          font-size: 14px;
        }

        .help-text li {
          margin: 4px 0;
          line-height: 1.4;
        }

        .connection-actions, .connected-actions {
          margin-top: 16px;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .connect-btn:not(.primary) {
          background-color: #3b82f6;
          color: white;
          padding: 14px 24px;
          font-size: 16px;
        }

        .connect-btn:not(.primary):hover {
          background-color: #2563eb;
        }
      `}</style>
    </div>
  );
} 