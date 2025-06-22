# Auravant API Reference

## Overview

Auravant is a comprehensive digital agriculture platform that enables farmers to manage field operations, livestock, and farm planning through a unified interface. Unlike other agricultural platforms, Auravant provides extensive livestock management capabilities alongside traditional crop management features.

**Platform Scale:** Leading agricultural platform in South America (Argentina, Brazil, Paraguay)
**Unique Features:** Livestock management, work order system, multilingual support (Spanish, English, Portuguese)

## Developer Account Setup

### Prerequisites
1. **Developer Account Registration**: Apply for developer status within your Auravant account
2. **Extension Creation**: Create an "Extension" (Auravant's app concept) in the Developer Space
3. **Token Generation**: Generate test tokens for development
4. **No Cost**: Developer accounts and Extensions are free

### Getting Started Process
1. **Login to Auravant**: Access your existing Auravant account
2. **Navigate to Settings**: Go to user menu → Settings
3. **Apply for Developer Status**: Click "Apply to be a developer" in Developer application section
4. **Create Extension**: Once approved, access Developer Space and create new Extension
5. **Generate Tokens**: Use Developer Mode to generate authentication tokens

### Developer Support
- **Email**: `devhelp@auravant.com`
- **General Support**: `hi@auravant.com`
- **Documentation**: https://developers.auravant.com/

## Authentication & Security

### Bearer Token Authentication
Auravant uses a simplified Bearer token authentication system (no OAuth2 complexity):

#### 1. Token Types

**Global Token (Extension Runtime):**
- **Usage**: Automatically available within Extensions
- **Scope**: Full access to user's authorized data
- **Lifespan**: Session-based (dynamic generation)

**Test Tokens (Development):**
- **Usage**: Generated for testing with tools like Postman
- **Scope**: Same as global token but for development
- **Lifespan**: Temporary (expire after session)
- **Generation**: Available in Developer Space → Version box

#### 2. Required Headers

**All API Calls:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

#### 3. Authentication Example
```bash
curl -H "Authorization: Bearer your_token_here" \
     -H "Content-Type: application/json" \
     https://api.auravant.com/api/fields
```

### Security Features
- **HTTPS Only**: All communications encrypted
- **Token-Based**: Simplified authentication without OAuth2 complexity
- **Session Management**: Dynamic token generation per Extension execution
- **Permission-Based**: Module-specific permissions (livestock, field management, etc.)

## Available Permissions & Modules

### Core Modules
```
Field Management    - Access to fields, farms, boundaries
Season Register     - Create, view, modify, delete labour operations
Livestock          - Herd management, paddock operations, transactions
Work Orders        - Planning, execution, recommendations
Storage            - Warehouse and inventory management
Maps & Imagery     - Satellite images, yield maps, soil maps
Sensors            - Weather stations, soil sensors, IoT devices
```

### Permission Levels
```
View Season        - Read access to season data
Create Labour      - Create new labour operations
Modify Labour      - Update existing operations
Delete Labour      - Remove operations
Livestock Module   - Full livestock management access
```

## API Endpoints & Data Types

### Base URL
```
https://api.auravant.com/api
```

### Core API Endpoints

#### 1. Field & Farm Management
```
GET  /fields                            - List all fields
GET  /fields/{fieldId}                  - Get field details
POST /fields                            - Create new field
PUT  /fields/{fieldId}                  - Update field
GET  /farms                             - List farms
GET  /farms/{farmId}                    - Get farm details
```

#### 2. Labour Operations
```
GET  /activities/labour                 - List labour operations
POST /registro_campo/siembra            - Create sowing operation
POST /registro_campo/cosecha            - Create harvest operation
POST /registro_campo/aplicacion         - Create application operation
POST /registro_campo/otroslabores       - Create other labour operation
```

#### 3. Livestock Management (Unique Feature)
```
GET  /livestock/herd                    - List herds
POST /livestock/herd                    - Create new herd
GET  /livestock/paddock                 - List paddocks
POST /livestock/paddock                 - Create paddock
POST /livestock/transaction/exit        - Record livestock exit
POST /livestock/transaction/paddock     - Move herd between paddocks
```

#### 4. Work Orders & Planning
```
GET  /work_orders                       - List work orders
POST /work_orders                       - Create work order
GET  /work_orders/recomendations/types  - Get recommendation types
GET  /work_orders/{uuid}/download       - Download work order (PDF/Excel)
```

#### 5. Inputs & Supplies
```
GET  /registro_campo/insumos            - List inputs (fertilizers, pesticides)
POST /registro_campo/insumo             - Create custom input
PATCH /registro_campo/insumo            - Modify input
DELETE /registro_campo/insumo           - Delete input
```

#### 6. Crops & Varieties
```
GET  /getcultivos                       - List available crops
GET  /siembras                          - List sowings with filters
```

### Data Filtering & Pagination

**Common Filters:**
- `yeargroup`: Filter by production year/season
- `farm_id`: Filter by specific farm
- `field_id`: Filter by specific field
- `date_from` / `date_to`: Date range filtering
- `status`: Filter by operation status (planned, executed, cancelled)
- `page` / `page_size`: Pagination controls

**Pagination Example:**
```
GET /activities/labour?yeargroup=2024&page=1&page_size=50
```

### Data Formats

#### Spatial Data
- **Format**: WKT (Well-Known Text) for boundaries and shapes
- **Coordinate System**: Standard geographic coordinates
- **Example**: `POLYGON((-59.69 -34.19, -59.69 -34.20, ...))`

#### Labour Operations
- **Status Types**: 1=Planned, 2=Executed, 3=Cancelled
- **Date Format**: ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)
- **Surface Units**: Hectares (ha)
- **Input Units**: Various (l/ha, kg/ha, etc.)

