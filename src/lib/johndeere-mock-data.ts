// Mock data for John Deere API when sandbox permissions are limited
export const mockJohnDeereData = {
  organizations: [
    {
      "@type": "Organization",
      "id": "905901",
      "name": "Green Growth",
      "type": "customer",
      "member": true,
      "internal": false,
      "hierarchyEnabled": false,
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/organizations/905901"
        }
      ]
    }
  ],

  fields: [
    {
      "@type": "Field",
      "id": "field_001",
      "name": "North Field",
      "archived": false,
      "area": {
        "measurement": 45.7,
        "unit": "acres"
      },
      "boundary": {
        "type": "Polygon",
        "coordinates": [[
          [-93.7849, 41.5868],
          [-93.7849, 41.5878],
          [-93.7839, 41.5878],
          [-93.7839, 41.5868],
          [-93.7849, 41.5868]
        ]]
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fields/field_001"
        }
      ]
    },
    {
      "@type": "Field",
      "id": "field_002",
      "name": "South Field",
      "archived": false,
      "area": {
        "measurement": 32.4,
        "unit": "acres"
      },
      "boundary": {
        "type": "Polygon",
        "coordinates": [[
          [-93.7859, 41.5858],
          [-93.7859, 41.5868],
          [-93.7849, 41.5868],
          [-93.7849, 41.5858],
          [-93.7859, 41.5858]
        ]]
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fields/field_002"
        }
      ]
    },
    {
      "@type": "Field",
      "id": "field_003",
      "name": "East Field",
      "archived": false,
      "area": {
        "measurement": 28.9,
        "unit": "acres"
      },
      "boundary": {
        "type": "Polygon",
        "coordinates": [[
          [-93.7839, 41.5868],
          [-93.7839, 41.5878],
          [-93.7829, 41.5878],
          [-93.7829, 41.5868],
          [-93.7839, 41.5868]
        ]]
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fields/field_003"
        }
      ]
    }
  ],

  equipment: [
    {
      "@type": "Equipment",
      "id": "equipment_001",
      "name": "John Deere 8R 370",
      "category": "Tractor",
      "make": "John Deere",
      "model": "8R 370",
      "serialNumber": "1RW8R370ABC123456",
      "year": 2023,
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/equipment/equipment_001"
        }
      ]
    },
    {
      "@type": "Equipment",
      "id": "equipment_002",
      "name": "John Deere DB60",
      "category": "Planter",
      "make": "John Deere",
      "model": "DB60",
      "serialNumber": "1A0DB60ABC789012",
      "year": 2022,
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/equipment/equipment_002"
        }
      ]
    },
    {
      "@type": "Equipment",
      "id": "equipment_003",
      "name": "John Deere S780",
      "category": "Combine",
      "make": "John Deere",
      "model": "S780",
      "serialNumber": "1H0S780DEF345678",
      "year": 2021,
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/equipment/equipment_003"
        }
      ]
    }
  ],

  fieldOperations: [
    {
      "@type": "FieldOperation",
      "id": "operation_001",
      "type": "Planting",
      "operationType": "Seeding",
      "startTime": "2024-04-15T08:00:00Z",
      "endTime": "2024-04-15T16:30:00Z",
      "area": {
        "measurement": 45.7,
        "unit": "acres"
      },
      "totalDistance": {
        "measurement": 12.3,
        "unit": "miles"
      },
      "field": {
        "id": "field_001",
        "name": "North Field"
      },
      "equipment": {
        "id": "equipment_001",
        "name": "John Deere 8R 370"
      },
      "prescription": {
        "applied": true,
        "type": "Variable Rate Seeding",
        "seedRate": "32,000-36,000 seeds/acre"
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fieldOperations/operation_001"
        }
      ]
    },
    {
      "@type": "FieldOperation",
      "id": "operation_002",
      "type": "Harvesting",
      "operationType": "Harvesting",
      "startTime": "2024-09-20T09:00:00Z",
      "endTime": "2024-09-20T18:45:00Z",
      "area": {
        "measurement": 32.4,
        "unit": "acres"
      },
      "totalDistance": {
        "measurement": 8.7,
        "unit": "miles"
      },
      "field": {
        "id": "field_002",
        "name": "South Field"
      },
      "equipment": {
        "id": "equipment_003",
        "name": "John Deere S780"
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fieldOperations/operation_002"
        }
      ]
    },
    {
      "@type": "FieldOperation",
      "id": "operation_003",
      "type": "Fertilizing",
      "operationType": "Application",
      "startTime": "2024-03-10T10:30:00Z",
      "endTime": "2024-03-10T15:15:00Z",
      "area": {
        "measurement": 28.9,
        "unit": "acres"
      },
      "totalDistance": {
        "measurement": 6.2,
        "unit": "miles"
      },
      "field": {
        "id": "field_003",
        "name": "East Field"
      },
      "equipment": {
        "id": "equipment_001",
        "name": "John Deere 8R 370"
      },
      "prescription": {
        "applied": true,
        "type": "Variable Rate Fertilizer",
        "product": "28-0-0 UAN",
        "rate": "120-150 lbs/acre"
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fieldOperations/operation_003"
        }
      ]
    },
    {
      "@type": "FieldOperation",
      "id": "operation_004",
      "type": "Spraying",
      "operationType": "Application",
      "startTime": "2024-05-22T06:00:00Z",
      "endTime": "2024-05-22T11:30:00Z",
      "area": {
        "measurement": 45.7,
        "unit": "acres"
      },
      "totalDistance": {
        "measurement": 9.8,
        "unit": "miles"
      },
      "field": {
        "id": "field_001",
        "name": "North Field"
      },
      "equipment": {
        "id": "equipment_002",
        "name": "John Deere R4030"
      },
      "prescription": {
        "applied": true,
        "type": "Variable Rate Herbicide",
        "product": "Roundup PowerMAX",
        "rate": "22-32 oz/acre"
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fieldOperations/operation_004"
        }
      ]
    },
    {
      "@type": "FieldOperation",
      "id": "operation_005",
      "type": "Lime Application",
      "operationType": "Application",
      "startTime": "2024-02-28T09:00:00Z",
      "endTime": "2024-02-28T14:30:00Z",
      "area": {
        "measurement": 32.4,
        "unit": "acres"
      },
      "totalDistance": {
        "measurement": 7.1,
        "unit": "miles"
      },
      "field": {
        "id": "field_002",
        "name": "South Field"
      },
      "equipment": {
        "id": "equipment_001",
        "name": "John Deere 8R 370"
      },
      "prescription": {
        "applied": true,
        "type": "Variable Rate Lime",
        "product": "Agricultural Limestone",
        "rate": "1.5-2.2 tons/acre"
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/fieldOperations/operation_005"
        }
      ]
    }
  ],

  assets: [
    {
      "@type": "Asset",
      "id": "asset_001",
      "title": "2024 Corn Planting Plan",
      "assetCategory": "PRESCRIPTION_MAP",
      "assetType": "PLANTING_PRESCRIPTION",
      "assetSubType": "SEED_RATE",
      "lastModifiedDate": "2024-04-10T14:30:00Z",
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/assets/asset_001"
        }
      ]
    },
    {
      "@type": "Asset",
      "id": "asset_002",
      "title": "Soil Test Results - North Field",
      "assetCategory": "ANALYSIS",
      "assetType": "SOIL_TEST",
      "assetSubType": "NUTRIENT_ANALYSIS",
      "lastModifiedDate": "2024-02-15T11:20:00Z",
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/assets/asset_002"
        }
      ]
    }
  ],

  farms: [
    {
      "@type": "Farm",
      "id": "farm_001",
      "name": "Green Growth Farm",
      "archived": false,
      "area": {
        "measurement": 107.0,
        "unit": "acres"
      },
      "links": [
        {
          "@type": "Link",
          "rel": "self",
          "uri": "https://api.deere.com/platform/farms/farm_001"
        }
      ]
    }
  ]
}

