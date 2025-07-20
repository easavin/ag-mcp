# MCP Implementation Plan - Separate MCP Servers for Agricultural Platforms

## Overview

This document outlines the comprehensive plan to refactor AgMCP from a monolithic MCP tool executor to a distributed architecture with separate MCP servers for each agricultural platform integration.

## Current vs. Proposed Architecture

### Current Issues
- Monolithic MCP tool executor handling all platforms
- Single point of failure for all integrations
- Difficult to scale individual platforms independently
- Mixed authentication and error handling logic
- Complex maintenance and testing

### Proposed Benefits
- Platform-specific MCP servers with focused responsibilities
- Independent scaling and deployment
- Standardized JSON-RPC 2.0 communication
- Better security isolation
- Easier maintenance and testing
- Follows MCP best practices for solving the "M × N problem"

## Implementation Phases

### Phase 1: MCP Server Infrastructure Setup (Week 1-2)

#### 1.1 Directory Structure Creation
```
src/mcp-servers/
├── base/
│   ├── mcp-server-base.ts        # Common MCP server implementation
│   ├── types.ts                  # Shared MCP types
│   └── utils.ts                  # Shared utilities
├── john-deere/
│   ├── server.ts                 # John Deere MCP server
│   ├── tools.ts                  # JD-specific tools
│   ├── auth.ts                   # JD authentication
│   └── types.ts                  # JD-specific types
├── weather/
│   ├── server.ts                 # Weather MCP server
│   ├── tools.ts                  # Weather tools
│   └── types.ts                  # Weather types
├── usda/
│   ├── server.ts                 # USDA MCP server
│   ├── tools.ts                  # USDA tools
│   └── types.ts                  # USDA types
├── eu-commission/
│   ├── server.ts                 # EU Commission MCP server
│   ├── tools.ts                  # EU tools
│   └── types.ts                  # EU types
└── auravant/
    ├── server.ts                 # Auravant MCP server
    ├── tools.ts                  # Auravant tools
    ├── auth.ts                   # Auravant authentication
    └── types.ts                  # Auravant types
```

#### 1.2 Base MCP Server Implementation
**File:** `src/mcp-servers/base/mcp-server-base.ts`

Key features:
- Abstract base class for all MCP servers
- Common error handling and logging
- Standardized tool execution interface
- JSON-RPC 2.0 compliance

#### 1.3 Shared Types and Utilities
**File:** `src/mcp-servers/base/types.ts`

Define common interfaces:
- MCPToolResult
- MCPServerConfig
- AuthenticationProvider
- ErrorHandler

### Phase 2: Platform-Specific MCP Servers (Week 3-4)

#### 2.1 John Deere MCP Server
**File:** `src/mcp-servers/john-deere/server.ts`

**Tools to implement:**
- `get_organizations` - Get John Deere organizations
- `get_fields` - Get fields for organization
- `get_equipment` - Get equipment data
- `get_operations` - Get field operations
- `get_field_boundary` - Get field boundary data
- `list_john_deere_files` - List files in JD account
- `upload_file_to_john_deere` - Upload files to JD

**Authentication features:**
- OAuth2 flow management
- Automatic token refresh
- Rate limiting
- Connection error handling

#### 2.2 Weather MCP Server
**File:** `src/mcp-servers/weather/server.ts`

**Tools to implement:**
- `get_current_weather` - Current weather conditions
- `get_weather_forecast` - Multi-day forecasts
- `search_locations` - Location geocoding

**Features:**
- Open-Meteo API integration
- Agricultural weather data
- Spray condition analysis
- Soil temperature and moisture

#### 2.3 USDA MCP Server
**File:** `src/mcp-servers/usda/server.ts`

**Tools to implement:**
- `get_usda_market_prices` - North American market prices
- `get_usda_production_data` - Production statistics
- `get_usda_trade_data` - Trade data
- `get_usda_market_dashboard` - Market overview

#### 2.4 EU Commission MCP Server
**File:** `src/mcp-servers/eu-commission/server.ts`

**Tools to implement:**
- `get_eu_market_prices` - European market prices
- `get_eu_production_data` - Production statistics
- `get_eu_trade_data` - Trade data
- `get_eu_market_dashboard` - Market overview

#### 2.5 Auravant MCP Server
**File:** `src/mcp-servers/auravant/server.ts`

**Tools to implement:**
- `get_auravant_fields` - Field data
- `get_auravant_livestock` - Livestock management
- `get_auravant_work_orders` - Work orders
- `get_auravant_labour_ops` - Labour operations

**Authentication features:**
- Bearer token management
- Extension-based authentication
- Multi-language support

### Phase 3: MCP Client Integration (Week 5-6)

#### 3.1 MCP Client Manager
**File:** `src/lib/mcp-client-manager.ts`

**Features:**
- Manage connections to multiple MCP servers
- Route function calls to appropriate servers
- Handle server failures and reconnection
- Load balancing and failover

**Key methods:**
- `connectToServer(serverName, serverPath)`
- `callTool(serverName, toolName, parameters)`
- `getAvailableTools(serverName)`
- `disconnect(serverName)`
- `disconnectAll()`

#### 3.2 Chat Completion Handler Updates
**File:** `src/app/api/chat/completion/route.ts`

**Changes:**
- Replace monolithic `MCPToolExecutor` with `MCPClientManager`
- Implement function-to-server routing logic
- Add MCP server health monitoring
- Maintain backward compatibility

