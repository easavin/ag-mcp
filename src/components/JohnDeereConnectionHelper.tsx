'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

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

type TestResult = {
  success: boolean;
  count: number;
  error?: string;
}

type ConnectionStatus = {
  status: 'loading' | 'auth_required' | 'connection_required' | 'partial_connection' | 'connected' | 'no_organizations' | 'error';
  message: string;
  organizations?: any[];
  testResults?: {
    fields: TestResult;
    farms: TestResult;
    equipment: TestResult;
    files: TestResult;
    [key: string]: any; 
  };
  error?: string;
}

export default function JohnDeereConnectionHelper() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'loading', message: 'Checking connection status...' })
  const [refreshing, setRefreshing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const user = useAuthStore(state => state.user)
  const router = useRouter()

  const checkConnectionStatus = async () => {
    if (!user) {
      setConnectionStatus({ status: 'auth_required', message: 'You need to be logged in.' })
      return
    }

    setRefreshing(true)
    try {
      const res = await fetch('/api/johndeere/connection-status')
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setConnectionStatus({ status: 'auth_required', message: data.error || 'Authentication with John Deere required.' })
        } else {
          setConnectionStatus({ status: 'error', message: data.error || 'Failed to fetch connection status.' })
        }
        return
      }

      const { status, message, organizations, testResults, error } = data
      setConnectionStatus({ status, message, organizations, testResults, error })
    } catch (err: any) {
      setConnectionStatus({ status: 'error', message: 'An unexpected error occurred.', error: err.message })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    checkConnectionStatus()
  }, [user])

  const refreshStatus = () => {
    checkConnectionStatus()
  }
  
  const handleJohnDeereConnect = async () => {
    setConnecting(true)
    console.log('🚀 Starting John Deere OAuth flow...')
    
    let popup: Window | null = null
    
    try {
      // First, make a POST request to get the authorization URL
      console.log('📡 Fetching authorization URL...')
      const response = await fetch('/api/auth/johndeere/authorize', { method: 'POST' })
      
      if (!response.ok) {
        throw new Error(`Failed to get authorization URL: ${response.status}`)
      }
      
      const { authorizationUrl } = await response.json()
      console.log('🔗 Opening popup with URL:', authorizationUrl)
      
      popup = window.open(authorizationUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
      
      if (!popup) {
        console.error('❌ Failed to open popup window')
        setConnecting(false)
        setConnectionStatus({ 
          status: 'error', 
          message: 'Failed to open OAuth popup. Please allow popups for this site.', 
          error: 'Popup blocked'
        })
        return
      }
    } catch (error) {
      console.error('❌ Error starting OAuth flow:', error)
      setConnecting(false)
      setConnectionStatus({ 
        status: 'error', 
        message: 'Failed to start OAuth flow', 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return
    }
    
    console.log('✅ Popup opened successfully, popup object:', popup)
    console.log('✅ Popup URL:', popup.location?.href || 'Cannot access (different origin)')
    console.log('✅ Waiting for OAuth callback...')
    
    // Listen for messages from the popup
    const messageListener = async (event: MessageEvent) => {
      console.log('📨 Received message:', event.data, 'from origin:', event.origin)
      console.log('📨 Expected origin:', window.location.origin)
      console.log('📨 Message type:', event.data?.type)
      
      // Ensure the message is from our domain
      if (event.origin !== window.location.origin) {
        console.warn('⚠️ Ignoring message from different origin:', event.origin)
        return
      }

      if (event.data.type === 'JOHN_DEERE_AUTH_CALLBACK') {
        const { code, state } = event.data
        console.log('✅ Received OAuth callback with code:', code?.substring(0, 10) + '...', 'state:', state)
        
        try {
          console.log('🔄 Exchanging code for tokens...')
          // Exchange the code for tokens via our API
          const response = await fetch('/api/auth/johndeere/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, state }),
          })

          const responseData = await response.json()
          console.log('📝 Callback response:', response.status, responseData)

          if (response.ok) {
            console.log('🎉 OAuth flow completed successfully!')
            // Success! Refresh the connection status
            await checkConnectionStatus()
          } else {
            console.error('❌ Callback failed:', responseData)
            setConnectionStatus({ 
              status: 'error', 
              message: 'Failed to complete connection', 
              error: responseData.error 
            })
          }
        } catch (error) {
          console.error('❌ Error during token exchange:', error)
          setConnectionStatus({ 
            status: 'error', 
            message: 'Failed to complete connection', 
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
        
        // Clean up
        setConnecting(false)
        window.removeEventListener('message', messageListener)
        popup?.close()
      } else if (event.data.type === 'JOHN_DEERE_AUTH_ERROR') {
        console.error('❌ OAuth error:', event.data.error)
        setConnectionStatus({ 
          status: 'error', 
          message: 'OAuth authentication failed', 
          error: event.data.error 
        })
        
        // Clean up
        setConnecting(false)
        window.removeEventListener('message', messageListener)
        popup?.close()
      }
    }

    // Add the message listener
    window.addEventListener('message', messageListener)
    console.log('👂 Message listener added, waiting for messages...')
    
    // Clean up if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        console.log('🚪 Popup was closed manually')
        setConnecting(false)
        window.removeEventListener('message', messageListener)
        clearInterval(checkClosed)
      }
    }, 1000)
    
    // Also log popup status periodically for debugging
    const statusCheck = setInterval(() => {
      if (!popup?.closed) {
        try {
          console.log('🔍 Popup status check - still open, URL:', popup.location?.href || 'Cannot access (different origin)')
        } catch (e) {
          console.log('🔍 Popup status check - still open, cannot access URL (cross-origin)')
        }
      } else {
        clearInterval(statusCheck)
      }
    }, 5000)
  }

  const renderStatusItem = (label: string, result: TestResult, icon: string) => {
    if (!result) return null;
    return (
      <div className={`p-3 rounded-lg border-2 transition-all ${
        result?.success
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{icon}</span>
            <span className="font-semibold">{label}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{result?.success ? '✅' : '❌'}</span>
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
  }

  const getManageConnectionUrl = (organizations: any[] | undefined): string | null => {
    if (!organizations || organizations.length === 0) return null;
    const org = organizations[0];
    const manageLink = org.links?.find((link: any) => link.rel === 'manage_connection');
    return manageLink?.uri || null;
  }

  const renderConnectionStatus = () => {
    switch (connectionStatus.status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-700">{refreshing ? 'Refreshing status...' : 'Checking connection status...'}</p>
          </div>
        )

      case 'auth_required':
        return (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-orange-300 text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🔑</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Authentication Required</h3>
            <p className="text-orange-700 mb-4">{connectionStatus.message}</p>
            <button
              onClick={handleJohnDeereConnect}
              disabled={connecting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold flex items-center space-x-2"
            >
              {connecting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{connecting ? 'Connecting...' : 'Connect to John Deere'}</span>
            </button>
          </div>
        )
      
      case 'connection_required':
      case 'no_organizations':
        return (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-300 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Connect Your Organization</h3>
            <p className="text-blue-700 mb-4">{connectionStatus.message}</p>
            <p className="text-sm text-gray-500 mb-4">
              After authenticating, you need to grant this application access to your John Deere organization data at{' '}
              <a href="https://connections.deere.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                connections.deere.com
              </a>.
            </p>
            <p className="text-xs text-gray-400 mb-4">It may take 5-15 minutes for permissions to sync after granting access.</p>
            <button
              onClick={refreshStatus}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center mx-auto space-x-2"
            >
              <span>↻</span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
            </button>
          </div>
        )

      case 'error':
        return (
          <div className="bg-red-50 border-red-200 border rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🚨</span>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
                <p className="text-red-700 text-sm">{connectionStatus.message}</p>
                {connectionStatus.error && <pre className="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded">{connectionStatus.error}</pre>}
              </div>
            </div>
          </div>
        )

      case 'partial_connection': {
        const { testResults, organizations } = connectionStatus;
        const manageConnectionUrl = getManageConnectionUrl(organizations);
        return (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-yellow-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Partially Connected</h3>
                <p className="text-yellow-700 font-medium">Some data endpoints are not responding correctly.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700">API Endpoint Status</h4>
                <div className="space-y-3">
                  {testResults && renderStatusItem('Fields', testResults.fields, '🌾')}
                  {testResults && renderStatusItem('Farms', testResults.farms, '🏡')}
                  {testResults && renderStatusItem('Equipment', testResults.equipment, '🚜')}
                  {testResults && renderStatusItem('Files', testResults.files, '📁')}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700">Connected Organizations</h4>
                {organizations && organizations.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-700 bg-white p-3 rounded-lg border">
                    {organizations.map(org => <li key={org.id}>{org.name} ({org.type})</li>)}
                  </ul>
                ) : <p className="text-gray-500 bg-white p-3 rounded-lg border">No organizations found.</p>}
              </div>
            </div>
            
            {manageConnectionUrl && (
              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-yellow-800">
                  <strong>Action Required:</strong> Some APIs need additional permissions. Use the button to manage your connection.
                </p>
                <a
                  href={manageConnectionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm"
                >
                  Manage Connection
                </a>
              </div>
            )}
          </div>
        )
      }

      case 'connected':
        const { testResults, organizations } = connectionStatus;
        const manageConnectionUrl = getManageConnectionUrl(organizations);
        return (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-green-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Successfully Connected</h3>
                <p className="text-green-700 font-medium">All systems operational.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700">API Endpoint Status</h4>
                <div className="space-y-3">
                  {testResults && renderStatusItem('Fields', testResults.fields, '🌾')}
                  {testResults && renderStatusItem('Farms', testResults.farms, '🏡')}
                  {testResults && renderStatusItem('Equipment', testResults.equipment, '🚜')}
                  {testResults && renderStatusItem('Files', testResults.files, '📁')}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700">Connected Organizations</h4>
                {organizations && organizations.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-700 bg-white p-3 rounded-lg border">
                    {organizations.map(org => <li key={org.id}>{org.name} ({org.type})</li>)}
                  </ul>
                ) : <p className="text-gray-500 bg-white p-3 rounded-lg border">No organizations found.</p>}
              </div>
            </div>
            
            {manageConnectionUrl && (
              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                <a
                  href={manageConnectionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm"
                >
                  Manage Connection
                </a>
              </div>
            )}
          </div>
        )
      
      default:
        return <div>Unhandled status: {connectionStatus.status}</div>
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">John Deere Connection</h2>
        <button
          onClick={refreshStatus}
          disabled={refreshing}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 disabled:bg-gray-200/50 flex items-center space-x-2 border border-gray-300 text-sm font-medium"
        >
          {refreshing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div> : <span>↻</span>}
          <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
        </button>
      </div>
      {renderConnectionStatus()}
    </div>
  )
} 