#### Livestock Data
- **Weight Units**: Kilograms (Kg)
- **Categories**: Predefined livestock categories (Terneros, Novillos, Vacas, etc.)
- **Transactions**: Movements, sales, deaths, field changes

## API Response Examples

### Successful Labour List Response
```json
{
  "data": [
    {
      "uuid": "54d10e1d-170d-45e4-809e-886d44bfd7be",
      "labour_type_id": 1,
      "status": 1,
      "date": "2024-11-28",
      "field_id": 668079,
      "farm_id": 142544,
      "yeargroup": 2024,
      "surface": 0.38581732,
      "rotation": {
        "crop_name": "Cebada",
        "crop_id": 6,
        "uuid": "2285f70e-384f-4640-adaf-6f5a553c70a9"
      },
      "inputs": [
        {
          "input_name": "Atma C",
          "dose": 12.0,
          "unit": "l/ha",
          "input_uuid": "f18dc925-dd73-48a8-a11a-c8d1e334264f"
        }
      ]
    }
  ],
  "pagination": {
    "total_page": 2,
    "page": 0
  }
}
```

### Livestock Herd Response
```json
{
  "data": [
    {
      "herd_uuid": "805802f5-84c1-4ed0-a3e3-1a9afad18cfd",
      "herd_name": "test",
      "animal_count": 3,
      "weight": 1500.0,
      "weight_unit": "Kg",
      "type_id": 2,
      "paddock_id": 1,
      "field_id": 258388,
      "farm_id": 72560
    }
  ]
}
```

### Work Order Response
```json
{
  "data": [
    {
      "uuid": "6ecb29ba-004b-1d1e-95ea-0dbd40e43f58",
      "name": "Work order name",
      "yeargroup": 2022,
      "date": "2022-02-03T00:00:00+00:00",
      "notes": "Notes or comments",
      "labours": [
        {
          "uuid": "7a5ee236-8527-11ec-834d-7b82f1b6b166",
          "idLabourType": 2,
          "fieldName": "Field name",
          "farmName": "Farm name"
        }
      ],
      "recomendations": [
        {
          "type": {
            "id": 1,
            "name": "Temperature"
          },
          "value": "25 grades"
        }
      ]
    }
  ]
}
```

## Error Handling

### Common Response Codes
All Auravant APIs include a `code` property in the JSON response:

- `code: 0`: Success (HTTP 200)
- `code: -1`: General error
- `code: -2`: Token expired
- `code: -3`: Invalid token
- `code: -4`: Incorrect data formats
- `code: -5`: Missing or invalid data
- `code: -6`: Data integrity error
- `code: -7`: Data integrity error

### Error Response Example
```json
{
  "code": -5,
  "msg": "Field 'yeargroup' is required and missing"
}
```

### Labour-Specific Errors
- `1`: Without authorization
- `2`: Wrong crop
- `93-97`: Internal errors in input creation

## Unique Features & Capabilities

### 1. Livestock Management (Differentiator)

**Herd Management:**
- Animal counting and weight tracking
- Category management (calves, steers, cows, bulls)
- Health and breeding records

**Paddock Operations:**
- Spatial livestock management
- Grazing rotation planning
- Paddock-to-paddock movements

**Livestock Transactions:**
- Sales and purchases
- Deaths and health events
- Field changes and movements

### 2. Work Order System

**Planning Features:**
- Labour planning and scheduling
- Environmental recommendations
- Resource allocation

**Execution Tracking:**
- Progress monitoring
- Completion verification
- Performance analysis

**Recommendations:**
- Weather-based suggestions
- Equipment-specific guidelines
- Environmental condition alerts

### 3. Comprehensive Labour Types

**Applications (Type 1):**
- Herbicides, fungicides, insecticides
- Fertilizers and amendments
- Custom chemical applications

**Harvests (Type 2):**
- Yield tracking and quality metrics
- Humidity and moisture content
- Harvest area and efficiency

**Sowings (Type 3):**
- Seeding operations and varieties
- Planting density and spacing
- Target yield planning