**Function routing map:**
```typescript
const serverMapping = {
  'getOrganizations': 'john-deere',
  'getFields': 'john-deere',
  'getEquipment': 'john-deere',
  'getCurrentWeather': 'weather',
  'getWeatherForecast': 'weather',
  'getUSDAMarketPrices': 'usda',
  'getEUMarketPrices': 'eu-commission',
  'getAuravantFields': 'auravant',
  // ... other mappings
}
```

### Phase 4: Server Deployment Configuration (Week 7)

#### 4.1 Docker Configuration
**File:** `Dockerfile.mcp-servers`

Multi-stage build for MCP servers:
- Node.js 18 Alpine base
- Production dependencies only
- Configurable entry points

#### 4.2 Docker Compose
**File:** `docker-compose.mcp.yml`

Services:
- `john-deere-mcp` (port 8001)
- `weather-mcp` (port 8002)
- `usda-mcp` (port 8003)
- `eu-commission-mcp` (port 8004)
- `auravant-mcp` (port 8005)
- `main-app` (port 3000)

#### 4.3 Environment Configuration
**New environment variables:**
```bash
# MCP Server URLs
MCP_JOHN_DEERE_URL=http://john-deere-mcp:8000
MCP_WEATHER_URL=http://weather-mcp:8000
MCP_USDA_URL=http://usda-mcp:8000
MCP_EU_COMMISSION_URL=http://eu-commission-mcp:8000
MCP_AURAVANT_URL=http://auravant-mcp:8000

# Server-specific configurations
JOHN_DEERE_MCP_PORT=8001
WEATHER_MCP_PORT=8002
USDA_MCP_PORT=8003
EU_COMMISSION_MCP_PORT=8004
AURAVANT_MCP_PORT=8005
```

## Dependencies and Prerequisites

### New Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "spawn": "^0.1.3",
  "ws": "^8.14.0"
}
```

### Development Dependencies
```json
{
  "@types/ws": "^8.5.0",
  "concurrently": "^8.2.0"
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "mcp:dev": "concurrently \"npm run mcp:john-deere\" \"npm run mcp:weather\" \"npm run mcp:usda\" \"npm run mcp:eu-commission\" \"npm run mcp:auravant\"",
    "mcp:john-deere": "tsx src/mcp-servers/john-deere/server.ts",
    "mcp:weather": "tsx src/mcp-servers/weather/server.ts",
    "mcp:usda": "tsx src/mcp-servers/usda/server.ts",
    "mcp:eu-commission": "tsx src/mcp-servers/eu-commission/server.ts",
    "mcp:auravant": "tsx src/mcp-servers/auravant/server.ts",
    "mcp:build": "tsc --project tsconfig.mcp.json",
    "mcp:test": "jest --config jest.mcp.config.js"
  }
}
```

## Code Migration Strategy

### Step 1: Extract Current Tool Logic
- Move existing tool implementations from `src/lib/mcp-tools.ts` to respective server files
- Maintain interface compatibility during transition
- Add deprecation warnings to old methods

### Step 2: Implement Base Server
- Create `BaseMCPServer` abstract class
- Implement common functionality (logging, error handling, etc.)
- Add configuration management

### Step 3: Platform Server Implementation
- Implement each platform server extending `BaseMCPServer`
- Port existing authentication logic
- Add platform-specific error handling

### Step 4: Client Integration
- Implement `MCPClientManager`
- Update chat completion handler
- Add health monitoring and failover

### Step 5: Testing and Validation
- Unit tests for each MCP server
- Integration tests for client-server communication
- End-to-end tests for chat functionality
- Performance benchmarking

## Success Metrics

### Performance Targets
- Response time: < 2 seconds for simple queries
- Throughput: > 100 concurrent requests
- Availability: 99.9% uptime per server
- Error rate: < 1% for tool executions

### Quality Metrics
- Test coverage: > 90% for MCP servers
- Documentation coverage: 100% for public APIs
- Security scan: Zero critical vulnerabilities
- Code quality: Sonar score > 8.0

## Risk Mitigation

### Technical Risks
1. **MCP Protocol Learning Curve**
   - Mitigation: Start with simple weather server, build expertise incrementally

2. **Network Latency Between Services**
   - Mitigation: Implement local development mode, optimize Docker networking

3. **Service Discovery Complexity**
   - Mitigation: Use static configuration initially, plan for service discovery later

### Business Risks
1. **Increased Infrastructure Costs**
   - Mitigation: Implement efficient resource sharing, monitor costs closely

2. **Deployment Complexity**
   - Mitigation: Comprehensive documentation, automated deployment scripts

3. **Backward Compatibility**
   - Mitigation: Maintain existing API surface, feature flags for gradual migration

## Next Steps

1. **Week 1**: Set up development environment and create base MCP server
2. **Week 2**: Implement weather MCP server (simplest, no auth)
3. **Week 3**: Implement John Deere MCP server (most complex auth)
4. **Week 4**: Implement remaining platform servers
5. **Week 5**: Create MCP client manager and integration
6. **Week 6**: Testing and optimization
7. **Week 7**: Deployment configuration and documentation
8. **Week 8**: Production deployment and monitoring

## References

- [Model Context Protocol Documentation](https://medium.com/@richardhightower/solving-the-ai-integration-puzzle-how-model-context-protocol-mcp-is-transforming-enterprise-8d134f291577)
- [MCP Best Practices Guide](https://medium.com/@richardhightower/how-the-model-context-protocol-is-revolutionizing-ai-integration-48926ce5d823)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- Current AgMCP Architecture Documentation 