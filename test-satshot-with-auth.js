#!/usr/bin/env node

// Satshot API Test with Authentication from .env.local
// This script tests real Satshot API calls with credentials

require('dotenv').config({ path: '.env.local' });
const xmlrpc = require('xmlrpc');
const fs = require('fs');
const path = require('path');

// Check if .env.local exists and create template if not
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  const envTemplate = `# Satshot GIS API Configuration
SATSHOT_USERNAME=your_satshot_username
SATSHOT_PASSWORD=your_satshot_password
SATSHOT_SERVER=us

# Note: Replace the above values with your actual Satshot credentials
# Available servers: us, ca, mexico`;
  
  console.log('⚠️  Creating .env.local template file...');
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local - please add your Satshot credentials and run again');
  process.exit(0);
}

const TEST_CONFIG = {
  servers: {
    us: 'https://us.satshot.com/xmlrpc.php',
    ca: 'https://ca.satshot.com/xmlrpc.php', 
    mexico: 'https://mexico.satshot.com/xmlrpc.php'
  },
  credentials: {
    username: process.env.SATSHOT_USERNAME || '',
    password: process.env.SATSHOT_PASSWORD || '',
    server: process.env.SATSHOT_SERVER || 'us'
  },
  testField: {
    latitude: 42.0308,
    longitude: -93.6319,
    name: 'Iowa Test Field'
  },
  dateRange: {
    start: '2024-06-01',
    end: '2024-08-31'
  }
};

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
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

