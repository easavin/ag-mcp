import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient } from '@/lib/johndeere-api'

export async function GET(request: NextRequest) {
  try {
    const johnDeereClient = getJohnDeereAPIClient()
    
    // Get organizations and their full response to extract connection links
    const response = await johnDeereClient.getOrganizationsWithConnectionLinks()
    
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
          testResults = await johnDeereClient.testDataAccess(firstOrg.id)
          
          // Determine status based on actual test results
          if (testResults.hasDataAccess) {
            status = 'connected'
          } else if (testResults.hasPartialAccess) {
            status = 'partial_connection'
          } else {
            status = 'connection_required'
          }
        } else {
          status = 'connection_required'
          testResults = { 
            hasDataAccess: false, 
            hasPartialAccess: false,
            testResults: {
              fields: { success: false, count: 0 },
              equipment: { success: false, count: 0 },
              farms: { success: false, count: 0 },
              assets: { success: false, count: 0 }
            }
          }
        }
        
        // Log detailed results for debugging
        console.log('🔍 Connection test results:', {
          hasDataAccess: !connectionRequired,
          hasPartialAccess: false,
          status,
          results: testResults.testResults,
          connectionRequired
        })
      } catch (error) {
        connectionRequired = true
        testResults = { hasDataAccess: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

          return NextResponse.json({
        status: organizations.length > 0 ? status : 'no_organizations',
      organizations: organizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        type: org.type,
        member: org.member,
      })),
      connectionLinks: (connectionLinks.length > 0 ? connectionLinks : (fallbackConnectionLink ? [fallbackConnectionLink] : [])).map(link => {
        // Add full access parameters to all connection links
        const url = new URL(link)
        url.searchParams.set('requestFullAccess', 'true')
        url.searchParams.set('scopes', 'ag1,ag2,ag3,eq1,offline_access')
        return url.toString()
      }),
      connectionRequired,
      testResults,
      instructions: connectionRequired ? {
        step1: 'Your app is authenticated but not connected to any organizations.',
        step2: 'Open the connection link below in your browser.',
        step3: 'Select the checkbox next to your organization name and grant full access to all data types.',
        step4: 'Once connected, you\'ll have access to your complete farming data.',
        connectionUrl: connectionLinks.length > 0 ? connectionLinks[0] : fallbackConnectionLink
      } : null
    })
  } catch (error) {
    console.error('Error checking connection status:', error)
    
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