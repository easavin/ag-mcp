#!/usr/bin/env node

// Satshot Integration Test Script
// Tests the complete Satshot MCP integration with real API calls

const { SatshotMCPServer } = require('./src/mcp-servers/satshot/server');
const { MCPToolExecutor } = require('./src/lib/mcp-tools');

// Test configuration
const TEST_CONFIG = {
  // Sample field coordinates (Iowa corn field)
  testField: {
    id: 'test_field_001',
    latitude: 42.0308,
    longitude: -93.6319,
    name: 'Iowa Test Field'
  },
  
  // Sample polygon for field boundaries (simple square in Iowa)
  testPolygon: [
    [-93.6319, 42.0308],  // SW corner
    [-93.6300, 42.0308],  // SE corner
    [-93.6300, 42.0320],  // NE corner
    [-93.6319, 42.0320],  // NW corner
    [-93.6319, 42.0308]   // Close the polygon
  ],
  
  // Date range for imagery analysis
  dateRange: {
    start: '2024-06-01',
    end: '2024-08-31'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, colors.bright + colors.yellow);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function testConnectionAndAuth() {
  logStep(1, 'Testing Satshot Connection & Authentication');
  
  try {
    const executor = new MCPToolExecutor();
    
    // Test basic connection
    logInfo('Testing basic server connection...');
    const connectionResult = await executor.executeTool('test_satshot_connection', {
      includeAuth: false
    });
    
    if (connectionResult.success) {
      logSuccess('Server connection successful');
      console.log('Connection details:', JSON.stringify(connectionResult.data, null, 2));
    } else {
      logError(`Connection failed: ${connectionResult.message}`);
      return false;
    }
    
    // Test authentication
    logInfo('Testing authentication...');
    const authResult = await executor.executeTool('test_satshot_connection', {
      includeAuth: true
    });
    
    if (authResult.success) {
      logSuccess('Authentication successful');
      console.log('Auth details:', JSON.stringify(authResult.data, null, 2));
      return true;
    } else {
      logError(`Authentication failed: ${authResult.message}`);
      return false;
    }
    
  } catch (error) {
    logError(`Connection test failed: ${error.message}`);
    return false;
  }
}

async function testGetMaps() {
  logStep(2, 'Testing Map Retrieval');
  
  try {
    const executor = new MCPToolExecutor();
    
    logInfo('Fetching available maps...');
    const result = await executor.executeTool('get_satshot_maps', {
      limit: 5,
      mapType: 'all'
    });
    
    if (result.success) {
      logSuccess(`Retrieved ${result.data?.count || 0} maps`);
      if (result.data?.maps) {
        console.log('Available maps:', JSON.stringify(result.data.maps.slice(0, 3), null, 2));
      }
      return result.data;
    } else {
      logError(`Failed to get maps: ${result.message}`);
      return null;
    }
    
  } catch (error) {
    logError(`Map retrieval failed: ${error.message}`);
    return null;
  }
}

async function testGetFields() {
  logStep(3, 'Testing Field Boundaries Retrieval');
  
  try {
    const executor = new MCPToolExecutor();
    
    logInfo('Fetching field boundaries...');
    const result = await executor.executeTool('get_satshot_fields', {
      region: 'Iowa',
      minArea: 10, // 10+ acres
      includeGeometry: true
    });
    
    if (result.success) {
      logSuccess(`Retrieved ${result.data?.count || 0} fields`);
      if (result.data?.fields) {
        console.log('Sample fields:', JSON.stringify(result.data.fields.slice(0, 2), null, 2));
      }
      return result.data;
    } else {
      logError(`Failed to get fields: ${result.message}`);
      return null;
    }
    
  } catch (error) {
    logError(`Field retrieval failed: ${error.message}`);
    return null;
  }
}

async function testSatelliteScenes() {
  logStep(4, 'Testing Satellite Scene Availability');
  
  try {
    const executor = new MCPToolExecutor();
    
    logInfo(`Checking scenes for coordinates: ${TEST_CONFIG.testField.latitude}, ${TEST_CONFIG.testField.longitude}`);
    const result = await executor.executeTool('get_available_scenes', {
      latitude: TEST_CONFIG.testField.latitude,
      longitude: TEST_CONFIG.testField.longitude,
      dateRange: TEST_CONFIG.dateRange,
      maxCloudCover: 20
    });
    
    if (result.success) {
      logSuccess(`Found ${result.data?.count || 0} available scenes`);
      if (result.data?.scenes) {
        console.log('Recent scenes:', JSON.stringify(result.data.scenes.slice(0, 3), null, 2));
      }
      return result.data;
    } else {
      logError(`Failed to get scenes: ${result.message}`);
      return null;
    }
    
  } catch (error) {
    logError(`Scene retrieval failed: ${error.message}`);
    return null;
  }
}

async function testFieldAnalysis(fieldData) {
  logStep(5, 'Testing Field Imagery Analysis');
  
  try {
    const executor = new MCPToolExecutor();
    
    // Use a field from previous results or test field
    let fieldId = TEST_CONFIG.testField.id;
    if (fieldData?.fields && fieldData.fields.length > 0) {
      fieldId = fieldData.fields[0].id || fieldId;
    }
    
    logInfo(`Analyzing NDVI for field: ${fieldId}`);
    const result = await executor.executeTool('analyze_field_imagery', {
      fieldId: fieldId,
      analysisType: 'ndvi',
      dateRange: TEST_CONFIG.dateRange,
      resolution: 10
    });
    
    if (result.success) {
      logSuccess('Field analysis completed');
      console.log('Analysis results:', JSON.stringify(result.data, null, 2));
      return result.data;
    } else {
      logError(`Field analysis failed: ${result.message}`);
      return null;
    }
    
  } catch (error) {
    logError(`Field analysis failed: ${error.message}`);
    return null;
  }
}

async function testDataExport(fieldData) {
  logStep(6, 'Testing Data Export');
  
  try {
    const executor = new MCPToolExecutor();
    
    // Get some field IDs for export
    let itemIds = [TEST_CONFIG.testField.id];
    if (fieldData?.fields && fieldData.fields.length > 0) {
      itemIds = fieldData.fields.slice(0, 2).map(field => field.id || field.name || `field_${Date.now()}`);
    }
    
    logInfo(`Exporting field boundaries for ${itemIds.length} field(s)...`);
    const result = await executor.executeTool('export_satshot_data', {
      dataType: 'field_boundaries',
      format: 'geojson',
      itemIds: itemIds,
      includeMetadata: true
    });
    
    if (result.success) {
      logSuccess('Data export completed');
      console.log('Export details:', JSON.stringify(result.data, null, 2));
      return result.data;
    } else {
      logError(`Data export failed: ${result.message}`);
      return null;
    }
    
  } catch (error) {
    logError(`Data export failed: ${error.message}`);
    return null;
  }
}

async function testMCPServerDirectly() {
  logStep(7, 'Testing MCP Server Directly');
  
  try {
    logInfo('Creating Satshot MCP Server instance...');
    const server = new SatshotMCPServer();
    
    // Setup the server
    await server.setupToolHandlers();
    
    logInfo('Testing server health check...');
    const health = await server.getHealthCheck();
    console.log('Health check:', JSON.stringify(health, null, 2));
    
    logInfo('Getting server info...');
    const serverInfo = server.getServerInfo();
    console.log('Server info:', JSON.stringify(serverInfo, null, 2));
    
    logInfo('Testing direct tool execution...');
    const testResult = await server.testTool('test_satshot_connection', { includeAuth: false });
    console.log('Direct tool test:', JSON.stringify(testResult, null, 2));
    
    // Cleanup
    await server.cleanup();
    
    logSuccess('MCP Server tests completed');
    return true;
    
  } catch (error) {
    logError(`MCP Server test failed: ${error.message}`);
    return false;
  }
}

function generateTestScenarios() {
  logStep(8, 'Generating Agricultural Test Scenarios');
  
  const scenarios = [
    {
      name: "Corn Field Health Monitoring",
      description: "Monitor a 40-acre corn field for crop stress using NDVI analysis",
      coordinates: { lat: 42.0308, lng: -93.6319 },
      cropType: "corn",
      area: 40,
      analysisType: "ndvi"
    },
    {
      name: "Soybean Yield Prediction",
      description: "Predict yield for soybean fields using satellite imagery",
      coordinates: { lat: 41.5868, lng: -93.6250 },
      cropType: "soybean", 
      area: 65,
      analysisType: "yield_prediction"
    },
    {
      name: "Field Boundary Verification",
      description: "Verify and export accurate field boundaries for precision agriculture",
      coordinates: { lat: 42.0350, lng: -93.6400 },
      exportFormat: "shapefile",
      includeMetadata: true
    },
    {
      name: "Multi-temporal Change Detection",
      description: "Detect changes in field conditions over the growing season",
      coordinates: { lat: 42.0280, lng: -93.6280 },
      analysisType: "change_detection",
      timeRange: "growing_season"
    }
  ];
  
  logSuccess('Generated 4 agricultural test scenarios:');
  scenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   Location: ${scenario.coordinates.lat}, ${scenario.coordinates.lng}`);
    if (scenario.cropType) console.log(`   Crop: ${scenario.cropType}`);
    if (scenario.area) console.log(`   Area: ${scenario.area} acres`);
  });
  
  return scenarios;
}

async function runIntegrationTests() {
  logHeader('🛰️  SATSHOT INTEGRATION TEST SUITE');
  
  console.log('Testing Satshot GIS integration with the following configuration:');
  console.log('- Test Field:', TEST_CONFIG.testField.name);
  console.log('- Coordinates:', `${TEST_CONFIG.testField.latitude}, ${TEST_CONFIG.testField.longitude}`);
  console.log('- Date Range:', `${TEST_CONFIG.dateRange.start} to ${TEST_CONFIG.dateRange.end}`);
  
  const results = {
    connection: false,
    maps: null,
    fields: null,
    scenes: null,
    analysis: null,
    export: null,
    serverDirect: false
  };
  
  try {
    // Test 1: Connection & Authentication
    results.connection = await testConnectionAndAuth();
    if (!results.connection) {
      logError('Connection failed - aborting remaining tests');
      return results;
    }
    
    // Test 2: Maps
    results.maps = await testGetMaps();
    
    // Test 3: Fields
    results.fields = await testGetFields();
    
    // Test 4: Satellite Scenes
    results.scenes = await testSatelliteScenes();
    
    // Test 5: Field Analysis (if we have field data)
    results.analysis = await testFieldAnalysis(results.fields);
    
    // Test 6: Data Export
    results.export = await testDataExport(results.fields);
    
    // Test 7: Direct MCP Server
    results.serverDirect = await testMCPServerDirectly();
    
    // Test 8: Generate scenarios
    generateTestScenarios();
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
  }
  
  // Summary
  logHeader('📊 TEST RESULTS SUMMARY');
  
  const tests = [
    ['Connection & Auth', results.connection],
    ['Map Retrieval', !!results.maps],
    ['Field Boundaries', !!results.fields],
    ['Satellite Scenes', !!results.scenes],
    ['Field Analysis', !!results.analysis],
    ['Data Export', !!results.export],
    ['MCP Server Direct', results.serverDirect]
  ];
  
  tests.forEach(([name, passed]) => {
    if (passed) {
      logSuccess(`${name}: PASSED`);
    } else {
      logError(`${name}: FAILED`);
    }
  });
  
  const passedCount = tests.filter(([_, passed]) => passed).length;
  const totalCount = tests.length;
  
  console.log('\n' + '='.repeat(60));
  if (passedCount === totalCount) {
    logSuccess(`🎉 ALL TESTS PASSED (${passedCount}/${totalCount})`);
    logSuccess('Satshot integration is working correctly!');
  } else {
    log(`⚠️  PARTIAL SUCCESS (${passedCount}/${totalCount} passed)`, colors.yellow);
    logInfo('Some features may need credentials or server-side configuration');
  }
  console.log('='.repeat(60));
  
  return results;
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
  TEST_CONFIG
};
