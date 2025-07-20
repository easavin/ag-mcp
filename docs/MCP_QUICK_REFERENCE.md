# MCP Quick Reference Guide

## Overview

This quick reference guide provides essential commands, configurations, and troubleshooting steps for the AgMCP Model Context Protocol implementation.

## 🚀 Development Commands

### Setup and Installation
```bash
# Install MCP dependencies
npm install @modelcontextprotocol/sdk

# Create MCP server directories
npm run mcp:setup-dev

# Start all MCP servers in development
npm run mcp:dev

# Build MCP servers for production
npm run mcp:build
```

### Individual Server Commands
```bash
# Start specific MCP servers
npm run mcp:john-deere
npm run mcp:weather
npm run mcp:usda
npm run mcp:eu-commission
npm run mcp:auravant

# Test specific servers
npm run test:mcp:john-deere
npm run test:mcp:weather
npm run test:mcp:integration
```

### Docker Commands
```bash
# Start all services
docker-compose -f docker-compose.mcp.yml up -d

# Start specific service
docker-compose -f docker-compose.mcp.yml up john-deere-mcp

# View logs
docker-compose -f docker-compose.mcp.yml logs -f john-deere-mcp

# Stop all services
docker-compose -f docker-compose.mcp.yml down
```

## 🔧 Configuration Reference

### Environment Variables
```bash
# MCP Architecture Control
ENABLE_MCP_ARCHITECTURE=true
MCP_TRAFFIC_PERCENTAGE=50

# Individual Server Control
ENABLE_MCP_JOHN_DEERE=true
ENABLE_MCP_WEATHER=true
ENABLE_MCP_USDA=true
ENABLE_MCP_EU_COMMISSION=true
ENABLE_MCP_AURAVANT=true

# Server URLs (Production)
MCP_JOHN_DEERE_URL=http://john-deere-mcp:8000
MCP_WEATHER_URL=http://weather-mcp:8000
MCP_USDA_URL=http://usda-mcp:8000
MCP_EU_COMMISSION_URL=http://eu-commission-mcp:8000
MCP_AURAVANT_URL=http://auravant-mcp:8000

# Server Ports
JOHN_DEERE_MCP_PORT=8001
WEATHER_MCP_PORT=8002
USDA_MCP_PORT=8003
EU_COMMISSION_MCP_PORT=8004
AURAVANT_MCP_PORT=8005
```

### Feature Flags
```typescript
// Enable/disable specific features
const featureFlags = {
  mcpArchitecture: true,           // Master switch for MCP
  mcpJohnDeereServer: true,        // John Deere MCP server
  mcpWeatherServer: true,          // Weather MCP server
  mcpUSDAServer: true,             // USDA MCP server
  mcpEUCommissionServer: true,     // EU Commission MCP server
  mcpAuravantServer: true,         // Auravant MCP server
}
```

## 📡 MCP Server Endpoints

### Health Check Endpoints
```bash
# Check individual server health
curl http://localhost:8001/health  # John Deere
curl http://localhost:8002/health  # Weather
curl http://localhost:8003/health  # USDA
curl http://localhost:8004/health  # EU Commission
curl http://localhost:8005/health  # Auravant
```

### Tool Discovery
```bash
# List available tools for each server
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Tool Execution
```bash
# Execute weather tool
curl -X POST http://localhost:8002/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_current_weather",
      "arguments": {
        "latitude": 41.628,
        "longitude": -3.587
      }
    },
    "id": 1
  }'
```

## 🔍 Tool Reference

### John Deere MCP Server (Port 8001)
```bash
# Available tools
get_organizations         # Get user organizations
get_fields               # Get fields for organization
get_equipment            # Get equipment data
get_operations           # Get field operations
get_field_boundary       # Get field boundary coordinates
list_john_deere_files    # List files in JD account
upload_file_to_john_deere # Upload prescription files

# Example usage
{
  "name": "get_field_boundary",
  "arguments": {
    "fieldName": "North Field"
  }
}
```

### Weather MCP Server (Port 8002)
```bash
# Available tools
get_current_weather      # Current weather conditions
get_weather_forecast     # Multi-day forecasts
search_locations         # Location geocoding

# Example usage
{
  "name": "get_weather_forecast",
  "arguments": {
    "latitude": 41.628,
    "longitude": -3.587,
    "days": 7
  }
}
```

### USDA MCP Server (Port 8003)
```bash
# Available tools
get_usda_market_prices   # Market pricing data
get_usda_production_data # Production statistics
get_usda_trade_data      # Import/export data
get_usda_market_dashboard # Market overview

# Example usage
{
  "name": "get_usda_market_prices",
  "arguments": {
    "category": "grain",
    "region": "Midwest"
  }
}
```

### EU Commission MCP Server (Port 8004)
```bash
# Available tools
get_eu_market_prices     # European market pricing
get_eu_production_data   # Production statistics
get_eu_trade_data        # EU trade data
get_eu_market_dashboard  # Market dashboard

# Example usage
{
  "name": "get_eu_market_prices",
  "arguments": {
    "sector": "cereals",
    "memberState": "DE"
  }
}
```

### Auravant MCP Server (Port 8005)
```bash
# Available tools
get_auravant_fields      # Field management data
get_auravant_livestock   # Livestock operations
get_auravant_work_orders # Work order management
get_auravant_labour_ops  # Labour operation tracking

