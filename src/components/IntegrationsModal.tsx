'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import AuravantConnectionHelper from './AuravantConnectionHelper';

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
  status: string;
  message?: string;
  organizations?: Array<{ id: string; name: string; type: string; member?: boolean }>;
  testResults?: {
    fields: { success: boolean; count: number; error?: string };
    equipment: { success: boolean; count: number; error?: string };
    farms: { success: boolean; count: number; error?: string };
    files: { success: boolean; count: number; error?: string };
  };
  error?: string;
}

interface AuravantConnectionStatus {
  connected: boolean;
  extensionId?: string;
  lastUpdated?: string;
  tokenExpiry?: string;
  error?: string;
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

export default function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  const {
    johnDeereConnection,
    connectJohnDeere,
    disconnectJohnDeere,
    checkJohnDeereConnection,
    handleJohnDeereCallback,
  } = useAuthStore();

  const { selectedDataSources, toggleDataSource } = useChatStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<JohnDeereConnectionStatus>({ status: 'loading' });
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // Auravant state
  const [auravantStatus, setAuravantStatus] = useState<AuravantConnectionStatus>({ connected: false });
  
  // EU Commission state - improved initialization
  const [euCommissionConnected, setEuCommissionConnected] = useState(false);
  
  // USDA state - improved initialization  
  const [usdaConnected, setUsdaConnected] = useState(false);

  // Initialize connection states after component mounts
  useEffect(() => {
    setEuCommissionConnected(selectedDataSources.includes('eu-commission'));
    setUsdaConnected(selectedDataSources.includes('usda'));
  }, []); // Run only once on mount

  // EU Commission handlers - improved logic
  const handleEuCommissionConnect = () => {
    console.log('🇪🇺 EU Commission: Connecting...');
    setEuCommissionConnected(true);
    if (!selectedDataSources.includes('eu-commission')) {
      console.log('🇪🇺 EU Commission: Adding to selected data sources');
      toggleDataSource('eu-commission');
    }
  };

  const handleEuCommissionDisconnect = () => {
    console.log('🇪🇺 EU Commission: Disconnecting...');
    setEuCommissionConnected(false);
    if (selectedDataSources.includes('eu-commission')) {
      console.log('🇪🇺 EU Commission: Removing from selected data sources');
      toggleDataSource('eu-commission');
    }
  };

  // USDA handlers - improved logic
  const handleUsdaConnect = () => {
    console.log('🇺🇸 USDA: Connecting...');
    setUsdaConnected(true);
    if (!selectedDataSources.includes('usda')) {
      console.log('🇺🇸 USDA: Adding to selected data sources');
      toggleDataSource('usda');
    }
  };

  const handleUsdaDisconnect = () => {
    console.log('🇺🇸 USDA: Disconnecting...');
    setUsdaConnected(false);
    if (selectedDataSources.includes('usda')) {
      console.log('🇺🇸 USDA: Removing from selected data sources');
      toggleDataSource('usda');
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      checkConnectionStatus();
      checkAuravantStatus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Sync EU Commission connection state with chat store - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const shouldBeConnected = selectedDataSources.includes('eu-commission');
      console.log('🇪🇺 EU Commission: Syncing state - should be connected:', shouldBeConnected, 'current sources:', selectedDataSources);
      setEuCommissionConnected(shouldBeConnected);
    }, 100); // Small delay to prevent rapid state changes
    
