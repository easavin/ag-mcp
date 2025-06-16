'use client'

import { useState, useEffect } from 'react'

// Add CSS for animations
const styles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}

interface ConnectionStatus {
  status: 'loading' | 'auth_required' | 'connection_required' | 'connected' | 'no_organizations' | 'error'
  organizations?: Array<{
    id: string
    name: string
    type: string
    member: boolean
  }>
  connectionLinks?: string[]
  connectionRequired?: boolean
  testResults?: any
  instructions?: {
    step1: string
    step2: string
    step3: string
    step4: string
    connectionUrl?: string
  }
  error?: string
}

export default function JohnDeereConnectionHelper() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/johndeere/connection-status')
      const data = await response.json()
      setConnectionStatus(data)
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to check connection status'
      })
    }
  }

  const refreshStatus = async () => {
    setRefreshing(true)
    await checkConnectionStatus()
    setRefreshing(false)
  }

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const openConnectionLink = (url: string) => {
    window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
  }

  const renderConnectionStatus = () => {
    switch (connectionStatus.status) {
      case 'loading':
        return (
          <div className="text-center py-12" style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="relative inline-block">
              <div 
                className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #bbf7d0',
                  borderTop: '4px solid #16a34a',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              ></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-transparent border-r-green-300 animate-pulse"
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  border: '4px solid transparent',
                  borderRight: '4px solid #86efac',
                  borderRadius: '50%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              ></div>
            </div>
            <p className="mt-4 font-medium text-lg" style={{ marginTop: '16px', fontWeight: '500', fontSize: '18px', color: '#374151' }}>
              Checking connection status...
            </p>
            <p className="text-sm mt-1" style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              This may take a few moments
            </p>
          </div>
        )

      case 'auth_required':
        return (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-900">Authentication Required</h3>
                <p className="text-yellow-600 text-sm">Connect your John Deere account first</p>
              </div>
            </div>
            <p className="text-yellow-800 mb-4 leading-relaxed">
              You need to authenticate with John Deere before checking organization connections.
            </p>
            <div className="bg-white border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">🔗</span>
                <h4 className="font-bold text-yellow-900">Next Step</h4>
              </div>
              <p className="text-sm text-yellow-800">
                Go to the <strong>Integrations</strong> section and connect your John Deere account to continue.
              </p>
            </div>
          </div>
        )

      case 'connection_required':
        return (
          <div 
            className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div 
                className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#dbeafe',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="text-2xl">🔗</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900" style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a' }}>
                  Organization Connection Required
                </h3>
                <p className="text-blue-600 text-sm" style={{ color: '#2563eb', fontSize: '14px' }}>
                  One more step to complete your integration
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-blue-800 text-base leading-relaxed">
                Your app is authenticated but needs to be connected to your organization to access data.
              </p>
              
              {connectionStatus.organizations && connectionStatus.organizations.length > 0 && (
                <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg">🏢</span>
                    <h4 className="font-bold text-blue-900">Found Organizations</h4>
                  </div>
                  <ul className="space-y-2">
                    {connectionStatus.organizations.map(org => (
                      <li key={org.id} className="flex items-center space-x-2 text-blue-700 bg-blue-50 rounded-lg p-2">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        <span className="font-medium">{org.name}</span>
                        <span className="text-blue-500 text-sm">({org.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {connectionStatus.instructions && (
                <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-lg">📋</span>
                    <h4 className="font-bold text-blue-900">Connection Steps</h4>
                  </div>
                  <ol className="space-y-3">
                    {[
                      connectionStatus.instructions.step1,
                      connectionStatus.instructions.step2,
                      connectionStatus.instructions.step3,
                      connectionStatus.instructions.step4
                    ].map((step, index) => (
                      <li key={index} className="flex items-start space-x-3 text-blue-700">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              
              {connectionStatus.connectionLinks && connectionStatus.connectionLinks.length > 0 && (
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4"
                  style={{
                    background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span className="text-xl">🚀</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg" style={{ fontWeight: 'bold', fontSize: '18px', color: 'white' }}>
                          Ready to Connect!
                        </h4>
                        <p className="text-blue-100 text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                          Click below to authorize your organization
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {connectionStatus.connectionLinks.map((link, index) => (
                      <button
                        key={index}
                        onClick={() => openConnectionLink(link)}
                        className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                        style={{
                          backgroundColor: 'white',
                          color: '#2563eb',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span className="text-lg">🔗</span>
                        <span>Open Connection Link {index + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'connected':
        const hasErrors = connectionStatus.testResults && 
          Object.values(connectionStatus.testResults).some((result: any) => !result.success)
        
        const has403or404 = connectionStatus.testResults && 
          Object.values(connectionStatus.testResults).some((result: any) => 
            result.error && (result.error.includes('403') || result.error.includes('404'))
          )
        
        return (
          <div className={`${has403or404 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">{has403or404 ? '⚠️' : '✅'}</span>
              <h3 className={`text-lg font-semibold ${has403or404 ? 'text-yellow-800' : 'text-green-800'}`}>
                {has403or404 ? 'Organization Connection Required' : 'Successfully Connected'}
              </h3>
            </div>
            <p className={`${has403or404 ? 'text-yellow-700' : 'text-green-700'} mb-3`}>
              {has403or404 
                ? 'You have authenticated with John Deere, but your app needs to be connected to your organization to access data (403/404 errors detected).'
                : 'Your John Deere app is connected and has access to organization data.'
              }
            </p>
            
            {has403or404 && (
              <div className="bg-white border border-yellow-200 rounded-lg p-4 shadow-sm mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">⏱️</span>
                  <h4 className="font-bold text-yellow-900">Permission Propagation Delay</h4>
                </div>
                <p className="text-sm text-yellow-800 leading-relaxed mb-3">
                  You may have granted permissions, but John Deere's API has a delay before permissions take effect.
                </p>
                <div className="bg-yellow-50 rounded p-3 mb-3">
                  <p className="text-xs text-yellow-700 font-medium mb-2">⏳ Expected timeline:</p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• <strong>Minimum:</strong> 2-5 minutes</li>
                    <li>• <strong>Typical:</strong> 10-15 minutes</li>
                    <li>• <strong>Maximum:</strong> Up to 1 hour</li>
                  </ul>
                </div>
                <p className="text-sm text-yellow-800">
                  If you just granted permissions, please wait a few minutes and click "Refresh Status" above. 
                  If you haven't granted permissions yet, use the connection link below.
                </p>
              </div>
            )}
            
            {connectionStatus.organizations && connectionStatus.organizations.length > 0 && (
              <div className="bg-white border border-green-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">🏢</span>
                  <h4 className="font-bold text-green-900">Connected Organizations</h4>
                </div>
                <ul className="space-y-2">
                  {connectionStatus.organizations.map(org => (
                    <li key={org.id} className="flex items-center space-x-2 text-green-700 bg-green-50 rounded-lg p-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span className="font-medium">{org.name}</span>
                      <span className="text-green-500 text-sm">({org.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {connectionStatus.testResults && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-lg">📊</span>
                  <h4 className="font-bold text-gray-900">API Endpoint Status</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'fields', label: 'Fields', icon: '🌾' },
                    { key: 'equipment', label: 'Equipment', icon: '🚜' },
                    { key: 'farms', label: 'Farms', icon: '🏡' },
                    { key: 'assets', label: 'Assets', icon: '📦' }
                  ].map(({ key, label, icon }) => {
                    const result = connectionStatus.testResults[key]
                    const isSuccess = result?.success
                    return (
                      <div key={key} className={`p-3 rounded-lg border-2 transition-all ${
                        isSuccess 
                          ? 'bg-green-50 border-green-200 text-green-800' 
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{icon}</span>
                            <span className="font-semibold">{label}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{isSuccess ? '✅' : '❌'}</span>
                            <span className="text-sm font-medium">({result?.count || 0})</span>
                          </div>
                        </div>
                        {result?.error && (
                          <div className="text-xs opacity-75 bg-white/50 rounded p-2 mt-2 font-mono">
                            {result.error}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )

      case 'no_organizations':
        return (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">❓</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">No Organizations Found</h3>
                <p className="text-gray-600 text-sm">Your account needs to be linked to farming operations</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your John Deere account doesn't have access to any organizations. Make sure your account is associated with farming operations.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">💡</span>
                <h4 className="font-bold text-gray-900">Next Steps</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Contact your farm administrator to add you to the organization</li>
                <li>• Verify your John Deere Operations Center account setup</li>
                <li>• Ensure you have the correct permissions</li>
              </ul>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900">Connection Error</h3>
                <p className="text-red-600 text-sm">Something went wrong while checking your connection</p>
              </div>
            </div>
            <p className="text-red-800 mb-4 leading-relaxed">
              There was an error checking your John Deere connection status. Please try refreshing or check your authentication.
            </p>
            {connectionStatus.error && (
              <div className="bg-white border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">🔍</span>
                  <h4 className="font-bold text-red-900">Error Details</h4>
                </div>
                <p className="text-sm text-red-800 font-mono bg-red-50 rounded p-3">{connectionStatus.error}</p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="w-full">
      <div 
        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #f3f4f6',
          overflow: 'hidden'
        }}
      >
        {/* Header Section */}
        <div 
          className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white"
          style={{ 
            background: 'linear-gradient(90deg, #16a34a 0%, #15803d 100%)', 
            padding: '24px', 
            color: 'white' 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center"
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="text-2xl">🔗</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                  Connection Status
                </h2>
                <p className="text-green-100 mt-1" style={{ color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px' }}>
                  Monitor and manage your John Deere integration
                </p>
              </div>
            </div>
            <button
              onClick={refreshStatus}
              disabled={refreshing}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 backdrop-blur-sm"
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.5 : 1
              }}
            >
              <span className={`${refreshing ? 'animate-spin' : ''}`}>
                {refreshing ? '⟳' : '↻'}
              </span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8" style={{ padding: '32px', backgroundColor: 'white', color: '#111827' }}>
          {renderConnectionStatus()}
          
          {connectionStatus.status === 'connection_required' && (
            <div 
              className="mt-6 p-5 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg"
              style={{
                marginTop: '24px',
                padding: '20px',
                backgroundColor: '#fffbeb',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '0 8px 8px 0'
              }}
            >
              <div className="flex items-start space-x-3">
                <span className="text-xl">💡</span>
                <div>
                  <h4 className="font-semibold mb-1" style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                    Important Note
                  </h4>
                  <p className="text-sm" style={{ fontSize: '14px', color: '#b45309', lineHeight: '1.5' }}>
                    After completing the connection process in the popup window, 
                    click "Refresh Status" above to verify the connection was successful.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 