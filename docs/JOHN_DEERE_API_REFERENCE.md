# John Deere API Reference Documentation

This document provides a comprehensive reference for all John Deere Precision Tech APIs, their endpoints, authentication requirements, and connection management.

## Table of Contents

1. [Connection Management](#connection-management)
2. [Organizations API](#organizations-api)
3. [Authentication & OAuth](#authentication--oauth)
4. [Required Customer Action (RCA) Events](#required-customer-action-rca-events)
5. [API Categories](#api-categories)
6. [Scope Requirements](#scope-requirements)
7. [Common Error Codes](#common-error-codes)

---

## Connection Management

### Overview
The Connection Management API allows clients connected to Operations Center organizations to view and manage those connections. This is critical for resolving 403 Forbidden errors.

**Base URL**: `https://sandboxapi.deere.com/platform`

### Key Endpoints

#### Get Connections
```
GET /connections
```
- **Description**: Retrieve all connections for a CSC based on the client in the token
- **Authentication**: Client Credentials OAuth
- **Parameters**: 
  - `createdAfter` (optional): ISO 8601 DateTime filter

#### Delete Connection
```
DELETE /connections/{connectionId}
DELETE /organizations/{orgId}/connections
```
- **Description**: Remove specific or all connections for an organization

### Connection Permissions Table

| Scope | User/Connection Permission | Code | Description |
|-------|---------------------------|------|-------------|
| org1 | Organization Management Access Level 1 | 1001 | View Staff, Operators, and Partners |
| org2 | Organization Management Access Level 1+2 | 1001, 1002 | View + Modify Staff, Operators, and Partners |
| eq1 | Equipment Access Level 1 + RDA + Setup & WDT | 2001, 2004, 2005 | View Equipment + Remote Display Access + Setup |
| eq2 | Equipment Access Level 1+2+3 + RDA + Setup & WDT | 2001, 2002, 2003, 2004, 2005 | Full Equipment Management |
| ag1 | Locations Access Level 1 + Share All Fields | 4001, 5001 | View Locations |
| ag2 | Locations Access Level 1+2 + Share All Fields | 4001, 4002, 5001 | View + Analyze Production Data |
| ag3 | Locations Access Level 1+2+3 + Share All Fields | 4001, 4002, 4003, 5001 | Full Locations & Production Data Management |
| files | Files API Access + Equipment Level 3 + Setup & WDT | N/A, 2003, 2005 | Files API Access |
| finance1 | Financial Access Level 1 | 6001 | View Financials |
| finance2 | Financial Access Level 1+2 | 6001, 6002 | View + Manage Financials |
| work1 | Work and Crop Plans Access Level 1 | 3001 | View Work and Crop Plans |
| work2 | Work and Crop Plans Access Level 1+2 | 3001, 3002 | Full Work and Crop Plans Access |

---

## Organizations API

### Base URL
`https://sandboxapi.deere.com/platform`

### Key Endpoints

#### List Organizations
```
GET /organizations
```
- **Scope Required**: None (basic access)
- **Description**: Returns list of organizations user has access to
- **Important**: Check for 'connections' vs 'manage_connections' links

#### Get Organization Details
```
GET /organizations/{orgId}
```
- **Scope Required**: None (basic access)
- **Description**: Get specific organization information

#### Get User Organizations
```
GET /users/{userName}/organizations
```
- **Scope Required**: None (basic access)
- **Description**: Get organizations for a specific user

### Connection States

#### Organization Not Connected
```json
{
  "links": [
    {
      "rel": "connections",
      "uri": "https://connections.deere.com/connections/{clientId}/select-organizations"
    }
  ]
}
```

#### Organization Connected
```json
{
  "links": [
    {
      "rel": "manage_connections", 
      "uri": "https://connections.deere.com/connections/{clientId}/connections-dialog?orgId={orgId}"
    }
  ]
}
```

---

## Authentication & OAuth

### OAuth 2.0 Endpoints

#### Well-Known Configuration
```
GET https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/.well-known/oauth-authorization-server
```

#### Authorization Endpoint
```
GET https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize
```

#### Token Endpoint
```
POST https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token
```

### Supported Scopes
- `ag1`, `ag2`, `ag3` - Agricultural/Location data
- `eq1`, `eq2` - Equipment data  
- `files` - File operations
- `finance1`, `finance2` - Financial data
- `org1`, `org2` - Organization management
- `work1`, `work2` - Work plans
- `offline_access` - Refresh tokens
- `openid`, `profile`, `email` - User identity

### Token Refresh
```
POST https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
refresh_token={refresh_token}
client_id={client_id}
client_secret={client_secret}
```

---

## Required Customer Action (RCA) Events

### What are RCA Events?
RCA events occur when users must take action before API access is allowed (e.g., accept new terms).

### Identifying RCA Events
- **HTTP Status**: 403 Forbidden
- **Headers**:
  - `X-Deere-Warning`: "Requested Org is in a restricted state"
  - `X-Deere-Terms-Location`: URL for user action

### Sample RCA Response
```json
{
  "@type": "Errors",
  "errors": [
    {
      "@type": "Error", 
      "guid": "19f7b283-d383-4990-9e14-1b3ee0f7b63d",
      "message": "Requested Org is in a restricted state."
    }
  ]
}
```

### Handling RCA Events
1. Check for `X-Deere-Terms-Location` header in 403 responses
2. Redirect user to the provided URL
3. Notify user that action is required
4. Retry API call after user completes action

---

## API Categories

### Setup/Plan APIs
- **Operations Center - Boundaries**: `ag3` scope
- **Operations Center - Clients**: `ag1` scope  
- **Operations Center - Crop Types**: `ag1` scope
- **Operations Center - Farms**: `ag1` scope
- **Operations Center - Fields**: `ag1` scope
- **Operations Center - Flags**: `ag3` scope
- **Operations Center - Guidance Lines**: `ag3` scope
- **Operations Center - Operators**: `org1` scope
- **Operations Center - Products**: `ag3` scope
- **Operations Center - Work Plans**: `work1`/`work2` scope

### Equipment APIs
- **Operations Center - Equipment**: `eq1`/`eq2` scope
- **Operations Center - Equipment Measurements**: `eq2` scope
- **Operations Center - Machine Alerts**: `eq1` scope
- **Operations Center - Machine Engine Hours**: `eq1` scope
- **Operations Center - Machine Hours Of Operation**: `eq1` scope
- **Operations Center - Machine Locations**: `eq1` scope

### Work Results APIs
- **Operations Center - Field Operations**: `ag2`/`ag3` scope
- **Operations Center - Files**: `files` + `ag3` scope
- **Operations Center - Harvest ID Cotton**: `ag2` scope

### Insights & Monitoring APIs
- **Operations Center - Assets**: `ag3` scope
- **Operations Center - Map Layers**: `ag3` scope
- **Operations Center - Notifications**: `ag1` scope

### Application APIs
- **Operations Center - Webhook**: `ag1` scope
- **Operation Center - Connection Management**: Client credentials

### Organization/User APIs
- **Operations Center - Organizations**: Basic access
- **Operations Center - Partnerships**: `org1` scope
- **Operations Center - Users**: Basic access

---

## Scope Requirements

### Field Operations Access
To access field operations (prescriptions, applications):
- **Minimum**: `ag2` scope (Analyze Production Data)
- **Recommended**: `ag3` scope (Manage Locations & Production Data)
- **Required Permissions**: 
  - Locations Access Level 2 (4002) or higher
  - Share All Fields (5001)

### Equipment Data Access
To access equipment information:
- **Minimum**: `eq1` scope (View Equipment)
- **For Measurements**: `eq2` scope (Edit Equipment + View Detailed Measurements)

### Organization Management
To manage connections and users:
- **Basic**: `org1` scope (View Staff, Operators, Partners)
- **Advanced**: `org2` scope (Modify Staff, Operators, Partners)

---

## Common Error Codes

### 403 Forbidden - Connection Issues

#### Cause 1: No Organization Connection
```json
{
  "message": "Access Denied",
  "details": "No connection established between application and organization"
}
```
**Solution**: Redirect user to connections URL from `/organizations` response

#### Cause 2: Insufficient Permissions
```json
{
  "message": "The client does not have proper access for this API",
  "required_scopes": ["ag3"],
  "current_scopes": ["ag1", "ag2"]
}
```
**Solution**: Request higher scope permissions or update connection permissions

#### Cause 3: RCA Event
```json
{
  "message": "Requested Org is in a restricted state"
}
```
**Solution**: Check `X-Deere-Terms-Location` header and redirect user

### 401 Unauthorized
- **Cause**: Expired or invalid access token
- **Solution**: Refresh token or re-authenticate

### 400 Bad Request
- **Cause**: Invalid request body or expired refresh token
- **Solution**: Validate request format and token validity

---

## Field Operations API Specifics

### Endpoint
```
GET /organizations/{orgId}/fieldOperations
```

### Required Scopes
- `ag2` (minimum) - for read access
- `ag3` (recommended) - for full management

### Query Parameters
- `startDate`: ISO 8601 DateTime
- `endDate`: ISO 8601 DateTime  
- `fieldId`: Specific field filter

### Common 403 Issues
1. **Missing ag2/ag3 scope**: User needs "Analyze Production Data" permission
2. **No field access**: User lacks "Share All Fields" permission (5001)
3. **Organization not connected**: Application not connected to user's organization
4. **RCA event**: User must accept terms before accessing data

### Troubleshooting Steps
1. Check `/organizations` response for connection links
2. Verify token scopes include `ag2` or `ag3`
3. Confirm user has field access permissions in Operations Center
4. Check for RCA headers in 403 responses
5. Ensure organization ID is correct (use auto-fetch from `/organizations`)

---

## Best Practices

### Connection Management
1. Always check organization connection status before API calls
2. Handle RCA events gracefully with user redirects
3. Implement retry logic for temporary connection issues
4. Cache organization IDs but refresh periodically

### Authentication
1. Implement proper token refresh logic (12-hour expiry)
2. Request only necessary scopes for your application
3. Handle scope upgrade requests gracefully
4. Store refresh tokens securely (365-day expiry if unused)

### Error Handling
1. Parse 403 responses for specific error types
2. Implement exponential backoff for 429/503 errors
3. Log connection and permission issues for debugging
4. Provide clear user feedback for permission issues

### API Usage
1. Use pagination for large datasets
2. Implement eTags for efficient polling
3. Follow HATEOS links for resource discovery
4. Respect rate limits and retry-after headers 