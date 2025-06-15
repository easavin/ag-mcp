# Phase 3: John Deere Integration & MCP Server Setup

## Overview

Phase 3 implements John Deere Operations Center integration and the foundation for the Model Context Protocol (MCP) server. This allows the AI assistant to access real farming data and operations.

## Features Implemented

### ✅ John Deere OAuth Integration
- Complete OAuth 2.0 flow with John Deere Operations Center
- Token management with automatic refresh
- Secure token storage in database
- Connection status monitoring

### ✅ John Deere API Client
- Full API client for John Deere Operations Center
- Support for organizations, fields, equipment, and work records
- Prescription file upload capability
- Error handling and retry logic

### ✅ MCP Server Foundation
- Model Context Protocol server implementation
- Tools for accessing John Deere data
- Structured data responses for LLM consumption
- Extensible architecture for additional tools

### ✅ UI Components
- Settings modal for John Deere connection management
- Connection status indicators
- OAuth flow handling

## Setup Instructions

### 1. John Deere Developer Account

1. **Register for John Deere Developer Account**
   - Visit [John Deere Developer Portal](https://developer.deere.com/)
   - Create an account and verify your email
   - Accept the developer terms and conditions

2. **Create an Application**
   - Go to "My Applications" in the developer portal
   - Click "Create Application"
   - Fill in application details:
     - **Name**: "Ag MCP Chat Interface"
     - **Description**: "AI-powered agricultural chat interface"
     - **Redirect URI**: `http://localhost:3000/api/auth/johndeere/callback`
   - Select scopes: `ag1`, `ag2`, `ag3`
   - Submit for approval (may take 1-2 business days)

3. **Get API Credentials**
   - Once approved, note your `Client ID` and `Client Secret`
   - These will be used in environment variables

### 2. Environment Configuration

Update your `.env` file with John Deere credentials:

```bash
# John Deere API Configuration
JOHN_DEERE_CLIENT_ID=your_actual_client_id_here
JOHN_DEERE_CLIENT_SECRET=your_actual_client_secret_here
JOHN_DEERE_ENVIRONMENT=sandbox  # or 'production'

# Required for OAuth callback
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Migration

The database schema is already set up from Phase 2, but ensure you have the latest migrations:

```bash
npx prisma db push
npx prisma generate
```

### 4. Testing the Integration

#### Test John Deere Connection
1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Click the Settings button in the sidebar
4. Click "Connect John Deere Account"
5. Complete the OAuth flow in the popup window
6. Verify connection status shows as "Connected"

#### Test MCP Server
```bash
# Start the MCP server
npx tsx scripts/mcp-server.ts user_placeholder

# The server will start and listen for MCP protocol messages
```

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/johndeere/authorize` - Initiate OAuth flow
- `GET/POST /api/auth/johndeere/callback` - Handle OAuth callback
- `POST /api/auth/johndeere/refresh` - Refresh access token
- `GET /api/auth/johndeere/status` - Check connection status
- `POST /api/auth/johndeere/disconnect` - Disconnect account

### Data Endpoints
- `GET /api/johndeere/organizations` - Get user's organizations
- `GET /api/johndeere/organizations/[orgId]/fields` - Get fields
- `GET /api/johndeere/organizations/[orgId]/equipment` - Get equipment

## MCP Tools Available

The MCP server provides these tools for LLM interaction:

1. **get_organizations** - List John Deere organizations
2. **get_fields** - Get fields for an organization
3. **get_field_details** - Get detailed field information
4. **get_equipment** - Get equipment/machines
5. **get_work_records** - Get work records with date filtering
6. **upload_prescription** - Upload prescription files to fields

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   John Deere     │    │   MCP Server    │
│                 │    │   Operations     │    │                 │
│ ┌─────────────┐ │    │   Center API     │    │ ┌─────────────┐ │
│ │ Chat UI     │ │    │                  │    │ │ Tool        │ │
│ │ Settings    │ │◄──►│ OAuth 2.0        │◄──►│ │ Handlers    │ │
│ │ Auth Store  │ │    │ REST API         │    │ │ Data Access │ │
│ └─────────────┘ │    │                  │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                              ┌─────────────────┐
│   Database      │                              │   LLM Client    │
│                 │                              │   (Claude/GPT)  │
│ ┌─────────────┐ │                              │                 │
│ │ Users       │ │                              │ Uses MCP tools  │
│ │ Tokens      │ │                              │ to access data  │
│ │ Sessions    │ │                              │                 │
│ │ Messages    │ │                              │                 │
│ └─────────────┘ │                              │                 │
└─────────────────┘                              └─────────────────┘
```

## Security Considerations

1. **Token Storage**: Access tokens are encrypted and stored securely in the database
2. **Token Refresh**: Automatic token refresh prevents expired token issues
3. **Scope Limitation**: Only request necessary scopes (ag1, ag2, ag3)
4. **State Validation**: OAuth state parameter prevents CSRF attacks
5. **Environment Variables**: Sensitive credentials stored in environment variables

## Troubleshooting

### Common Issues

1. **"John Deere API not configured"**
   - Ensure `JOHN_DEERE_CLIENT_ID` and `JOHN_DEERE_CLIENT_SECRET` are set
   - Verify credentials are correct

2. **OAuth callback fails**
   - Check redirect URI matches exactly in John Deere developer portal
   - Ensure `NEXTAUTH_URL` is set correctly

3. **Token refresh fails**
   - User needs to reconnect their account
   - Check if John Deere application is still approved

4. **MCP server connection issues**
   - Ensure user has valid John Deere tokens
   - Check database connection
   - Verify MCP SDK is properly installed

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=ag-mcp:*
```

## Next Steps

Phase 3 provides the foundation for:
- **Phase 4**: Full MCP implementation with advanced farming operations
- **Phase 5**: Enhanced UI with data visualizations and advanced features
- **Phase 6**: Production deployment and testing

The John Deere integration is now ready for development and testing with sandbox data. For production use, you'll need to:
1. Get production approval from John Deere
2. Update environment to use production endpoints
3. Implement additional security measures
4. Add comprehensive error handling and monitoring 