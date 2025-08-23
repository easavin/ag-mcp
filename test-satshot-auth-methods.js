#!/usr/bin/env node

// Test different authentication methods with Satshot API
require('dotenv').config({ path: '.env.local' });
const xmlrpc = require('xmlrpc');

const TEST_CONFIG = {
  server: 'us',
  serverUrl: 'https://us.satshot.com/xmlrpc.php',
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
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
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

class SatshotAuthMethodTester {
  constructor() {
    this.client = xmlrpc.createSecureClient(TEST_CONFIG.serverUrl);
    this.sessionToken = null;
  }

  async makeAPICall(method, params = [], timeoutMs = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: { code: 'TIMEOUT', message: `Request timed out after ${timeoutMs}ms` },
          duration: Date.now() - startTime
        });
      }, timeoutMs);

      this.client.methodCall(method, params, (error, value) => {
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

  async testMethod1_CredentialsInParams() {
    log('\n📋 METHOD 1: Adding credentials as first parameters', colors.bright + colors.yellow);
    
    // Try adding username/password as the first parameters to each method call
    const testMethods = [
      { name: 'get_my_user_info', baseParams: [] },
      { name: 'get_available_maps', baseParams: [5, 'all'] },
      { name: 'get_visible_groups', baseParams: [] }
    ];

    let successCount = 0;

    for (const test of testMethods) {
      logInfo(`Testing ${test.name} with credentials as first parameters...`);
      
      // Method 1a: credentials first
      const params1 = [TEST_CONFIG.credentials.username, TEST_CONFIG.credentials.password, ...test.baseParams];
      const response1 = await this.makeAPICall(test.name, params1);
      
      if (response1.success) {
        logSuccess(`${test.name} worked with credentials first!`);
        console.log('Response:', JSON.stringify(response1.result, null, 2));
        successCount++;
        continue;
      } else {
        console.log(`  Credentials first failed: ${response1.error.message}`);
      }

      // Method 1b: credentials last
      const params2 = [...test.baseParams, TEST_CONFIG.credentials.username, TEST_CONFIG.credentials.password];
      const response2 = await this.makeAPICall(test.name, params2);
      
      if (response2.success) {
        logSuccess(`${test.name} worked with credentials last!`);
        console.log('Response:', JSON.stringify(response2.result, null, 2));
        successCount++;
      } else {
        console.log(`  Credentials last failed: ${response2.error.message}`);
      }
    }

    return successCount > 0;
  }

  async testMethod2_AuthObjectParam() {
    log('\n📋 METHOD 2: Authentication object as parameter', colors.bright + colors.yellow);
    
    // Try passing auth info as a structured object
    const authObject = {
      username: TEST_CONFIG.credentials.username,
      password: TEST_CONFIG.credentials.password
    };

    const testMethods = [
      { name: 'get_my_user_info', params: [authObject] },
      { name: 'get_available_maps', params: [authObject, 5, 'all'] },
      { name: 'get_visible_groups', params: [authObject] }
    ];

    let successCount = 0;

    for (const test of testMethods) {
      logInfo(`Testing ${test.name} with auth object...`);
      const response = await this.makeAPICall(test.name, test.params);
      
      if (response.success) {
        logSuccess(`${test.name} worked with auth object!`);
        console.log('Response:', JSON.stringify(response.result, null, 2));
        successCount++;
      } else {
        console.log(`  Auth object failed: ${response.error.message}`);
      }
    }

    return successCount > 0;
  }

  async testMethod3_SessionTokenInURL() {
    log('\n📋 METHOD 3: Session token in URL (current approach)', colors.bright + colors.yellow);
    
    // First get session token
    logInfo('Getting session token...');
    const loginResponse = await this.makeAPICall('login', [
      TEST_CONFIG.credentials.username,
      TEST_CONFIG.credentials.password
    ]);

    if (!loginResponse.success) {
      logError(`Login failed: ${loginResponse.error.message}`);
      return false;
    }

    this.sessionToken = loginResponse.result;
    logSuccess(`Got session token: ${typeof this.sessionToken === 'string' ? this.sessionToken.substring(0, 20) + '...' : this.sessionToken}`);

    // Now test with session token in URL
    const urlWithToken = `${TEST_CONFIG.serverUrl}?idtoken=${this.sessionToken}`;
    const authenticatedClient = xmlrpc.createSecureClient(urlWithToken);

    const testMethods = ['get_my_user_info', 'get_available_maps', 'get_visible_groups'];
    let successCount = 0;

    for (const method of testMethods) {
      logInfo(`Testing ${method} with session token in URL...`);
      
      const response = await new Promise((resolve) => {
        authenticatedClient.methodCall(method, [], (error, value) => {
          if (error) {
            resolve({
              success: false,
              error: { message: error.faultString || error.message }
            });
          } else {
            resolve({ success: true, result: value });
          }
        });
      });
      
      if (response.success) {
        logSuccess(`${method} worked with session token in URL!`);
        console.log('Response:', JSON.stringify(response.result, null, 2));
        successCount++;
      } else {
        console.log(`  Session token in URL failed: ${response.error.message}`);
      }
    }

    return successCount > 0;
  }

  async testMethod4_SessionTokenAsParam() {
    log('\n📋 METHOD 4: Session token as parameter', colors.bright + colors.yellow);
    
    if (!this.sessionToken) {
      logWarn('No session token available, getting one...');
      const loginResponse = await this.makeAPICall('login', [
        TEST_CONFIG.credentials.username,
        TEST_CONFIG.credentials.password
      ]);

      if (!loginResponse.success) {
        logError(`Login failed: ${loginResponse.error.message}`);
        return false;
      }

      this.sessionToken = loginResponse.result;
    }

    // Try session token as first parameter
    const testMethods = [
      { name: 'get_my_user_info', params: [this.sessionToken] },
      { name: 'get_available_maps', params: [this.sessionToken, 5, 'all'] },
      { name: 'get_visible_groups', params: [this.sessionToken] }
    ];

    let successCount = 0;

    for (const test of testMethods) {
      logInfo(`Testing ${test.name} with session token as parameter...`);
      const response = await this.makeAPICall(test.name, test.params);
      
      if (response.success) {
        logSuccess(`${test.name} worked with session token as parameter!`);
        console.log('Response:', JSON.stringify(response.result, null, 2));
        successCount++;
      } else {
        console.log(`  Session token as param failed: ${response.error.message}`);
      }
    }

    return successCount > 0;
  }

  async testMethod5_HTTPBasicAuth() {
    log('\n📋 METHOD 5: HTTP Basic Authentication in URL', colors.bright + colors.yellow);
    
    // Try HTTP basic auth in the URL
    const authUrl = TEST_CONFIG.serverUrl.replace('https://', 
      `https://${encodeURIComponent(TEST_CONFIG.credentials.username)}:${encodeURIComponent(TEST_CONFIG.credentials.password)}@`);
    
    logInfo(`Testing with URL: ${authUrl.replace(/:([^:@]+)@/, ':***@')}`);
    
    try {
      const basicAuthClient = xmlrpc.createSecureClient(authUrl);
      
      const testMethods = ['get_my_user_info', 'get_available_maps', 'get_visible_groups'];
      let successCount = 0;

      for (const method of testMethods) {
        logInfo(`Testing ${method} with HTTP basic auth...`);
        
        const response = await new Promise((resolve) => {
          basicAuthClient.methodCall(method, [], (error, value) => {
            if (error) {
              resolve({
                success: false,
                error: { message: error.faultString || error.message }
              });
            } else {
              resolve({ success: true, result: value });
            }
          });
        });
        
        if (response.success) {
          logSuccess(`${method} worked with HTTP basic auth!`);
          console.log('Response:', JSON.stringify(response.result, null, 2));
          successCount++;
        } else {
          console.log(`  HTTP basic auth failed: ${response.error.message}`);
        }
      }

      return successCount > 0;
    } catch (error) {
      logError(`HTTP basic auth setup failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    log('\n' + '='.repeat(80), colors.bright + colors.blue);
    log('🔐 SATSHOT AUTHENTICATION METHODS TEST', colors.bright + colors.blue);
    log('='.repeat(80), colors.bright + colors.blue);
    
    if (!TEST_CONFIG.credentials.username || !TEST_CONFIG.credentials.password) {
      logError('Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD in .env.local');
      return;
    }

    console.log('Configuration:');
    console.log('- Server:', TEST_CONFIG.server);
    console.log('- URL:', TEST_CONFIG.serverUrl);
    console.log('- Username:', TEST_CONFIG.credentials.username);

    const methods = [
      { name: 'Credentials in Parameters', test: () => this.testMethod1_CredentialsInParams() },
      { name: 'Auth Object Parameter', test: () => this.testMethod2_AuthObjectParam() },
      { name: 'Session Token in URL', test: () => this.testMethod3_SessionTokenInURL() },
      { name: 'Session Token as Parameter', test: () => this.testMethod4_SessionTokenAsParam() },
      { name: 'HTTP Basic Authentication', test: () => this.testMethod5_HTTPBasicAuth() }
    ];

    const results = [];

    for (const method of methods) {
      try {
        const result = await method.test();
        results.push({ name: method.name, success: result });
      } catch (error) {
        logError(`${method.name} test failed: ${error.message}`);
        results.push({ name: method.name, success: false });
      }
    }

    // Summary
    log('\n' + '='.repeat(80), colors.bright + colors.blue);
    log('📊 AUTHENTICATION METHODS RESULTS', colors.bright + colors.blue);
    log('='.repeat(80), colors.bright + colors.blue);

    results.forEach(result => {
      if (result.success) {
        logSuccess(`${result.name}: WORKS! ✨`);
      } else {
        logError(`${result.name}: Failed`);
      }
    });

    const workingMethods = results.filter(r => r.success);
    
    if (workingMethods.length === 0) {
      logError('\n🚫 No authentication methods worked!');
      logWarn('This suggests the API might require different methods or have access restrictions.');
    } else {
      logSuccess(`\n🎉 Found ${workingMethods.length} working authentication method(s)!`);
      workingMethods.forEach(method => {
        logSuccess(`  → Use: ${method.name}`);
      });
    }

    return results;
  }
}

// Run the test
if (require.main === module) {
  const tester = new SatshotAuthMethodTester();
  tester.runAllTests().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = SatshotAuthMethodTester;