**Other Labours (Type 4):**
- Custom operations (transplanting, thinning)
- Maintenance activities
- Specialized farming operations

### 4. Input Management

**Master Database:**
- Comprehensive input catalog
- Chemical composition data
- Application guidelines

**Custom Inputs:**
- User-defined products
- Personal input libraries
- Custom formulations

## Integration Architecture

### Recommended Implementation Flow

1. **Developer Account Setup**
   - Apply for developer status
   - Create Extension in Developer Space
   - Generate test tokens

2. **Authentication Implementation**
   - Implement Bearer token authentication
   - Handle token expiration gracefully
   - Store tokens securely

3. **Data Synchronization**
   - Implement incremental sync by yeargroup
   - Handle pagination properly
   - Respect rate limits

4. **Multi-Module Integration**
   - Start with field management
   - Add labour operations
   - Include livestock if applicable
   - Implement work orders for planning

### Data Synchronization Strategy
```javascript
// Example sync approach
async function syncAuravantData(yeargroup = 2024) {
  try {
    // Sync fields and farms
    const fields = await auravantAPI.getFields();
    
    // Sync labour operations
    const labours = await auravantAPI.getLabours({
      yeargroup,
      page_size: 100
    });
    
    // Sync livestock (if module enabled)
    const herds = await auravantAPI.getHerds();
    
    // Process and store data
    await processAndStore({ fields, labours, herds });
    
  } catch (error) {
    handleSyncError(error);
  }
}
```

## Platform Capabilities

### Field Management Services
- **Spatial Data**: Field boundaries, farm organization
- **Crop Management**: Rotations, varieties, seasons
- **Historical Data**: Multi-year operation history

### Labour Operations Services
- **Real-time Tracking**: Live operation monitoring
- **Planning Tools**: Work order creation and management
- **Input Management**: Comprehensive product database

### Livestock Services (Unique)
- **Herd Management**: Complete animal tracking
- **Paddock Operations**: Spatial grazing management
- **Transaction Recording**: Sales, movements, health events

### Planning & Analytics
- **Work Orders**: Comprehensive planning system
- **Recommendations**: Environmental and operational guidance
- **Reporting**: PDF and Excel export capabilities

## Known Limitations

### API Constraints
- **Token Management**: Test tokens expire with session
- **Module Dependencies**: Some features require specific module activation
- **Yeargroup Requirement**: Most operations require yeargroup specification
- **Single Operation**: Cannot batch multiple labour operations in single call

### Data Constraints
- **Spatial Format**: Only WKT format supported for boundaries
- **Date Handling**: Specific date format requirements
- **Input Associations**: Inputs must be created before use in operations
- **Livestock Categories**: Predefined categories cannot be modified

## Migration & Integration Notes

### From John Deere Operations Center
- **Authentication**: Much simpler Bearer token vs OAuth2
- **Data Structure**: Different field and operation concepts
- **Equipment Integration**: Different machinery identification
- **Spatial Data**: WKT format vs GeoJSON

### From Climate FieldView
- **Authentication**: Bearer token vs OAuth2 with refresh
- **Scope**: Broader agricultural focus including livestock
- **Planning**: Built-in work order system vs external planning
- **Regional Focus**: South American vs North American optimization

### Multi-Platform Integration
- **Data Normalization**: Standardize across John Deere, FieldView, Auravant
- **Authentication Management**: Handle different auth systems
- **Feature Mapping**: Map unique features (livestock, work orders)
- **Regional Considerations**: Different market focuses and regulations

## Testing & Development

### Development Environment
- **Extension Testing**: Use Developer Space for testing
- **Token Generation**: Generate test tokens as needed
- **Data Access**: Full access to user's authorized data in development

### Validation Steps
1. **Authentication**: Test Bearer token implementation
2. **Field Data**: Verify field and farm data retrieval
3. **Labour Operations**: Test all four labour types
4. **Livestock Module**: Test herd and paddock operations (if applicable)
5. **Work Orders**: Validate planning and recommendation features
6. **Error Handling**: Test various error scenarios

## Support & Resources

### Documentation Links
- **Developer Portal**: https://developers.auravant.com/
- **API Reference**: https://developers.auravant.com/en/docs/apis/reference/
- **Getting Started**: https://developers.auravant.com/en/docs/intro/getting_started/
- **Extensions Guide**: Available in developer portal

### Contact Information
- **Developer Support**: devhelp@auravant.com
- **General Support**: hi@auravant.com
- **Platform Website**: https://www.auravant.com/

### Community Resources
- **Developer Portal**: Comprehensive guides and examples
- **Extension Examples**: Sample implementations available
- **Best Practices**: Implementation recommendations
- **Certified Developers**: Partner program (coming soon)

---

**Note**: This documentation is based on publicly available information from Auravant's developer resources and API documentation. Always refer to the official API documentation for the most current specifications.

**Last Updated**: January 2025 