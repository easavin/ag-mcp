# Climate FieldView API Reference

## Overview

Climate FieldView™ is a digital agriculture platform by Bayer (formerly Climate Corporation) that enables farmers to collect, store, and analyze field data. This document provides a comprehensive reference for integrating with the Climate FieldView APIs during development.

**Platform Scale:** 120+ million acres, 100,000+ farmers globally

## Developer Account Setup

### Prerequisites
1. **Developer Account Registration**: Register at [FieldView Developer Portal](https://dev.fieldview.com/)
2. **Partner Approval**: Contact Climate business team at `partner@climate.com`
3. **Credentials**: Receive Client ID, Client Secret, and API Key from Climate Corporation
4. **No Cost**: Developer accounts are free

### Technical Support
- **Email**: `fieldview.developer@bayer.com`
- **Business Inquiries**: `partner@climate.com`
- **Support Portal**: Available during implementation

## Authentication & Security

### OAuth2 Implementation
Climate FieldView uses OAuth 2.0 authorization framework with multiple security layers:

#### 1. Authorization Code Grant Flow

**Step 1: Authorization Request**
```
https://climate.com/static/app-login/index.html
?scope=${scope}
&response_type=code
&redirect_uri=${redirect_uri}
&client_id=${client_id}
```

**Parameters:**
- `scope`: Space-delimited, URL-encoded permissions (e.g., `fields%3Aread%20imagery%3Awrite`)
- `redirect_uri`: Fully qualified, URL-encoded callback URI
- `client_id`: OAuth2 client ID from Climate Corporation
- `response_type`: Must be `code`

**Step 2: Token Exchange**
```http
POST https://api.climate.com/api/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64_encode(clientId:clientSecret)}

grant_type=authorization_code&redirect_uri=${redirect_uri}&code=${code}
```

#### 2. Token Management

**Access Tokens:**
- **Lifespan**: 4 hours
- **Format**: Bearer token
- **Usage**: Required for all API calls

**Refresh Tokens:**
- **Lifespan**: 30 days
- **Single Use**: Each refresh generates new access/refresh token pair
- **Critical**: Must store in persistent storage

**Refresh Token Exchange:**
```http
POST https://api.climate.com/api/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64_encode(clientId:clientSecret)}

grant_type=refresh_token&refresh_token=${your_refresh_token}
```

#### 3. Required Headers

**All API Calls:**
```http
Authorization: Bearer {access_token}
X-Api-Key: {partner-name}-{api-key-suffix}
```

### Security Features
- **TLS 1.2 Encryption**: All communications use HTTPS
- **API Rate Limiting**: Controlled via API keys (429 responses)
- **DoS Protection**: Multiple security layers
- **Browser Restriction**: API calls must be made from backend services, not browsers

## Available Scopes & Permissions

### Core Data Access Scopes
```
asHarvested:read     - Access harvest data
asPlanted:read       - Access planting data  
asApplied:read       - Access application data
fields:read          - Access field information
resourceOwners:read  - Access resource owner data
farmOrganizations:read - Access farm organization data
```

### Extended Functionality Scopes
```
fields:write         - Create/update field data
imagery:write        - Upload imagery data
soil:write          - Upload soil data
rx:write            - Upload prescription data
openid              - OpenID Connect
platform            - Platform access
partnerapis         - Partner API access
```

**Note**: Extended scopes may require additional permissions from Climate FieldView.

## API Endpoints & Data Types

### Base URL
```
https://api.climate.com
```

### Core API Endpoints

#### 1. Authentication
```
POST /api/oauth/token                    - Token management
```

#### 2. Field Data Services
```
GET  /v4/layers/asPlanted               - Planting activities
GET  /v4/layers/asHarvested             - Harvest activities  
GET  /v4/layers/asApplied               - Application activities
GET  /v4/layers/{layerType}/{activityId}/contents - Activity data contents
```

#### 3. Field Management
```
GET  /v4/fields                         - List fields
GET  /v4/fields/{fieldId}               - Field details
POST /v4/fields                         - Create field
PUT  /v4/fields/{fieldId}               - Update field
```

#### 4. Upload Services
```
POST /v4/uploads                        - Upload files
GET  /v4/uploads/{uploadId}/status      - Upload status
```

### Data Filtering & Pagination

**Available Filters:**
- `occurredBefore`: Filter by occurrence date (before)
- `occurredAfter`: Filter by occurrence date (after)  
- `updatedAfter`: Filter by last update date
- `fieldIds`: Filter by specific field IDs

**Pagination:**
- `x-next-token`: Token for next page of results
- Response codes: 200 (data available), 206 (partial), 304 (no more data)

### Data Formats

#### Field Boundaries
- **Format**: GeoJSON, Shapefile (.SHP, .SHX, .DBF)
- **Coordinate System**: WGS84
- **Limitation**: One boundary set per field

#### Imagery Data
- **Supported**: Non-satellite imagery, GeoTIFF, JPEG2
- **Auto-import**: 70% boundary match threshold for automatic field assignment
- **Content Types**: Different content types allow multiple images per date/time

#### Prescription Data
- **Formats**: Variable rate prescriptions, seeding prescriptions
- **Upload**: Via web interface or API
- **Integration**: Compatible with 20/20 monitors (not OEM displays)

#### Soil Sample Data
- **Format**: Structured soil analysis results
- **Integration**: Links with field boundaries and operations data

## API Response Examples

### Successful Authentication Response
```json
{
  "access_token": "435a5f91-617a-427d-8609-3b43f5ad52d4",
  "refresh_token": "6f2c1e8a-9b3d-4e5f-8c2a-1d3e4f5g6h7i",
  "token_type": "Bearer",
  "expires_in": 14400,
  "scope": "fields:read asPlanted:read asHarvested:read"
}
```

### Field Data Response
```json
{
  "fieldId": "field-uuid-here",
  "fieldName": "North 40",
  "farmName": "Main Farm",
  "clientName": "Farmer John",
  "boundaries": { /* GeoJSON boundary data */ },
  "acres": 40.5,
  "crop": "corn",
  "year": 2024
}
```

### Activity Data Response
```json
{
  "activityId": "activity-uuid-here",
  "activityType": "asPlanted",
  "fieldIds": ["field-uuid-1", "field-uuid-2"],
  "startTime": "2024-04-15T08:00:00Z",
  "endTime": "2024-04-15T17:30:00Z",
  "equipment": "Planter-001",
  "totalAcres": 85.2,
  "dataLength": 125000
}
```

## Error Handling

### Common HTTP Status Codes
- `200 OK`: Successful request
- `206 Partial Content`: Partial data returned
- `304 Not Modified`: No new data available
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authorization
- `403 Forbidden`: Invalid API key or insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded

### Common OAuth2 Errors

#### Invalid Scope
```json
{
  "error": "invalid_scope",
  "error_description": "Invalid Scope!"
}
```

#### Invalid Grant
```json
{
  "error": "invalid_grant", 
  "error_description": "Provided Authorization Grant is invalid"
}
```

#### Callback URI Mismatch
```json
{
  "error": "invalid_grant",
  "error_description": "Callback url mismatch"
}
```

## Rate Limits & Best Practices

### Rate Limiting
- **Mechanism**: API key-based throttling
- **Response**: HTTP 429 when limits exceeded
- **Monitoring**: Track usage via API key metrics

### Best Practices

#### Token Management
1. **Persistent Storage**: Always store refresh tokens persistently
2. **Single Process**: Only one process should handle token refresh per user
3. **Proactive Refresh**: Exchange refresh tokens every 30 days minimum
4. **Error Handling**: Implement robust retry logic for token refresh

#### Data Fetching
1. **Pagination**: Always check for additional pages using `x-next-token`
2. **Incremental Updates**: Use `updatedAfter` filter for incremental sync
3. **Selective Fields**: Request only required data to minimize bandwidth
4. **Parallel Processing**: Process multiple fields concurrently when possible

#### Upload Optimization
1. **File Size**: Respect email attachment limits for file sharing
2. **Content Types**: Use different content types for multiple images per date
3. **Status Monitoring**: Check upload status via `/uploads/{uploadId}/status`
4. **Auto-import**: Understand 70% boundary match requirement

## Integration Architecture

### Recommended Flow
1. **User Authentication**: Implement OAuth2 authorization code flow
2. **Token Management**: Secure storage and automatic refresh
3. **Data Synchronization**: Periodic sync using incremental updates
4. **Error Recovery**: Robust error handling and retry mechanisms
5. **Rate Limit Compliance**: Implement backoff strategies

### Data Synchronization Strategy
```javascript
// Example incremental sync approach
const lastSyncTime = getLastSyncTime();
const newActivities = await fetchActivities({
  updatedAfter: lastSyncTime,
  limit: 100
});

// Process activities and update local storage
for (const activity of newActivities) {
  await processActivity(activity);
}

setLastSyncTime(new Date());
```

## Platform Capabilities

### Available Services

#### Field Data Services
- **Real-time Operations**: Access planting, harvest, and application data
- **Historical Data**: Multi-year field operation history
- **Field Management**: Boundaries, metadata, and organization

#### Agronomic Services  
- **Satellite Imagery**: Field health monitoring and crop analysis
- **Weather Data**: Historical and forecast weather information
- **Yield Analysis**: Detailed yield mapping and performance metrics

#### Prescription Services
- **Variable Rate**: Upload and manage variable rate prescriptions
- **Seeding Plans**: Detailed seeding recommendations
- **Application Maps**: Fertilizer and chemical application plans

### Data Availability
- **Real-time**: Operations data available during field activities
- **Processing Time**: Upload processing may take several minutes
- **Data Retention**: Multi-year historical data access
- **Sharing**: Data sharing between authorized users and partners

## Known Limitations

### API Restrictions
- **Browser Access**: Cannot make API calls directly from browsers
- **Shared User Data**: Cannot access data from shared operations (users must explicitly connect)
- **Prescription Sync**: Prescriptions only sync to 20/20 monitors, not OEM displays
- **Single Boundary**: Only one boundary set per field

### Data Constraints
- **Timestamp Errors**: Ignore activities with invalid timestamps (year 1970 or 5514)
- **Processing Delays**: Uploaded files may not appear immediately for end users
- **Image Naming**: Only satellite imagery can be named via API
- **Import Threshold**: 70% boundary match required for auto-import

## Migration & Integration Notes

### From John Deere Operations Center
- **Data Mapping**: Map JD concepts to FieldView equivalents
- **Authentication**: Different OAuth2 flows and scopes
- **Field Boundaries**: May need boundary format conversion
- **Equipment Integration**: Different equipment identification systems

### Third-Party Integrations
- **Leaf Agriculture**: Unified API approach available via Leaf
- **AgX Integration**: Hybrid/variety database integration
- **Shape File Support**: Standard GIS file format compatibility
- **Email Integration**: File import via email attachments

## Testing & Development

### Sandbox Environment
- **Demo Data**: Access to demo videos and test data
- **Development Account**: Free developer account for testing
- **Support**: Technical support during implementation

### Validation Steps
1. **Authentication Flow**: Test complete OAuth2 implementation
2. **Data Retrieval**: Verify all required scopes and endpoints
3. **Error Handling**: Test various error scenarios
4. **Rate Limiting**: Validate rate limit compliance
5. **Token Refresh**: Test automatic token refresh logic

## Support & Resources

### Documentation Links
- **Developer Portal**: https://dev.fieldview.com/
- **Technical Docs**: https://dev.fieldview.com/technical-documentation/
- **API Examples**: Available in developer portal
- **OAuth2 Details**: https://dev.fieldview.com/api-details

### Contact Information
- **Technical Support**: fieldview.developer@bayer.com
- **Business Development**: partner@climate.com
- **General Support**: Available via developer portal

### Community Resources
- **FAQ**: Comprehensive FAQ available in developer portal
- **Integration Examples**: Third-party integration examples available
- **Best Practices**: Implementation guides and recommendations

---

**Note**: This documentation is based on publicly available information from Climate FieldView's developer resources. Always refer to the official API documentation for the most current specifications and any updates to endpoints or authentication requirements.

**Last Updated**: January 2025 