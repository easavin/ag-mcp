import { NextRequest, NextResponse } from 'next/server'
import { getJohnDeereAPIClient, JDField, JDOrganization, JDEquipment } from '@/lib/johndeere-api'
import { getMockDataForType, formatMockDataMessage } from '@/lib/johndeere-mock-data'
import { getCurrentUser } from '@/lib/auth'

// Helper function to format field data for better readability
function formatFieldsData(fields: JDField[]): string {
  if (!fields || fields.length === 0) {
    return "No fields found in your account."
  }

  const fieldList = fields.map((field, index) => {
    const name = field.name || `Field ${index + 1}`
    const area = field.area ? 
      `${field.area.measurement.toFixed(1)} ${field.area.unit || 'acres'}` : 
      'Unknown area'
    
    return `- **${name}**: ${area}`
  }).join('\n')

  const totalArea = fields.reduce((sum, field) => {
    return sum + (field.area?.measurement || 0)
  }, 0)

  const unit = fields[0]?.area?.unit || 'acres'

  return `## Your Fields (${fields.length} total)\n\n${fieldList}\n\n**Total Area**: ${totalArea.toFixed(1)} ${unit}`
}

// Helper function to format organization data
function formatOrganizationsData(organizations: JDOrganization[]): string {
  if (!organizations || organizations.length === 0) {
    return "No organizations found in your account."
  }

  if (organizations.length === 1) {
    const org = organizations[0]
    return `## Your Organization\n\n- **Name**: ${org.name}\n- **Type**: ${org.type}\n- **ID**: ${org.id}`
  }

  const orgList = organizations.map(org => 
    `- **${org.name}** (${org.type}) - ID: ${org.id}`
  ).join('\n')

  return `## Your Organizations (${organizations.length} total)\n\n${orgList}`
}

// Helper function to format equipment data
function formatEquipmentData(equipment: JDEquipment[]): string {
  if (!equipment || equipment.length === 0) {
    return "No equipment found in your account."
  }

  const equipmentList = equipment.map(item => {
    const name = item.name || 'Unknown Equipment'
    const details = []
    
    // Handle make and model as objects with name properties
    const make = typeof item.make === 'string' ? item.make : item.make?.name
    const model = typeof item.model === 'string' ? item.model : item.model?.name
    
    if (make) details.push(make)
    if (model) details.push(model)
    if (item.year) details.push(`(${item.year})`)
    
    const detailsStr = details.length > 0 ? ` - ${details.join(' ')}` : ''
    
    return `- **${name}**${detailsStr}`
  }).join('\n')

  return `## Your Equipment (${equipment.length} total)\n\n${equipmentList}`
}

export async function POST(request: NextRequest) {
  try {
    const { dataType, organizationId, filters } = await request.json()

    // Get current authenticated user
    const authUser = await getCurrentUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = authUser.id

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
          data = await johnDeereApi.getFieldOperationsForOrganization(finalOrganizationId!, {
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

    // Format the real data for better readability
    let formattedContent: string
    switch (dataType) {
      case 'organizations':
        formattedContent = formatOrganizationsData(data as JDOrganization[])
        break
      case 'fields':
        formattedContent = formatFieldsData(data as JDField[])
        break
      case 'equipment':
        formattedContent = formatEquipmentData(data as JDEquipment[])
        break
      case 'operations':
        formattedContent = `**Field Operations**\n\nFound ${Array.isArray(data) ? data.length : 0} operations in your account.`
        break
      case 'comprehensive':
        // For comprehensive data, format each section
        const compData = data as any
        const sections = []
        if (compData.fields) sections.push(formatFieldsData(compData.fields))
        if (compData.equipment) sections.push(formatEquipmentData(compData.equipment))
        if (compData.organization) sections.push(formatOrganizationsData([compData.organization]))
        formattedContent = sections.join('\n\n---\n\n')
        break
      default:
        formattedContent = `**${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data**\n\nReceived data from John Deere Operations Center.`
    }

    return NextResponse.json({ 
      success: true, 
      data,
      formattedContent,
      message: formattedContent
    })
  } catch (error) {
    console.error('Error fetching John Deere data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch John Deere data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 