export function getMockDataForType(dataType: string, organizationId?: string) {
  switch (dataType) {
    case 'organizations':
      return mockJohnDeereData.organizations
    case 'fields':
      return mockJohnDeereData.fields
    case 'equipment':
      return mockJohnDeereData.equipment
    case 'operations':
      return mockJohnDeereData.fieldOperations
    case 'assets':
      return mockJohnDeereData.assets
    case 'farms':
      return mockJohnDeereData.farms
    case 'comprehensive':
      return {
        organization: mockJohnDeereData.organizations[0],
        fields: mockJohnDeereData.fields,
        equipment: mockJohnDeereData.equipment,
        operations: mockJohnDeereData.fieldOperations,
        assets: mockJohnDeereData.assets,
        farms: mockJohnDeereData.farms
      }
    default:
      return []
  }
}

export function formatMockDataMessage(dataType: string, data: any): string {
  const disclaimer = `**🚨 Note: This is mock data for demonstration purposes**

Your John Deere sandbox account has limited permissions. In a production environment with proper permissions, this would be your actual farming data.

---

`

  if (dataType === 'comprehensive') {
    return disclaimer + `**Complete Farm Summary for ${data.organization.name}**

**📊 Overview:**
- **Fields:** ${data.fields.length} fields totaling ${data.fields.reduce((sum: number, field: any) => sum + field.area.measurement, 0).toFixed(1)} acres
- **Equipment:** ${data.equipment.length} pieces of equipment
- **Operations:** ${data.operations.length} field operations recorded
- **Assets:** ${data.assets.length} digital assets

**🌾 Fields:**
${data.fields.map((field: any, index: number) => 
  `${index + 1}. **${field.name}** - ${field.area.measurement} ${field.area.unit}`
).join('\n')}

**🚜 Equipment:**
${data.equipment.map((equipment: any, index: number) => 
  `${index + 1}. **${equipment.name}** (${equipment.year} ${equipment.make} ${equipment.model})`
).join('\n')}

**📋 Recent Operations:**
${data.operations.map((op: any, index: number) => 
  `${index + 1}. **${op.type}** on ${op.field.name} - ${new Date(op.startTime).toLocaleDateString()}${op.prescription ? ` (${op.prescription.type})` : ''}`
).join('\n')}

**📁 Assets:**
${data.assets.map((asset: any, index: number) => 
  `${index + 1}. **${asset.title}** (${asset.assetType})`
).join('\n')}`
  }

  if (Array.isArray(data)) {
    return disclaimer + `**${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data (${data.length} records):**

${data.map((item: any, index: number) => {
  const name = item.name || item.title || item.id
  const details = []
  
  if (item.area) details.push(`${item.area.measurement} ${item.area.unit}`)
  if (item.make && item.model) details.push(`${item.year} ${item.make} ${item.model}`)
  if (item.type) details.push(item.type)
  if (item.operationType) details.push(item.operationType)
  if (item.prescription) details.push(`Prescription: ${item.prescription.type}`)
  
  return `**${index + 1}. ${name}**${details.length > 0 ? ` - ${details.join(', ')}` : ''}`
}).join('\n')}`
  }

  return disclaimer + `**${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data:**

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\``
} 