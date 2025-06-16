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
    let finalOrganizationId = organizationId
    
    try {
      const johnDeereApi = getJohnDeereAPIClient()

      // If no organizationId is provided but we need one, fetch organizations and use the first one
      if (!organizationId && ['fields', 'equipment', 'operations', 'comprehensive'].includes(dataType)) {
        console.log(`No organization ID provided for ${dataType}, fetching organizations...`)
        const organizations = await johnDeereApi.getOrganizations()
        if (organizations.length === 0) {
          return NextResponse.json({ error: 'No organizations found. Please connect your John Deere account.' }, { status: 404 })
        }
        finalOrganizationId = organizations[0].id
        console.log(`Using organization: ${organizations[0].name} (${finalOrganizationId})`)
      }

      switch (dataType) {
        case 'organizations':
          data = await johnDeereApi.getOrganizations()
          break
        
        case 'fields':
          data = await johnDeereApi.getFields(finalOrganizationId!)
          break
        
        case 'equipment':
          data = await johnDeereApi.getEquipment(finalOrganizationId!)
          break
        
        case 'operations':
          data = await johnDeereApi.getFieldOperations(finalOrganizationId!, {
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            fieldId: filters?.fieldId
          })
          break
        
        case 'comprehensive':
          data = await johnDeereApi.getComprehensiveFarmData(finalOrganizationId!)
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
        data = getMockDataForType(dataType, finalOrganizationId)
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