# Example usage
{
  "name": "get_auravant_livestock",
  "arguments": {
    "farmId": "farm_123"
  }
}
```

## 🧪 Testing Commands

### Unit Tests
```bash
# Run all MCP unit tests
npm run test:mcp:unit

# Run specific server tests
npm run test:mcp:john-deere:unit
npm run test:mcp:weather:unit

# Run with coverage
npm run test:mcp:coverage
```

### Integration Tests
```bash
# Full integration test suite
npm run test:mcp:integration

# Cross-platform workflow tests
npm run test:mcp:workflows

# API compatibility tests
npm run test:mcp:compatibility
```

### Performance Tests
```bash
# Load testing
npm run test:mcp:load

# Performance benchmarks
npm run test:mcp:performance

# Memory usage tests
npm run test:mcp:memory
```

### Regression Tests
```bash
# Full regression suite
npm run test:mcp:regression

# API backward compatibility
npm run test:mcp:api-compatibility

# Functionality regression
npm run test:mcp:functionality
```

## 🚨 Troubleshooting

### Common Issues

#### Server Connection Failures
```bash
# Check server status
docker-compose ps

# View server logs
docker-compose logs john-deere-mcp

# Restart specific server
docker-compose restart john-deere-mcp

# Check network connectivity
docker network ls
docker network inspect agmcp_default
```

#### Tool Execution Errors
```bash
# Enable debug logging
export DEBUG=mcp:*

# Check tool availability
curl http://localhost:8001/mcp -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Validate JSON-RPC format
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_organizations","arguments":{}},"id":1}' | jq
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check memory usage
npm run monitor:memory

# Analyze response times
npm run monitor:performance
```

### Authentication Issues

#### John Deere OAuth Problems
```bash
# Check token validity
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://sandboxapi.deere.com/platform/organizations

# Refresh tokens
npm run auth:johndeere:refresh

# Reset authentication
npm run auth:johndeere:reset
```

#### Auravant Bearer Token Issues
```bash
# Test token validity
curl -H "Authorization: Bearer $AURAVANT_TOKEN" \
  https://api.auravant.com/api/profiles

# Check extension status
curl -X GET /api/auth/auravant/extension
```

### Development Issues

#### Port Conflicts
```bash
# Check port usage
lsof -i :8001
lsof -i :8002

# Kill processes on ports
kill -9 $(lsof -ti:8001)

# Use alternative ports
export JOHN_DEERE_MCP_PORT=9001
```

#### Module Import Errors
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build

# Check import paths
npm run lint:imports
```

## 📊 Monitoring Commands

### Health Monitoring
```bash
# Check all server health
./scripts/check-mcp-health.sh

# Monitor continuously
watch -n 5 './scripts/check-mcp-health.sh'

# Export health metrics
curl http://localhost:3000/api/mcp/health/export
```

### Performance Monitoring
```bash
# Real-time performance metrics
npm run monitor:mcp:performance

# Memory usage tracking
npm run monitor:mcp:memory

# Response time analysis
npm run monitor:mcp:response-times
```

### Log Analysis
```bash
# Aggregate logs from all servers
docker-compose logs -f | grep -E "(ERROR|WARN)"

# Filter by server
docker-compose logs john-deere-mcp | grep -v "DEBUG"

# Export logs for analysis
docker-compose logs --no-color > mcp-logs.txt
```

## 🔄 Migration Commands

### Feature Flag Migration
```bash
# Enable MCP for 10% of traffic
export MCP_TRAFFIC_PERCENTAGE=10
docker-compose restart main-app

# Gradually increase traffic
export MCP_TRAFFIC_PERCENTAGE=50
docker-compose restart main-app

# Full migration
export MCP_TRAFFIC_PERCENTAGE=100
export ENABLE_MCP_ARCHITECTURE=true
docker-compose restart main-app
```

### Rollback Commands
```bash
# Emergency rollback
./scripts/emergency-rollback.sh

# Gradual rollback
export MCP_TRAFFIC_PERCENTAGE=0
docker-compose restart main-app

# Complete rollback to legacy
export ENABLE_MCP_ARCHITECTURE=false
docker-compose restart main-app
```

### Data Migration
```bash
# Backup current state
npm run backup:database
npm run backup:configuration

# Migrate data to new format
npm run migrate:mcp-data

# Verify migration
npm run verify:migration
```

## 📚 Documentation Links

- **[MCP Implementation Plan](./MCP_IMPLEMENTATION_PLAN.md)** - Complete implementation roadmap
- **[MCP Testing Strategy](./MCP_TESTING_STRATEGY.md)** - Comprehensive testing guide
- **[MCP Migration Guide](./MCP_MIGRATION_GUIDE.md)** - Migration procedures and rollback plans
- **[MCP Architecture Overview](./MCP_ARCHITECTURE_OVERVIEW.md)** - System architecture documentation

## 🆘 Emergency Contacts

### Development Team
- **Architecture Issues**: Review MCP Architecture Overview
- **Implementation Problems**: Check MCP Implementation Plan
- **Testing Failures**: Follow MCP Testing Strategy
- **Migration Issues**: Use MCP Migration Guide

### Quick Fixes
```bash
# Reset to known good state
git checkout main
npm run clean:install
npm run mcp:setup-dev
npm run test:mcp:basic

# Verify system health
npm run health:check:all
npm run performance:baseline
```

This quick reference guide provides the essential commands and information needed for day-to-day work with the MCP implementation. 