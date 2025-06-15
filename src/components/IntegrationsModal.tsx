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
  } = useAuthStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      checkJohnDeereConnection().then(() => {
        setConnectionStatus(johnDeereConnection.isConnected ? 'connected' : 'disconnected');
      });
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, checkJohnDeereConnection, johnDeereConnection.isConnected]);

  // Add message event listener for popup communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'JOHN_DEERE_AUTH_SUCCESS') {
        console.log('John Deere auth success:', event.data);
        setIsConnecting(false);
        setConnectionStatus('connected');
        // Refresh the connection status from the server
        checkJohnDeereConnection();
      } else if (event.data.type === 'JOHN_DEERE_AUTH_ERROR') {
        console.error('John Deere auth error:', event.data.error);
        setIsConnecting(false);
        setConnectionStatus('disconnected');
        // You could show an error message here
        alert(`Authentication failed: ${event.data.error}`);
      }
    };

    if (isOpen) {
      window.addEventListener('message', handleMessage);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, checkJohnDeereConnection]);

  const handleConnect = async (integrationId: string) => {
    if (integrationId === 'johndeere') {
      setIsConnecting(true);
      try {
        const authUrl = await connectJohnDeere();
        window.open(authUrl, 'johndeere-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      } catch (error) {
        console.error('Failed to initiate John Deere connection:', error);
        setIsConnecting(false);
      }
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (integrationId === 'johndeere') {
      if (confirm('Are you sure you want to disconnect your John Deere account? This will remove access to your farming data.')) {
        try {
          await disconnectJohnDeere();
          setConnectionStatus('disconnected');
        } catch (error) {
          console.error('Failed to disconnect John Deere account:', error);
        }
      }
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
      isConnected: connectionStatus === 'connected',
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
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="connect-btn"
                      onClick={() => handleConnect(integration.id)}
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