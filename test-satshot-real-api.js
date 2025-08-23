#!/usr/bin/env node

// Test real Satshot API calls to identify authentication and API method issues

const xmlrpc = require('xmlrpc');

const TEST_CONFIG = {
  servers: {
    us: 'https://us.satshot.com/xmlrpc.php',
    ca: 'https://ca.satshot.com/xmlrpc.php', 
    mexico: 'https://mexico.satshot.com/xmlrpc.php'
  },
  credentials: {
    username: process.env.SATSHOT_USERNAME || '',
    password: process.env.SATSHOT_PASSWORD || ''
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

class SatshotRealAPITester {
  constructor(server = 'us') {
    this.server = server;
    this.serverUrl = TEST_CONFIG.servers[server];
    this.client = null;
    this.sessionToken = null;
  }

  async makeAPICall(method, params = [], timeoutMs = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      let clientToUse = this.client;
      if (this.sessionToken && method !== 'login') {
        const urlWithToken = `${this.serverUrl}?idtoken=${this.sessionToken}`;
        clientToUse = xmlrpc.createSecureClient(urlWithToken);
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

  async testServerConnectivity() {
    logStep(1, 'Testing Server Connectivity');
    
    try {
      this.client = xmlrpc.createSecureClient(this.serverUrl);
      logInfo(`Testing connection to ${this.serverUrl}`);
      
      // Test different methods to see what's available
      const methods = [
        'system.listMethods',
        'system.getCapabilities', 
        'get_my_user_info',
        'mapcenter_api.get_my_user_info',
        'core_api.get_server_info'
      ];

      logInfo('Testing various API methods...');
      
      for (const method of methods) {
        logInfo(`Trying ${method}...`);
        const response = await this.makeAPICall(method, [], 5000);
        
        console.log(`  - ${method}: ${response.success ? 'SUCCESS' : 'FAILED'} (${response.duration}ms)`);
        if (response.success) {
          console.log(`    Result: ${JSON.stringify(response.result).substring(0, 100)}...`);
        } else {
          console.log(`    Error: ${response.error?.message}`);
        }
      }
      
      return true;
      
    } catch (error) {
      logError(`Failed to initialize client: ${error.message}`);
      return false;
    }
  }

  async testAuthentication() {
    logStep(2, 'Testing Authentication');
    
    if (!TEST_CONFIG.credentials.username || !TEST_CONFIG.credentials.password) {
      logWarn('No credentials provided. Set SATSHOT_USERNAME and SATSHOT_PASSWORD environment variables.');
      return false;
    }

    logInfo(`Attempting login with username: ${TEST_CONFIG.credentials.username}`);
    
    const response = await this.makeAPICall('login', [
      TEST_CONFIG.credentials.username,
      TEST_CONFIG.credentials.password
    ]);

    if (response.success) {
      this.sessionToken = response.result;
      logSuccess('Authentication successful!');
      console.log(`Session token: ${typeof this.sessionToken === 'string' ? this.sessionToken.substring(0, 20) + '...' : this.sessionToken}`);
      console.log(`Response time: ${response.duration}ms`);
      return true;
    } else {
      logError(`Authentication failed: ${response.error?.message}`);
      console.log(`Error code: ${response.error?.code}`);
      console.log(`Response time: ${response.duration}ms`);
      return false;
    }
  }

  async testAuthenticatedCalls() {
    logStep(3, 'Testing Authenticated API Calls');
    
    if (!this.sessionToken) {
      logWarn('No session token available. Skipping authenticated tests.');
      return false;
    }

    const authenticatedMethods = [
      { name: 'get_my_user_info', params: [] },
      { name: 'mapcenter_api.get_my_user_info', params: [] },
      { name: 'mapcenter_api.get_visible_groups', params: [] },
      { name: 'get_available_maps', params: [5, 'all'] },
      { name: 'mapcenter_api.get_regions', params: ['field', null, null, null, false] },
      { name: 'core_api.get_server_info', params: [] }
    ];

    let successCount = 0;
    
    for (const method of authenticatedMethods) {
      logInfo(`Testing ${method.name}...`);
      const response = await this.makeAPICall(method.name, method.params, 10000);
      
      if (response.success) {
        logSuccess(`${method.name}: SUCCESS`);
        console.log(`  Result type: ${typeof response.result}`);
        console.log(`  Result sample: ${JSON.stringify(response.result).substring(0, 200)}...`);
        console.log(`  Response time: ${response.duration}ms`);
        successCount++;
      } else {
        logError(`${method.name}: FAILED`);
        console.log(`  Error: ${response.error?.message}`);
        console.log(`  Error code: ${response.error?.code}`);
        console.log(`  Response time: ${response.duration}ms`);
      }
    }

    logInfo(`Authenticated methods test completed: ${successCount}/${authenticatedMethods.length} successful`);
    return successCount > 0;
  }

  async testLogout() {
    logStep(4, 'Testing Logout');
    
    if (!this.sessionToken) {
      logWarn('No session to logout from.');
      return true;
    }

    const response = await this.makeAPICall('logout', []);
    
    if (response.success) {
      logSuccess('Logout successful');
      this.sessionToken = null;
      return true;
    } else {
      logWarn(`Logout failed: ${response.error?.message}`);
      this.sessionToken = null; // Clear anyway
      return false;
    }
  }

  async runFullTest() {
    log('\n' + '='.repeat(70), colors.bright + colors.cyan);
    log('🛰️  SATSHOT REAL API TESTING', colors.bright + colors.cyan);
    log('='.repeat(70), colors.bright + colors.cyan);
    
    console.log('Configuration:');
    console.log('- Server:', this.server);
    console.log('- URL:', this.serverUrl);
    console.log('- Has Username:', !!TEST_CONFIG.credentials.username);
    console.log('- Has Password:', !!TEST_CONFIG.credentials.password);
    
    const results = [];
    
    try {
      results.push(await this.testServerConnectivity());
      results.push(await this.testAuthentication());
      results.push(await this.testAuthenticatedCalls());
      results.push(await this.testLogout());
      
    } catch (error) {
      logError(`Test execution failed: ${error.message}`);
      console.error(error);
    }
    
    // Summary
    log('\n' + '='.repeat(70), colors.bright + colors.cyan);
    log('📊 REAL API TEST RESULTS', colors.bright + colors.cyan);
    log('='.repeat(70), colors.bright + colors.cyan);
    
    const testNames = ['Server Connectivity', 'Authentication', 'Authenticated Calls', 'Logout'];
    
    results.forEach((passed, index) => {
      if (passed) {
        logSuccess(`${testNames[index]}: PASSED`);
      } else {
        logError(`${testNames[index]}: FAILED`);
      }
    });
    
    const passedCount = results.filter(r => r).length;
    console.log(`\nOverall: ${passedCount}/${results.length} tests passed`);
    
    if (passedCount === 0) {
      logError('All tests failed. Check server connectivity and credentials.');
    } else if (!TEST_CONFIG.credentials.username) {
      logWarn('Set SATSHOT_USERNAME and SATSHOT_PASSWORD for full testing.');
    }
    
    return results;
  }
}

// Test all servers if run directly
if (require.main === module) {
  async function testAllServers() {
    const servers = ['us', 'ca', 'mexico'];
    
    for (const server of servers) {
      log(`\n${'='.repeat(80)}`, colors.bright + colors.blue);
      log(`TESTING ${server.toUpperCase()} SERVER`, colors.bright + colors.blue);
      log('='.repeat(80), colors.bright + colors.blue);
      
      const tester = new SatshotRealAPITester(server);
      await tester.runFullTest();
      
      // Add delay between server tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  testAllServers().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = SatshotRealAPITester;
