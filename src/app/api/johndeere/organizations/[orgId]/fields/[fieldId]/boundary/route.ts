import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string; fieldId: string } }
) {
  // Initialize with params.orgId as default to avoid "used before assigned" error
  let targetOrgId: string = params.orgId

  try {
    // Get current authenticated user
    const authUser = await getCurrentUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { orgId } = params
    const body = await request.json()
    const { fieldName, organizationId } = body

    if (!fieldName) {
      return NextResponse.json(
        { error: 'fieldName is required' },
        { status: 400 }
      )
    }

    // Use the organizationId from the body if provided, otherwise use the one from params
    targetOrgId = organizationId || orgId

    console.log(`🔍 Getting boundary for field "${fieldName}" in organization ${targetOrgId}`)

    // Get John Deere API client
    const apiClient = getJohnDeereAPIClient()
    
    // First get the field details to find the field by name
    const fields = await apiClient.getFields(targetOrgId)
    const field = fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase())
    
    if (!field) {
      return NextResponse.json(
        { error: `Field "${fieldName}" not found in organization` },
        { status: 404 }
      )
    }

    // Check organization connection status before making boundary request
    console.log(`🔗 Checking organization connection status for ${targetOrgId}`)
    const connectionStatus = await apiClient.checkOrganizationConnection(targetOrgId)

    if (!connectionStatus.isConnected) {
      console.error(`❌ Organization ${targetOrgId} is not connected`)
      return NextResponse.json({
        error: 'Organization not connected to John Deere. Please establish connection first.',
        connectionUrl: connectionStatus.connectionUrl,
        organizationId: targetOrgId
      }, { status: 403 })
    }

    console.log(`✅ Organization ${targetOrgId} is connected, proceeding with boundary request`)

    // Get the boundary data using the field ID directly
    const boundaryData = await apiClient.getBoundariesForField(field.id, targetOrgId)

    return NextResponse.json({
      success: true,
      message: `Successfully retrieved boundary data for field "${field.name}"`,
      data: {
        field: {
          id: field.id,
          name: field.name,
          area: field.area
        },
        boundary: boundaryData,
        connectionStatus: 'connected'
      }
    })

  } catch (error: any) {
    console.error('❌ Error getting field boundary:', error)

    // Handle specific John Deere error types
    const { JohnDeereConnectionError, JohnDeereRCAError, JohnDeerePermissionError } = await import('@/lib/johndeere-api')

    if (error instanceof JohnDeerePermissionError) {
      console.error('🚫 Permission error:', error.message)
      return NextResponse.json({
        error: error.message,
        requiredScopes: error.requiredScopes,
        currentScopes: error.currentScopes,
        type: 'permission_error',
        actionRequired: 'Please reconnect your John Deere account with the required permissions (ag2 or ag3 scope).'
      }, { status: 403 })
    }

    if (error instanceof JohnDeereRCAError) {
      console.error('🔒 RCA error:', error.message)
      return NextResponse.json({
        error: error.message,
        rcaUrl: error.rcaUrl,
        type: 'rca_error',
        actionRequired: 'Please complete the required customer action at the provided URL.'
      }, { status: 403 })
    }

    if (error instanceof JohnDeereConnectionError) {
      console.error('🔗 Connection error:', error.message)
      return NextResponse.json({
        error: error.message,
        organizationId: targetOrgId,
        type: 'connection_error',
        actionRequired: 'Please establish connection between your application and John Deere organization.'
      }, { status: 403 })
    }

    // Handle generic authentication errors
    if (error.message?.includes('authentication') || error.message?.includes('token')) {
      return NextResponse.json({
        error: 'John Deere authentication required. Please connect your account.',
        type: 'auth_error'
      }, { status: 401 })
    }

    // Handle generic permission errors
    if (error.message?.includes('permission') || error.message?.includes('access')) {
      return NextResponse.json({
        error: 'Insufficient permissions to access this field boundary data.',
        type: 'permission_error'
      }, { status: 403 })
    }

    return NextResponse.json({
      error: `Failed to get field boundary: ${error.message}`,
      type: 'unknown_error'
    }, { status: 500 })
  }
}