import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    const johnDeereClient = getJohnDeereAPIClient()
    
    // Get comprehensive farm data
    const farmData = await johnDeereClient.getComprehensiveFarmData(orgId)

    return NextResponse.json({
      organizationId: orgId,
      ...farmData,
      summary: {
        fieldsCount: farmData.fields.length,
        equipmentCount: farmData.equipment.length,
        operationsCount: farmData.operations.length,
        assetsCount: farmData.assets.length,
        farmsCount: farmData.farms.length,
        totalFieldArea: farmData.fields.reduce((total: number, field: any) => total + (field.area?.measurement || 0), 0),
      },
    })
  } catch (error) {
    console.error('Error fetching comprehensive farm data:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('auth')) {
        return NextResponse.json(
          { error: 'John Deere authentication required. Please connect your account.' },
          { status: 401 }
        )
      }
      if (error.message.includes('Organization not found')) {
        return NextResponse.json(
          { error: 'Organization not found or access denied.' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch comprehensive farm data' },
      { status: 500 }
    )
  }
} 