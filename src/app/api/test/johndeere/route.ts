import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function GET(request: NextRequest) {
  try {
    const johnDeereClient = getJohnDeereAPIClient()
    
    // Test basic connectivity
    console.log('Testing John Deere API connectivity...')
    
    // Try to fetch organizations
    const organizations = await johnDeereClient.getOrganizations()
    
    if (organizations.length === 0) {
      return NextResponse.json({
        status: 'connected',
        message: 'John Deere API connected successfully, but no organizations found.',
        organizations: [],
        hasData: false,
      })
    }

    // If we have organizations, try to get data for the first one
    const firstOrg = organizations[0]
    console.log(`Testing data fetch for organization: ${firstOrg.name}`)
    
    const [fields, equipment] = await Promise.all([
      johnDeereClient.getFields(firstOrg.id).catch(err => {
        console.warn('Fields fetch failed:', err.message)
        return []
      }),
      johnDeereClient.getEquipment(firstOrg.id).catch(err => {
        console.warn('Equipment fetch failed:', err.message)
        return []
      }),
    ])

    return NextResponse.json({
      status: 'connected',
      message: 'John Deere API integration working successfully!',
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        type: org.type,
        member: org.member,
      })),
      testData: {
        organizationName: firstOrg.name,
        fieldsCount: fields.length,
        equipmentCount: equipment.length,
        sampleField: fields[0] ? {
          id: fields[0].id,
          name: fields[0].name,
          area: fields[0].area,
        } : null,
        sampleEquipment: equipment[0] ? {
          id: equipment[0].id,
          name: equipment[0].name,
          make: equipment[0].make,
          model: equipment[0].model,
        } : null,
      },
      hasData: true,
    })
  } catch (error) {
    console.error('John Deere API test failed:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('auth')) {
        return NextResponse.json({
          status: 'auth_required',
          message: 'John Deere authentication required. Please connect your account first.',
          error: error.message,
        }, { status: 401 })
      }
    }

    return NextResponse.json({
      status: 'error',
      message: 'John Deere API test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
} 