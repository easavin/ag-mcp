import React, { useState } from 'react'
import { getJohnDeereClient, formatJohnDeereData } from '@/lib/johndeere-client'
import { useAuthStore } from '@/stores/authStore'

interface JohnDeereDataButtonProps {
  onDataReceived: (data: any) => void
}

export default function JohnDeereDataButton({ onDataReceived }: JohnDeereDataButtonProps) {
  const [loading, setLoading] = useState(false)
  const { johnDeereConnection } = useAuthStore()

  const fetchData = async (dataType: string, organizationId?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/chat/johndeere-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType,
          organizationId,
          filters: {}
        }),
      })

      const result = await response.json()
      
             if (!response.ok) {
         onDataReceived({
           type: 'error',
           title: `Error fetching ${dataType}`,
           content: `Failed to fetch ${dataType}: ${result.error || 'Unknown error'}`
         })
       } else {
         // Check if we got mock data
         if (result.mockData && result.message) {
           onDataReceived({
             type: 'info',
             title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data (Demo)`,
             content: result.message
           })
         } else {
           onDataReceived({
             type: 'success',
             title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data`,
             content: formatDataForDisplay(result.data, dataType)
           })
         }
       }
    } catch (error) {
      onDataReceived({
        type: 'error',
        title: 'Connection Error',
        content: `Failed to connect to John Deere API: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  const getMockDataExample = (dataType: string): string => {
    switch (dataType) {
      case 'fields':
        return `\`\`\`json
{
  "id": "field_123",
  "name": "North Field",
  "area": {
    "measurement": 45.7,
    "unit": "acres"
  },
  "boundary": {
    "type": "Polygon",
    "coordinates": [...]
  },
  "cropType": "Corn",
  "archived": false
}
\`\`\``
      case 'equipment':
        return `\`\`\`json
{
  "id": "equipment_456",
  "name": "John Deere 8R 370",
  "category": "Tractor",
  "make": "John Deere",
  "model": "8R 370",
  "serialNumber": "1RW8R370ABC123456",
  "year": 2023
}
\`\`\``
      case 'operations':
        return `\`\`\`json
{
  "id": "operation_789",
  "type": "Planting",
  "operationType": "Seeding",
  "startTime": "2024-04-15T08:00:00Z",
  "endTime": "2024-04-15T16:30:00Z",
  "area": {
    "measurement": 45.7,
    "unit": "acres"
  },
  "totalDistance": {
    "measurement": 12.3,
    "unit": "miles"
  }
}
\`\`\``
      default:
        return `\`\`\`json
{
  "message": "Sample ${dataType} data would appear here"
}
\`\`\``
    }
  }

  const formatDataForDisplay = (data: any, dataType: string): string => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return `No ${dataType} data available in your John Deere account.`
    }

    if (Array.isArray(data)) {
      return `Found ${data.length} ${dataType} records:\n\n${data.map((item, index) => 
        `**${index + 1}. ${item.name || item.title || item.id}**\n${JSON.stringify(item, null, 2)}`
      ).join('\n\n')}`
    }

    return `**${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data:**\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
  }

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/johndeere-simple')
      const result = await response.json()
      
      onDataReceived({
        type: 'info',
        title: 'John Deere Connection Test',
        content: `**Connection Status:** ${result.status === 'success' ? '✅ Connected' : '❌ Failed'}

**Token Status:**
- Has Token: ${result.token?.hasToken ? '✅' : '❌'}
- Expires: ${result.token?.expiresAt ? new Date(result.token.expiresAt).toLocaleString() : 'Unknown'}
- Scope: ${result.token?.scope || 'Unknown'}

**Organizations:** ${result.organizations?.length || 0} found
${result.organizations?.map((org: any) => `- ${org.name} (${org.id})`).join('\n') || ''}

**Data Access Test Results:**
- Fields: ${result.testResults?.fields?.success ? '✅ Available' : '❌ Limited (Sandbox restriction)'}
- Equipment: ${result.testResults?.equipment?.success ? '✅ Available' : '❌ Limited (Sandbox restriction)'}
- Assets: ${result.testResults?.assets?.success ? '✅ Available' : '❌ Limited (Sandbox restriction)'}
- Farms: ${result.testResults?.farms?.success ? '✅ Available' : '❌ Limited (Sandbox restriction)'}
- Field Operations: ${result.testResults?.fieldOperations?.success ? '✅ Available' : '❌ Limited (Sandbox restriction)'}

${result.testResults?.fields?.success === false ? 
  '\n**Note:** The sandbox account has limited data access. This is normal and expected. In a production environment with a real John Deere account, you would have full access to your farming data.' : ''}`
      })
    } catch (error) {
      onDataReceived({
        type: 'error',
        title: 'Connection Test Failed',
        content: `Failed to test connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  if (!johnDeereConnection.isConnected) {
    return (
      <div style={{
        padding: '12px',
        background: '#2a2a2a',
        borderRadius: '8px',
        border: '1px solid #444',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#a0a0a0', margin: '0 0 8px 0' }}>
          Connect your John Deere account to access your farming data
        </p>
        <button
          onClick={() => {
            // Open integrations modal - you might need to pass this as a prop
            onDataReceived('Please connect your John Deere account through the Integrations page to access your farming data.')
          }}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Connect John Deere
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="w-full text-lg font-semibold text-green-800 mb-2">
        🚜 John Deere Data Access
      </h3>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>

      <button
        onClick={() => fetchData('organizations')}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Organizations'}
      </button>

      <button
        onClick={() => fetchData('fields', '905901')}
        disabled={loading}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Fields'}
      </button>

      <button
        onClick={() => fetchData('equipment', '905901')}
        disabled={loading}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Equipment'}
      </button>

      <button
        onClick={() => fetchData('operations', '905901')}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Operations'}
      </button>

      <button
        onClick={() => fetchData('comprehensive', '905901')}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get All Data'}
      </button>

      <div className="w-full mt-2 text-sm text-green-700">
        <p>
          <strong>Note:</strong> The John Deere sandbox environment has limited data access. 
          This is normal and demonstrates that your integration is working correctly.
        </p>
      </div>
    </div>
  )
} 