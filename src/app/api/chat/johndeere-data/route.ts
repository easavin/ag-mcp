import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function POST(request: NextRequest) {
  try {
    const { dataType, organizationId, filters } = await request.json()

    // TODO: Get user ID from authentication session
    const userId = 'user_placeholder'

    const johnDeereApi = getJohnDeereAPIClient()

    let data
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

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching John Deere data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch John Deere data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 