import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Connection status check started')
    
    // First, check if user is authenticated
    const authUser = await getCurrentUser()
    if (!authUser?.id) {
      return NextResponse.json({
        status: 'auth_required',
        message: 'User authentication required. Please sign in first.',
      }, { status: 401 })
    }

    // Check if user has John Deere tokens
    const tokenRecord = await prisma.johnDeereToken.findUnique({
      where: { userId: authUser.id },
    })

    if (!tokenRecord) {
      console.log('📋 No John Deere tokens found for user, returning not_connected status')
      return NextResponse.json({
        status: 'not_connected',
        message: 'John Deere account not connected. Please connect your account first.',
        organizations: [],
        connectionRequired: true,
      })
    }

    // Check if token is expired and can't be refreshed
    if (new Date() >= tokenRecord.expiresAt && !tokenRecord.refreshToken) {
      console.log('🔒 John Deere tokens expired and no refresh token available')
      return NextResponse.json({
        status: 'token_expired',
        message: 'John Deere tokens have expired. Please reconnect your account.',
        organizations: [],
        connectionRequired: true,
      })
    }

    console.log('✅ User has John Deere tokens, checking connection status...')
    const johnDeereClient = getJohnDeereAPIClient()
    
    // Get organizations and their full response to extract connection links
    console.log('📡 Fetching organizations with connection links...')
    let response
    try {
      response = await johnDeereClient.getOrganizationsWithConnectionLinks()
      console.log('✅ Organizations response received:', {
        organizationsCount: response.organizations?.length || 0,
        connectionLinksCount: response.connectionLinks?.length || 0
      })
    } catch (apiError: any) {
      console.error('❌ Error fetching organizations with connection links:', apiError)

      // Check for DNS/network issues
      if (apiError.code === 'ENOTFOUND' || apiError.message?.includes('ENOTFOUND')) {
        console.log('🌐 DNS/Network issue detected - John Deere API may be temporarily unavailable')

        return NextResponse.json({
          status: 'api_unavailable',
          message: 'John Deere API is currently unavailable (DNS resolution failed). This may be a temporary network issue.',
          details: 'The sandbox API endpoint (sandboxapi.deere.com) is not reachable. OAuth tokens are valid but data access is temporarily unavailable.',
          organizations: [],
          connectionRequired: false, // Don't require reconnection since tokens are valid
          apiStatus: 'unavailable',
          troubleshooting: {
            issue: 'DNS resolution failed for sandboxapi.deere.com',
            possibleCauses: [
              'Temporary network connectivity issue',
              'John Deere sandbox API maintenance',
              'DNS server configuration issues',
              'Firewall blocking DNS queries'
            ],
            suggestions: [
              'Wait a few minutes and try again',
              'Check your internet connection',
              'Try switching between WiFi and mobile data',
              'Contact John Deere support if issue persists'
            ]
          }
        })
      }

      // Re-throw for other error types to be handled below
      throw apiError
    }
    
    const organizations = response.organizations || []
    const connectionLinks = response.connectionLinks || []
    
    // If no connection links found, try to construct one based on John Deere support guidance
    // The format from support: https://connections.deere.com/connections/0oap6omdg8Hj2j8jG5d7/select-organizations
    let fallbackConnectionLink = null
    if (connectionLinks.length === 0 && organizations.length > 0) {
      // Try to extract client ID from the organizations or use a known pattern
      // This is based on the support ticket example
      const clientId = '0oap6omdg8Hj2j8jG5d7' // Your app's client ID
      // Add parameters to request full access by default
      fallbackConnectionLink = `https://connections.deere.com/connections/${clientId}/select-organizations?requestFullAccess=true&scopes=ag1,ag2,ag3,eq1,offline_access`
      console.log('📋 Using fallback connection link with full access request:', fallbackConnectionLink)
    }
    
    // Check connection status based on organization links
    let connectionRequired = false
    let testResults = null
    let status = 'connection_required' // Default status
    
    if (organizations.length > 0) {
      // Check connection status for the first organization
      const firstOrg = organizations[0]
      try {
        const connectionStatus = await johnDeereClient.checkOrganizationConnection(firstOrg.id)
        
        // If organization is connected (has manage_connection link), it's connected
        connectionRequired = !connectionStatus.isConnected
        
        if (connectionStatus.isConnected) {
          // Actually test the data access instead of hardcoding
          const testSummary = await johnDeereClient.testDataAccess(firstOrg.id)
          testResults = testSummary.testResults
          status = testSummary.hasDataAccess ? (testSummary.hasPartialAccess ? 'partial_connection' : 'connected') : 'connection_required'
          
          // Log detailed results for debugging
          console.log('🔍 Connection test results:', {
            hasDataAccess: !connectionRequired,
            hasPartialAccess: false,
            status,
            testResults: testResults,
            connectionRequired
          })
        } else {
          status = 'connection_required'
          testResults = { 
            fields: { success: false, count: 0, error: null },
            farms: { success: false, count: 0, error: null },
            equipment: { success: false, count: 0, error: null },
            files: { success: false, count: 0, error: null },
          }
        }
      } catch (error) {
        connectionRequired = true
        testResults = { fields: { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }, farms: { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }, equipment: { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' }, files: { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error' } }
      }
    }

    if (!testResults) {
      return NextResponse.json({
        status: 'no_organizations',
        message: 'No organizations found for this account.',
        organizations: [],
      });
    }

    if (connectionRequired) {
      return NextResponse.json({
        status: 'connection_required',
        message: 'Connection with John Deere organization is required to access data.',
        organizations,
      });
    }

    return NextResponse.json({
      status: status, // 'connected' or 'partial_connection'
      message: status === 'connected' ? 'Successfully connected.' : 'Partially connected, some endpoints failed.',
      organizations,
      testResults: testResults,
    });
  } catch (error: any) {
    console.error('Error in John Deere connection status:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('auth')) {
        return NextResponse.json(
          { 
            status: 'auth_required',
            error: 'John Deere authentication required. Please connect your account first.',
            instructions: {
              step1: 'You need to authenticate with John Deere first.',
              step2: 'Go to the Integrations section and connect your John Deere account.',
            }
          },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to check connection status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 