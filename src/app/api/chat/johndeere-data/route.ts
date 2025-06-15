import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'
import { getMockDataForType, formatMockDataMessage } from '@/lib/johndeere-mock-data'

export async function POST(request: NextRequest) {
  try {
    const { dataType, organizationId, filters } = await request.json()

    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    // Try to get real data first
    let data
    let useMockData = false
    
    try {
      const johnDeereApi = getJohnDeereAPIClient()

      switch (dataType) {
        case 'organizations':
          data = await johnDeereApi.getOrganizations()
          break
        
        case 'fields':
          if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required for fields' }, { status: 400 })
          }
          data = await johnDeereApi.getFields(organizationId)
          break
        
        case 'equipment':
          if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required for equipment' }, { status: 400 })
          }
          data = await johnDeereApi.getEquipment(organizationId)
          break
        
        case 'operations':
          if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required for operations' }, { status: 400 })
          }
          data = await johnDeereApi.getFieldOperations(organizationId, {
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            fieldId: filters?.fieldId
          })
          break
        
        case 'comprehensive':
          if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required for comprehensive data' }, { status: 400 })
          }
          
          data = await johnDeereApi.getComprehensiveFarmData(organizationId)
          break
        
        default:
          return NextResponse.json({ error: 'Invalid data type' }, { status: 400 })
      }
    } catch (error: any) {
      // Check if it's a permission error (403) - if so, use mock data
      if (error.name === 'AuthorizationError' || 
          error.status === 403 ||
          error.message?.includes('authorization') || 
          error.message?.includes('403') || 
          (error.response && error.response.status === 403)) {
        console.log(`Permission denied for ${dataType}, using mock data`)
        useMockData = true
        data = getMockDataForType(dataType, organizationId)
      } else {
        // For other errors, throw them
        throw error
      }
    }

    if (useMockData) {
      // Return formatted mock data with explanation
      const formattedMessage = formatMockDataMessage(dataType, data)
      return NextResponse.json({ 
        success: true, 
        data,
        mockData: true,
        message: formattedMessage
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching John Deere data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch John Deere data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 