    return () => clearTimeout(timeoutId);
  }, [selectedDataSources]);

  // Sync USDA connection state with chat store - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const shouldBeConnected = selectedDataSources.includes('usda');
      console.log('🇺🇸 USDA: Syncing state - should be connected:', shouldBeConnected, 'current sources:', selectedDataSources);
      setUsdaConnected(shouldBeConnected);
    }, 100); // Small delay to prevent rapid state changes
    
    return () => clearTimeout(timeoutId);
  }, [selectedDataSources]);

  // Check Auravant connection status
  const checkAuravantStatus = async () => {
    try {
      const response = await fetch('/api/auth/auravant/status');
      const data = await response.json();
      
      if (response.ok) {
        setAuravantStatus({
          connected: data.connected,
          extensionId: data.extensionId,
          lastUpdated: data.lastUpdated,
          tokenExpiry: data.tokenExpiry
        });
      } else {
        setAuravantStatus({ 
          connected: false, 
          error: data.error || 'Failed to check connection status' 
        });
      }
    } catch (error) {
      console.error('Failed to check Auravant connection status:', error);
      setAuravantStatus({ 
        connected: false, 
        error: 'Failed to check connection status' 
      });
    }
  };

  // Listen for auth completion
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('📨 IntegrationsModal - Received message:', event.data, 'from origin:', event.origin)
      
      // Ensure the message is from our domain
      if (event.origin !== window.location.origin) {
        console.warn('⚠️ IntegrationsModal - Ignoring message from different origin:', event.origin)
        return
      }

      if (event.data.type === 'JOHN_DEERE_AUTH_CALLBACK') {
        const { code, state } = event.data
        console.log('✅ IntegrationsModal - Received OAuth callback with code:', code?.substring(0, 10) + '...', 'state:', state)
        
        try {
          console.log('🔄 IntegrationsModal - Exchanging code for tokens...')
          // Use the auth store's callback handler
          await handleJohnDeereCallback(code, state)
          console.log('🎉 IntegrationsModal - OAuth flow completed successfully!')
          
          // Refresh connection status
          await checkConnectionStatus()
          setIsConnecting(false)
        } catch (error) {
          console.error('❌ IntegrationsModal - Error during token exchange:', error)
          setIsConnecting(false)
          setConnectionStatus({ 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Failed to complete connection'
          })
        }
      } else if (event.data.type === 'JOHN_DEERE_AUTH_ERROR') {
        console.error('❌ IntegrationsModal - OAuth error:', event.data.error)
        setIsConnecting(false)
        setConnectionStatus({ 
          status: 'error', 
          error: event.data.error || 'OAuth authentication failed'
        })
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleJohnDeereConnect = async () => {
    setIsConnecting(true);
    console.log('🚀 IntegrationsModal - Starting John Deere OAuth flow...')
    
    try {
      console.log('📡 IntegrationsModal - Fetching authorization URL...')
      const response = await fetch('/api/auth/johndeere/authorize', { method: 'POST' });
      const data = await response.json();
      
      if (data.authorizationUrl) {
        console.log('🔗 IntegrationsModal - Opening popup with URL:', data.authorizationUrl)
        const authWindow = window.open(
          data.authorizationUrl,
          'JohnDeereAuth',
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );

        if (!authWindow) {
          console.error('❌ IntegrationsModal - Failed to open popup window')
          alert('Please allow pop-ups for this site to connect with John Deere.');
          setIsConnecting(false);
        } else {
          console.log('✅ IntegrationsModal - Popup opened successfully, waiting for OAuth callback...')
        }
      } else {
        throw new Error('No authorization URL received');
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
      
      console.log('🔍 IntegrationsModal - Connection status response:', data);
      
      if (response.ok) {
        setConnectionStatus(data);
        console.log('✅ IntegrationsModal - Updated connection status:', data);
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

  // Check if John Deere is connected based on status
  const isJohnDeereConnected = connectionStatus.status === 'connected' || 
                               connectionStatus.status === 'partial_connection' ||
                               connectionStatus.status === 'connection_required';

  // Define available integrations
  const integrations: Integration[] = [
    {
      id: 'weather',
      name: 'Weather Data',
      description: 'Access real-time weather data, forecasts, and agricultural conditions for your fields.',
      logo: '/assets/logos/weather-logo.svg',
      logoFallback: '🌤️',
      category: 'Environmental Data',
      isConnected: true, // Always connected - no auth needed
      features: [
        'Current weather conditions',
        '7-day weather forecasts',
        'Soil temperature and moisture',
        'Spray application conditions', 
        'Evapotranspiration rates',
        'Agricultural alerts and insights'
      ]
    },
    {
      id: 'johndeere',
      name: 'John Deere Operations Center',
      description: 'Connect your John Deere account to access field data, equipment status, and upload prescription files.',
      logo: '/assets/logos/johndeere-logo.png',
      logoFallback: '🚜',
      category: 'Equipment & Data',
      isConnected: isJohnDeereConnected,
      features: [
        'Access field boundaries and crop data',
        'View equipment location and status',
        'Upload prescription files',
        'Analyze work records and yield data'
      ]
    },
    {
      id: 'auravant',
      name: 'Auravant',
      description: 'Connect your Auravant account to access agricultural data, livestock management, and work order planning.',
      logo: '/assets/logos/auravant-logo.png',
      logoFallback: '🌾',
      category: 'Agricultural Platform',
      isConnected: auravantStatus.connected,
      features: [
        'Access field and farm data',
        'Livestock herd management',
        'Work order planning and recommendations',
        'Labour operation tracking'
      ]
    },
    {
      id: 'eu-commission',
      name: 'EU Agricultural Markets',
      description: 'Access European Commission agricultural market data including prices, production statistics, and trade information.',
      logo: '/assets/logos/ec-logo.png',
      logoFallback: '🇪🇺',
      category: 'Market Data',
      isConnected: euCommissionConnected,
      features: [
        'Agricultural market prices across EU',
        'Production statistics by member state',
        'Import/export trade data',
        'Market dashboards and reports',
        'Beef, dairy, cereals, and more sectors',
        'Historical and current market trends'
      ]
    },
    {
      id: 'usda',
      name: 'USDA Agricultural Markets',
      description: 'Access USDA agricultural market data for North American markets including prices, production statistics, and trade information.',
      logo: '/assets/logos/usda-logo.png',
      logoFallback: '🇺🇸',
      category: 'Market Data',
      isConnected: usdaConnected,
      features: [
        'Agricultural market prices across North America',
        'Production statistics by region (US, Canada, Mexico)',
        'Import/export trade data',
        'Market dashboards and reports',
        'Grain, livestock, dairy, and more categories',
        'Regional market analysis (Midwest, Southeast, etc.)'
      ]
    }
  ];

  const renderConnectionStatus = () => {
    if (connectionStatus.status === 'loading' || isCheckingConnection) {
      return (
        <div className="connection-status loading">
          <span className="status-icon">⏳</span>
          <span>Checking connection...</span>
        </div>
      );
    }

    if (connectionStatus.status === 'connected') {
      return (
        <div className="connection-status connected">
          <span className="status-icon">✅</span>
          <span>Fully Connected</span>
          {connectionStatus.organizations && connectionStatus.organizations.length > 0 && (
            <div className="org-info">
              <p>Organizations: {connectionStatus.organizations.map(org => org.name).join(', ')}</p>
            </div>
          )}
        </div>
      );
    }

    if (connectionStatus.status === 'partial_connection') {
      return (
        <div className="connection-status partial">
          <span className="status-icon">🟡</span>
          <span>Connected - Core data available</span>
          {connectionStatus.organizations && connectionStatus.organizations.length > 0 && (
            <div className="org-info">
              <p>Organizations: {connectionStatus.organizations.map(org => org.name).join(', ')}</p>
              {connectionStatus.testResults && (
                <div className="test-results">
                  <p>✅ Fields: {connectionStatus.testResults.fields.success ? connectionStatus.testResults.fields.count : 'No access'}</p>
                  <p>✅ Equipment: {connectionStatus.testResults.equipment.success ? connectionStatus.testResults.equipment.count : 'No access'}</p>
                  <p>✅ Farms: {connectionStatus.testResults.farms.success ? connectionStatus.testResults.farms.count : 'No access'}</p>
                  <p>{connectionStatus.testResults.files.success ? '✅' : '⏳'} Files: {connectionStatus.testResults.files.success ? connectionStatus.testResults.files.count : 'Pending permissions'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (connectionStatus.status === 'connection_required') {
      return (
        <div className="connection-status partial">
          <span className="status-icon">🟡</span>
          <span>Connected - Permissions Required</span>
          <p className="status-message">Account connected but organization permissions needed.</p>
        </div>
      );
    }

    if (connectionStatus.status === 'not_connected') {
      return (
        <div className="connection-status disconnected">
          <span className="status-icon">⚪</span>
          <span>Not Connected</span>
          <p className="status-message">Connect your John Deere account to access data.</p>
        </div>
      );
    }

    if (connectionStatus.status === 'token_expired') {
      return (
        <div className="connection-status error">
          <span className="status-icon">🔄</span>
          <span>Connection Expired</span>
          <p className="status-message">Your John Deere connection has expired. Please reconnect.</p>
        </div>
      );
    }

    if (connectionStatus.status === 'auth_required') {
      return (
        <div className="connection-status disconnected">
          <span className="status-icon">🔐</span>
          <span>Authentication Required</span>
          <p className="status-message">Please sign in to connect your John Deere account.</p>
        </div>
      );
    }

    if (connectionStatus.error || connectionStatus.status === 'error') {
      return (
        <div className="connection-status error">
          <span className="status-icon">❌</span>
          <span>Connection Error</span>
          <p className="error-message">{connectionStatus.error || 'Failed to check connection status'}</p>
        </div>
      );
    }

    return (
      <div className="connection-status disconnected">
        <span className="status-icon">⚪</span>
        <span>Not Connected</span>
      </div>
    );
  };

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
                    {integration.isConnected ? (
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

                {/* Connection Status for John Deere */}
                {integration.id === 'johndeere' && renderConnectionStatus()}

                {/* Connection Helper for Auravant */}
                {integration.id === 'auravant' && (
                  <AuravantConnectionHelper 
                    onStatusChange={(status) => setAuravantStatus(status)}
                  />
                )}

                {/* Integration Actions */}
                {integration.id === 'weather' ? (
                  <div className="integration-actions">
                    <div className="weather-status">
                      <div className="status-badge connected">
                        <div className="status-dot"></div>
                        Always Connected
                      </div>
                      <p style={{ color: '#a0a0a0', fontSize: '0.85rem', margin: '8px 0 0 0' }}>
                        Weather data is available without authentication
                      </p>
                    </div>
                  </div>
                ) : integration.id !== 'auravant' ? (
                  <div className="integration-actions">
                    {integration.isConnected ? (
                      <div className="connected-actions">
                        <div className="connection-info">
                          {integration.id === 'johndeere' && johnDeereConnection?.expiresAt && (
                            <div className="connection-details">
                              <p>Scope: {johnDeereConnection.scope || 'ag1, ag2, ag3'}</p>
                              <p>Expires: {new Date(johnDeereConnection.expiresAt).toLocaleDateString()}</p>
                            </div>
                          )}
                          {integration.id === 'eu-commission' && (
                            <div className="connection-details">
                              <p>No authentication required</p>
                              <p>Direct access to EU agricultural data</p>
                            </div>
                          )}
                          {integration.id === 'usda' && (
                            <div className="connection-details">
                              <p>No authentication required</p>
                              <p>Direct access to USDA agricultural data</p>
                            </div>
                          )}
                        </div>
                        <div className="action-buttons">
                          {integration.id !== 'eu-commission' && integration.id !== 'usda' && (
                            <button 
                              className="refresh-btn"
                              onClick={integration.id === 'johndeere' ? checkConnectionStatus : checkAuravantStatus}
                              disabled={isCheckingConnection}
                            >
                              {isCheckingConnection ? '↻ Refreshing...' : '↻ Refresh Status'}
                            </button>
                          )}
                          <button 
                            className="disconnect-btn"
                            onClick={() => {
                              if (integration.id === 'johndeere') {
                                handleJohnDeereDisconnect();
                              } else if (integration.id === 'eu-commission') {
                                handleEuCommissionDisconnect();
                              } else if (integration.id === 'usda') {
                                handleUsdaDisconnect();
                              }
                            }}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="connect-btn"
                        onClick={() => {
                          if (integration.id === 'johndeere') {
                            handleJohnDeereConnect();
                          } else if (integration.id === 'eu-commission') {
                            handleEuCommissionConnect();
                          } else if (integration.id === 'usda') {
                            handleUsdaConnect();
                          }
                        }}
                        disabled={isConnecting}
                      >
                        {isConnecting && integration.id === 'johndeere' ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                ) : null}
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