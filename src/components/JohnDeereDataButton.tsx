import { useState } from 'react'
import { getJohnDeereClient, formatJohnDeereData } from '@/lib/johndeere-client'
import { useAuthStore } from '@/stores/authStore'

interface JohnDeereDataButtonProps {
  onDataFetched: (data: string) => void
}

export default function JohnDeereDataButton({ onDataFetched }: JohnDeereDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const { johnDeereConnection } = useAuthStore()

  const fetchData = async (dataType: 'organizations' | 'fields' | 'equipment' | 'comprehensive', organizationId?: string) => {
    setIsLoading(true)
    try {
      const client = getJohnDeereClient()
      let response

      switch (dataType) {
        case 'organizations':
          response = await client.getOrganizations()
          break
        case 'fields':
          if (!organizationId) {
            // First get organizations to get the first org ID
            const orgsResponse = await client.getOrganizations()
            if (orgsResponse.success && orgsResponse.data?.length > 0) {
              organizationId = orgsResponse.data[0].id
            } else {
              throw new Error('No organizations found')
            }
          }
          if (!organizationId) throw new Error('Organization ID is required')
          response = await client.getFields(organizationId)
          break
        case 'equipment':
          if (!organizationId) {
            // First get organizations to get the first org ID
            const orgsResponse = await client.getOrganizations()
            if (orgsResponse.success && orgsResponse.data?.length > 0) {
              organizationId = orgsResponse.data[0].id
            } else {
              throw new Error('No organizations found')
            }
          }
          if (!organizationId) throw new Error('Organization ID is required')
          response = await client.getEquipment(organizationId)
          break
        case 'comprehensive':
          if (!organizationId) {
            // First get organizations to get the first org ID
            const orgsResponse = await client.getOrganizations()
            if (orgsResponse.success && orgsResponse.data?.length > 0) {
              organizationId = orgsResponse.data[0].id
            } else {
              throw new Error('No organizations found')
            }
          }
          if (!organizationId) throw new Error('Organization ID is required')
          response = await client.getComprehensiveData(organizationId)
          break
      }

      if (response.success) {
        const formattedData = formatJohnDeereData(response.data, dataType)
        onDataFetched(`Here's your ${dataType} data from John Deere Operations Center:\n\n${formattedData}`)
      } else {
        onDataFetched(`Failed to fetch ${dataType}: ${response.error}`)
      }
    } catch (error) {
      console.error('Error fetching John Deere data:', error)
      onDataFetched(`Error fetching ${dataType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      setShowOptions(false)
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
            onDataFetched('Please connect your John Deere account through the Integrations page to access your farming data.')
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
    <div style={{
      padding: '12px',
      background: '#2a2a2a',
      borderRadius: '8px',
      border: '1px solid #444',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#059669'
        }} />
        <span style={{ color: '#f5f5f5', fontWeight: '500' }}>
          John Deere Connected
        </span>
      </div>
      
      {!showOptions ? (
        <button
          onClick={() => setShowOptions(true)}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          {isLoading ? 'Loading...' : 'Fetch My Farm Data'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => fetchData('organizations')}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              background: '#333',
              color: '#f5f5f5',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            📋 My Organizations
          </button>
          <button
            onClick={() => fetchData('fields')}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              background: '#333',
              color: '#f5f5f5',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            🌾 My Fields
          </button>
          <button
            onClick={() => fetchData('equipment')}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              background: '#333',
              color: '#f5f5f5',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            🚜 My Equipment
          </button>
          <button
            onClick={() => fetchData('comprehensive')}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              background: '#333',
              color: '#f5f5f5',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            📊 Complete Farm Summary
          </button>
          <button
            onClick={() => setShowOptions(false)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: '#a0a0a0',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
} 