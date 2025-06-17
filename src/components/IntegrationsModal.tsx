'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  logoFallback: string;
  category: string;
  isConnected: boolean;
  features: string[];
}

interface JohnDeereConnectionStatus {
  status: 'loading' | 'connected' | 'partial_connection' | 'auth_required' | 'connection_required' | 'error'
  organizations?: Array<{ id: string; name: string; type: string; member: boolean }>
  connectionLinks?: string[]
  testResults?: {
    hasDataAccess: boolean
    testResults: {
      fields: { success: boolean; count: number; error?: string }
      equipment: { success: boolean; count: number; error?: string }
      farms: { success: boolean; count: number; error?: string }
      assets: { success: boolean; count: number; error?: string }
    }
  }
  error?: string
}

// Logo component with fallback
const LogoImage = ({ src, alt, fallback }: { src: string; alt: string; fallback?: string }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <>
      {!imageError ? (
        <img 
          src={src} 
          alt={alt} 
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="logo-fallback">{fallback || '🔗'}</span>
      )}
    </>
  );
};

// John Deere Organization Connection Component
const JohnDeereConnectionManager = ({ 
  isConnected, 
  connectionStatus,
  onRefreshStatus
}: { 
  isConnected: boolean
  connectionStatus: JohnDeereConnectionStatus
  onRefreshStatus: () => Promise<void>
}) => {
  const [refreshing, setRefreshing] = useState(false)

  const refreshStatus = async () => {
    setRefreshing(true)
    try {
      await onRefreshStatus()
    } catch (error) {
      console.error('Failed to refresh status:', error)
    }
    setRefreshing(false)
  }

  const openConnectionLink = (url: string) => {
    window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
  }

  if (!isConnected) return null

  const renderOrganizationStatus = () => {
    switch (connectionStatus.status) {
      case 'loading':
        return (
          <div className="org-connection-status loading">
            <div className="status-header">
              <span className="status-icon">⏳</span>
              <span>Checking organization access...</span>
            </div>
          </div>
        )

      case 'partial_connection':
        return (
          <div className="org-connection-status partially-connected">
            <div className="status-header">
              <span className="status-icon">🟡</span>
              <span>Partially connected - Core data available</span>
            </div>
            
            {connectionStatus.testResults && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">✅ <strong>Working:</strong> You have access to core farming data</p>
                <p className="text-sm text-gray-600 mb-3">⏳ <strong>Pending:</strong> Some advanced features are still being activated</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.fields.success ? (
                      <span className="text-green-600">✅ Fields ({connectionStatus.testResults.testResults.fields.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Fields (pending)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.farms.success ? (
                      <span className="text-green-600">✅ Farms ({connectionStatus.testResults.testResults.farms.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Farms (pending)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.equipment.success ? (
                      <span className="text-green-600">✅ Equipment ({connectionStatus.testResults.testResults.equipment.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Equipment (pending)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.assets.success ? (
                      <span className="text-green-600">✅ Assets ({connectionStatus.testResults.testResults.assets.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Assets (pending)</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {connectionStatus.organizations && connectionStatus.organizations.length > 0 && (
              <div className="org-list">
                <p className="org-label">Connected organizations:</p>
                {connectionStatus.organizations.map((org: any) => (
                  <div key={org.id} className="org-item">
                    ✓ {org.name} ({org.type})
                  </div>
                ))}
              </div>
            )}

            <div className="org-actions">
              {connectionStatus.connectionLinks && connectionStatus.connectionLinks.length > 0 && (
                <button
                  onClick={() => openConnectionLink(connectionStatus.connectionLinks![0])}
                  className="connection-btn"
                  style={{ background: '#f59e0b' }}
                >
                  🔗 Request Full Access
                </button>
              )}
              <button
                onClick={refreshStatus}
                disabled={refreshing}
                className="refresh-btn"
              >
                {refreshing ? '⟳ Checking...' : '↻ Refresh Status'}
              </button>
            </div>
          </div>
        )

      case 'connection_required':
        return (
          <div className="org-connection-status required">
            <div className="status-header">
              <span className="status-icon">⚠️</span>
              <span>Organization connection required</span>
            </div>
            
            {connectionStatus.testResults && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">Data Access Status:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.fields.success ? (
                      <span className="text-green-600">✅ Fields ({connectionStatus.testResults.testResults.fields.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Fields (pending)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.farms.success ? (
                      <span className="text-green-600">✅ Farms ({connectionStatus.testResults.testResults.farms.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Farms (pending)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.equipment.success ? (
                      <span className="text-green-600">✅ Equipment ({connectionStatus.testResults.testResults.equipment.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Equipment (pending)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {connectionStatus.testResults.testResults.assets.success ? (
                      <span className="text-green-600">✅ Assets ({connectionStatus.testResults.testResults.assets.count})</span>
                    ) : (
                      <span className="text-orange-600">⏳ Assets (pending)</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {connectionStatus.organizations && connectionStatus.organizations.length > 0 && (
              <div className="org-list">
                <p className="org-label">Found organizations:</p>
                {connectionStatus.organizations.map((org: any) => (
                  <div key={org.id} className="org-item">
                    • {org.name} ({org.type})
                  </div>
                ))}
              </div>
            )}

            <div className="org-actions">
              {connectionStatus.connectionLinks && connectionStatus.connectionLinks.length > 0 && (
                <button
                  onClick={() => openConnectionLink(connectionStatus.connectionLinks![0])}
                  className="connection-btn"
                >
                  🔗 Manage Organization Access
                </button>
              )}
              <button
                onClick={refreshStatus}
                disabled={refreshing}
                className="refresh-btn"
              >
                {refreshing ? '⟳ Checking...' : '↻ Refresh Status'}
              </button>
            </div>
          </div>
        )

      case 'connected':
        return (
          <div className="org-connection-status connected">
            <div className="status-header">
              <span className="status-icon">✅</span>
              <span>Fully connected and ready!</span>
            </div>
            
            {connectionStatus.organizations && connectionStatus.organizations.length > 0 && (
              <div className="org-list">
                <p className="org-label">Connected organizations:</p>
                {connectionStatus.organizations.map((org: any) => (
                  <div key={org.id} className="org-item connected">
                    ✓ {org.name} ({org.type})
                  </div>
                ))}
              </div>
            )}

            <div className="org-actions">
              <button
                onClick={refreshStatus}
                disabled={refreshing}
                className="refresh-btn"
              >
                {refreshing ? '⟳ Checking...' : '↻ Refresh Status'}
              </button>
              <button
                onClick={() => window.open('/johndeere-connection', '_blank')}
                className="connection-btn"
                style={{ background: '#6b7280' }}
              >
                🔍 Advanced View
              </button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="org-connection-status error">
            <div className="status-header">
              <span className="status-icon">❌</span>
              <span>Connection error</span>
            </div>
            <p className="error-message">{connectionStatus.error}</p>
            <button
              onClick={refreshStatus}
              disabled={refreshing}
              className="refresh-btn"
            >
              {refreshing ? '⟳ Retrying...' : '↻ Try Again'}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="org-connection-manager">
      <div className="org-section-header">
        <h4>Organization Access</h4>
        <p>Manage which farming organizations AgMCP can access</p>
      </div>
      {renderOrganizationStatus()}
    </div>
  )
}

export default function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  const {
    johnDeereConnection,
    connectJohnDeere,
    disconnectJohnDeere,
    checkJohnDeereConnection,
  } = useAuthStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<JohnDeereConnectionStatus>({ status: 'loading' });
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      checkConnectionStatus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'JOHN_DEERE_AUTH_SUCCESS') {
        console.log('John Deere auth success:', event.data);
        setIsConnecting(false);
        // Check connection status after successful auth
        setTimeout(() => checkConnectionStatus(), 1000);
      } else if (event.data.type === 'JOHN_DEERE_AUTH_ERROR') {
        console.error('John Deere auth error:', event.data.error);
        setIsConnecting(false);
        setConnectionStatus({ status: 'error', error: event.data.error });
        alert(`Authentication failed: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleJohnDeereConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/auth/johndeere/authorize', { method: 'POST' });
      const data = await response.json();
      
              if (data.authorizationUrl) {
          window.open(data.authorizationUrl, 'johndeere-auth', 'width=600,height=700');
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('Failed to initiate John Deere connection:', error);
      setIsConnecting(false);
      setConnectionStatus({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleJohnDeereDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your John Deere account? This will remove access to your farming data.')) {
      try {
        const response = await fetch('/api/auth/johndeere/disconnect', { method: 'POST' });
        if (response.ok) {
          setConnectionStatus({ status: 'auth_required' });
        }
      } catch (error) {
        console.error('Failed to disconnect John Deere account:', error);
      }
    }
  };

  const checkConnectionStatus = async () => {
    setIsCheckingConnection(true);
    try {
      const response = await fetch('/api/johndeere/connection-status');
      const data = await response.json();
      
      if (response.ok) {
        setConnectionStatus(data);
      } else {
        setConnectionStatus({ status: 'error', error: data.error || 'Failed to check connection status' });
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setConnectionStatus({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Define available integrations
  const integrations: Integration[] = [
    {
      id: 'johndeere',
      name: 'John Deere Operations Center',
      description: 'Connect your John Deere account to access field data, equipment status, and upload prescription files.',
      logo: '/assets/logos/johndeere-logo.png', // Path to the logo in public folder
      logoFallback: '🔗',
      category: 'Equipment & Data',
      isConnected: connectionStatus.status === 'connected' || connectionStatus.status === 'partial_connection' || connectionStatus.status === 'connection_required',
      features: [
        'Access field boundaries and crop data',
        'View equipment location and status',
        'Upload prescription files',
        'Analyze work records and yield data'
      ]
    }
    // Future integrations can be added here
  ];

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content integrations-modal">
        <div className="modal-header">
          <h2 className="modal-title">Integrations</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="integrations-header">
            <p className="modal-section-description">
              Connect your farming tools and platforms to unlock powerful AI-driven insights and automation.
            </p>
          </div>

          <div className="integrations-grid">
            {integrations.map((integration) => (
              <div key={integration.id} className="integration-card">
                <div className="integration-header">
                  <div className="integration-logo">
                    <LogoImage src={integration.logo} alt={integration.name} fallback={integration.logoFallback} />
                  </div>
                  <div className="integration-info">
                    <h3 className="integration-name">{integration.name}</h3>
                    <span className="integration-category">{integration.category}</span>
                  </div>
                  <div className="integration-status">
                    {connectionStatus.status === 'connected' ? (
                      <div className="status-badge connected">
                        <div className="status-dot"></div>
                        Connected
                      </div>
                    ) : connectionStatus.status === 'partial_connection' ? (
                      <div className="status-badge partially-connected">
                        <div className="status-dot" style={{backgroundColor: '#f59e0b'}}></div>
                        Partially Connected
                      </div>
                    ) : integration.isConnected ? (
                      <div className="status-badge connected">
                        <div className="status-dot"></div>
                        Connected
                      </div>
                    ) : (
                      <div className="status-badge disconnected">
                        <div className="status-dot"></div>
                        Not Connected
                      </div>
                    )}
                  </div>
                </div>

                <p className="integration-description">
                  {integration.description}
                </p>

                <div className="integration-features">
                  <h4>Features:</h4>
                  <ul>
                    {integration.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>

                {/* Organization Connection Manager for John Deere */}
                {integration.id === 'johndeere' && (
                  <JohnDeereConnectionManager 
                    isConnected={integration.isConnected} 
                    connectionStatus={connectionStatus}
                    onRefreshStatus={checkConnectionStatus}
                  />
                )}

                <div className="integration-actions">
                  {integration.isConnected ? (
                    <div className="connected-actions">
                      <div className="connection-info">
                        {integration.id === 'johndeere' && johnDeereConnection.expiresAt && (
                          <div className="connection-details">
                            <p>Scope: {johnDeereConnection.scope || 'ag1, ag2, ag3'}</p>
                            <p>Expires: {new Date(johnDeereConnection.expiresAt).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      <button 
                        className="disconnect-btn"
                        onClick={() => handleJohnDeereDisconnect()}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="connect-btn"
                      onClick={() => handleJohnDeereConnect()}
                      disabled={isConnecting}
                    >
                      {isConnecting && integration.id === 'johndeere' ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="coming-soon">
            <h3>More integrations coming soon!</h3>
            <p>We're working on adding support for more farming platforms and tools.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 