function logWarn(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

class SatshotAuthenticatedTester {
  constructor() {
    this.server = TEST_CONFIG.credentials.server;
    this.serverUrl = TEST_CONFIG.servers[this.server];
    this.client = null;
    this.sessionToken = null;
    this.authenticatedClient = null;
  }

  async makeAPICall(method, params = [], useSession = false, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      let clientToUse = this.client;
      if (useSession && this.sessionToken) {
        if (!this.authenticatedClient) {
          const urlWithToken = `${this.serverUrl}?idtoken=${this.sessionToken}`;
          this.authenticatedClient = xmlrpc.createSecureClient(urlWithToken);
        }
        clientToUse = this.authenticatedClient;
      }

      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: { code: 'TIMEOUT', message: `Request timed out after ${timeoutMs}ms` },
          duration: Date.now() - startTime
        });
      }, timeoutMs);

      clientToUse.methodCall(method, params, (error, value) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        if (error) {
          resolve({
            success: false,
            error: {
              code: error.faultCode || -1,
              message: error.faultString || error.message || 'Unknown error'
            },
            duration
          });
        } else {
          resolve({
            success: true,
            result: value,
            duration
          });
        }
      });
    });
  }

  async testStep1_Connection() {
    logStep(1, 'Testing Server Connection');
    
    if (!TEST_CONFIG.credentials.username || TEST_CONFIG.credentials.username === 'your_satshot_username') {
      logError('Please configure SATSHOT_USERNAME in .env.local');
      return false;
    }
    
    if (!TEST_CONFIG.credentials.password || TEST_CONFIG.credentials.password === 'your_satshot_password') {
      logError('Please configure SATSHOT_PASSWORD in .env.local');
      return false;
    }

    try {
      this.client = xmlrpc.createSecureClient(this.serverUrl);
      logInfo(`Testing connection to ${this.server} server (${this.serverUrl})`);
      
      // Test basic connectivity with get_my_user_info (should return "not logged in")
      const response = await this.makeAPICall('get_my_user_info', []);
      
      if (response.success) {
        logWarn('Unexpected success - user might already be logged in');
        return true;
      } else if (response.error.message.includes('not logged in')) {
        logSuccess('Server connection confirmed (authentication required)');
        return true;
      } else {
        logError(`Connection test failed: ${response.error.message}`);
        return false;
      }
      
    } catch (error) {
      logError(`Failed to initialize client: ${error.message}`);
      return false;
    }
  }

  async testStep2_Authentication() {
    logStep(2, 'Testing Authentication');
    
    logInfo(`Attempting login with username: ${TEST_CONFIG.credentials.username}`);
    
    const response = await this.makeAPICall('login', [
      TEST_CONFIG.credentials.username,
      TEST_CONFIG.credentials.password
    ]);

    if (response.success) {
      this.sessionToken = response.result;
      logSuccess('✨ Authentication successful!');
      console.log(`Session token type: ${typeof this.sessionToken}`);
      console.log(`Session token: ${typeof this.sessionToken === 'string' ? this.sessionToken.substring(0, 30) + '...' : this.sessionToken}`);
      console.log(`Response time: ${response.duration}ms`);
      return true;
    } else {
      logError(`❌ Authentication failed: ${response.error.message}`);
      console.log(`Error code: ${response.error.code}`);
      console.log(`Response time: ${response.duration}ms`);
      
      // Common authentication error suggestions
      if (response.error.message.includes('Invalid username')) {
        logWarn('Check your SATSHOT_USERNAME in .env.local');
      } else if (response.error.message.includes('Invalid password')) {
        logWarn('Check your SATSHOT_PASSWORD in .env.local');
      } else if (response.error.message.includes('Account')) {
        logWarn('Check if your Satshot account is active');
      }
      
      return false;
    }
  }

  async testStep3_UserInfo() {
    logStep(3, 'Testing Authenticated User Info');
    
    if (!this.sessionToken) {
      logError('No session token available');
      return false;
    }

    const response = await this.makeAPICall('get_my_user_info', [], true);
    
    if (response.success) {
      logSuccess('User info retrieved successfully');
      console.log('User info:', JSON.stringify(response.result, null, 2));
      console.log(`Response time: ${response.duration}ms`);
      return true;
    } else {
      logError(`Failed to get user info: ${response.error.message}`);
      return false;
    }
  }

  async testStep4_ExploreAPIMethods() {
    logStep(4, 'Exploring Available API Methods');
    
    if (!this.sessionToken) {
      logError('No session token available');
      return false;
    }

    // Test various method patterns based on the Satshot API documentation
    const methodsToTest = [
      // User and group info
      'get_my_user_info',
      'get_visible_groups',
      
      // Map and region methods (trying different patterns)
      'get_regions',
      'get_available_maps',
      'get_my_regions',
      'list_maps',
      
      // Core API methods (trying both with and without class prefix)
      'get_available_scenes',
      'get_scenes',
      'list_scenes',
      
      // Mapcenter API methods
      'create_map_context',
      'load_map',
      'get_map_info',
      
      // Analysis methods
      'analyze_image',
      'get_analysis_results',
      
      // Export methods
      'export_regions',
      'export_data'
    ];

    let successfulMethods = [];
    let failedMethods = [];

    logInfo(`Testing ${methodsToTest.length} potential API methods...`);

    for (const method of methodsToTest) {
      logInfo(`Testing: ${method}`);
      
      // Use minimal parameters that are likely to be accepted
      let params = [];
      if (method.includes('get_regions') || method.includes('regions')) {
        params = ['field']; // Try with region type
      } else if (method.includes('maps')) {
        params = [5]; // Limit to 5 results
      }
      
      const response = await this.makeAPICall(method, params, true, 8000);
      
      if (response.success) {
        logSuccess(`  ✅ ${method}: SUCCESS`);
        console.log(`    Result type: ${typeof response.result}`);
        console.log(`    Response time: ${response.duration}ms`);
        if (response.result) {
          const resultStr = JSON.stringify(response.result);
          console.log(`    Sample: ${resultStr.substring(0, 150)}${resultStr.length > 150 ? '...' : ''}`);
        }
        successfulMethods.push({ method, result: response.result, duration: response.duration });
      } else {
        console.log(`    ❌ ${method}: ${response.error.message} (${response.duration}ms)`);
        failedMethods.push({ method, error: response.error.message });
      }
    }

    logSuccess(`Found ${successfulMethods.length} working methods:`);
    successfulMethods.forEach(m => console.log(`  - ${m.method}`));
    
    console.log(`\nFailed methods: ${failedMethods.length}`);
    
    return successfulMethods.length > 0;
  }

  async testStep5_MapOperations() {
    logStep(5, 'Testing Map Operations');
    
    if (!this.sessionToken) {
      logError('No session token available');
      return false;
    }

    // Try to get available maps using different method names
    const mapMethods = ['get_available_maps', 'get_maps', 'list_maps', 'get_my_maps'];
    
    for (const method of mapMethods) {
      logInfo(`Trying ${method}...`);
      const response = await this.makeAPICall(method, [10, 'all'], true);
      
      if (response.success) {
        logSuccess(`${method} worked!`);
        console.log('Maps result:', JSON.stringify(response.result, null, 2));
        return true;
      } else {
        console.log(`  ${method} failed: ${response.error.message}`);
      }
    }
    
    logWarn('No map methods worked');
    return false;
  }

  async testStep6_FieldOperations() {
    logStep(6, 'Testing Field/Region Operations');
    
    if (!this.sessionToken) {
      logError('No session token available');
      return false;
    }

    // Try different ways to get field/region data
    const regionMethods = [
      { method: 'get_regions', params: ['field'] },
      { method: 'get_regions', params: [] },
      { method: 'get_my_regions', params: [] },
      { method: 'list_regions', params: ['field'] },
      { method: 'get_boundaries', params: [] }
    ];
    
    for (const test of regionMethods) {
      logInfo(`Trying ${test.method} with params: ${JSON.stringify(test.params)}`);
      const response = await this.makeAPICall(test.method, test.params, true);
      
      if (response.success) {
        logSuccess(`${test.method} worked!`);
        console.log('Regions result:', JSON.stringify(response.result, null, 2));
        return true;
      } else {
        console.log(`  ${test.method} failed: ${response.error.message}`);
      }
    }
    
    logWarn('No region methods worked');
    return false;
  }

  async testStep7_Logout() {
    logStep(7, 'Testing Logout');
    
    if (!this.sessionToken) {
      logWarn('No session to logout from');
      return true;
    }

    const response = await this.makeAPICall('logout', [], true);
    
    if (response.success) {
      logSuccess('Logout successful');
      this.sessionToken = null;
      this.authenticatedClient = null;
      return true;
    } else {
      logWarn(`Logout failed: ${response.error.message}`);
      // Clear session anyway
      this.sessionToken = null;
      this.authenticatedClient = null;
      return false;
    }
  }

  async runFullTest() {
    log('\n' + '='.repeat(80), colors.bright + colors.cyan);
    log('🛰️  SATSHOT AUTHENTICATED API TESTING', colors.bright + colors.cyan);
    log('='.repeat(80), colors.bright + colors.cyan);
    
    console.log('Configuration:');
    console.log('- Server:', this.server);
    console.log('- URL:', this.serverUrl);
    console.log('- Username:', TEST_CONFIG.credentials.username);
    console.log('- Has Password:', !!TEST_CONFIG.credentials.password);
    
    const results = [];
    
    try {
      results.push(await this.testStep1_Connection());
      if (results[0]) {
        results.push(await this.testStep2_Authentication());
        if (results[1]) {
          results.push(await this.testStep3_UserInfo());
          results.push(await this.testStep4_ExploreAPIMethods());
          results.push(await this.testStep5_MapOperations());
          results.push(await this.testStep6_FieldOperations());
        } else {
          // Skip authenticated tests if login failed
          results.push(false, false, false, false);
        }
      } else {
        // Skip all tests if connection failed
        results.push(false, false, false, false, false);
      }
      results.push(await this.testStep7_Logout());
      
    } catch (error) {
      logError(`Test execution failed: ${error.message}`);
      console.error(error);
    }
    
    // Summary
    log('\n' + '='.repeat(80), colors.bright + colors.cyan);
    log('📊 AUTHENTICATED API TEST RESULTS', colors.bright + colors.cyan);
    log('='.repeat(80), colors.bright + colors.cyan);
    
    const testNames = [
      'Server Connection',
      'Authentication', 
      'User Info',
      'API Method Discovery',
      'Map Operations',
      'Field Operations',
      'Logout'
    ];
    
    results.forEach((passed, index) => {
      if (passed) {
        logSuccess(`${testNames[index]}: PASSED`);
      } else {
        logError(`${testNames[index]}: FAILED`);
      }
    });
    
    const passedCount = results.filter(r => r).length;
    console.log(`\nOverall: ${passedCount}/${results.length} tests passed`);
    
    if (results[1]) { // If authentication worked
      logSuccess('🎉 Authentication is working! You can now use the Satshot API.');
    } else if (results[0]) { // If connection worked but auth failed
      logError('🔐 Connection works but authentication failed. Check your credentials.');
    } else {
      logError('🚫 Basic connection failed. Check server and network connectivity.');
    }
    
    return results;
  }
}

// Run the test
if (require.main === module) {
  const tester = new SatshotAuthenticatedTester();
  tester.runFullTest().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = SatshotAuthenticatedTester;
