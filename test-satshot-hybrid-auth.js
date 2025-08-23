#!/usr/bin/env node

// Test Satshot authentication with BOTH session token AND cookies
require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { URL } = require('url');

const TEST_CONFIG = {
  username: process.env.SATSHOT_USERNAME || '',
  password: process.env.SATSHOT_PASSWORD || '',
  serverUrl: 'https://us.satshot.com/xmlrpc.php'
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

class HybridSatshotClient {
  constructor() {
    this.cookies = [];
    this.sessionToken = null;
  }

  async makeXMLRPCCall(method, params = [], useTokenInUrl = false) {
    return new Promise((resolve) => {
      // Create XML-RPC request body with optional session token as parameter
      let finalParams = params;
      if (this.sessionToken && !useTokenInUrl) {
        // Try session token as first parameter
        finalParams = [this.sessionToken, ...params];
      }

      const xmlrpcRequest = `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
${finalParams.map(param => `    <param><value><string>${param}</string></value></param>`).join('\n')}
  </params>
</methodCall>`;

      // Decide which URL to use
      let targetUrl = TEST_CONFIG.serverUrl;
      if (useTokenInUrl && this.sessionToken) {
        targetUrl = `${TEST_CONFIG.serverUrl}?idtoken=${this.sessionToken}`;
      }

      const url = new URL(targetUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(xmlrpcRequest),
          'User-Agent': 'NodeJS XML-RPC Client'
        }
      };

      // Add cookies to request if we have them
      if (this.cookies.length > 0) {
        options.headers['Cookie'] = this.cookies.join('; ');
      }

      const req = https.request(options, (res) => {
        let data = '';
        
        // Capture cookies from response
        const newCookies = res.headers['set-cookie'];
        if (newCookies) {
          // Update our cookie store
          this.cookies = newCookies.map(cookie => cookie.split(';')[0]);
        }

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Parse XML-RPC response manually
            if (data.includes('<fault>')) {
              // Extract fault information
              const faultCodeMatch = data.match(/<name>faultCode<\/name><value><int>(\d+)<\/int>/);
              const faultStringMatch = data.match(/<name>faultString<\/name><value><string>(.*?)<\/string>/);
              
              resolve({
                success: false,
                error: {
                  code: faultCodeMatch ? parseInt(faultCodeMatch[1]) : -1,
                  message: faultStringMatch ? faultStringMatch[1] : 'Unknown fault'
                }
              });
            } else if (data.includes('<methodResponse>')) {
              // Extract result
              let result = null;
              
              // Try to extract string values
              const stringMatch = data.match(/<value><string>(.*?)<\/string><\/value>/);
              if (stringMatch) {
                result = stringMatch[1];
              } else if (data.includes('<value><array>')) {
                result = []; // Empty array for now
              } else if (data.includes('<value><struct>')) {
                result = {}; // Empty object for now
              }
              
              resolve({
                success: true,
                result: result
              });
            } else {
              resolve({
                success: false,
                error: { code: -1, message: 'Invalid XML-RPC response' }
              });
            }
          } catch (parseError) {
            resolve({
              success: false,
              error: { code: -1, message: `Parse error: ${parseError.message}` }
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: { code: -1, message: `Request failed: ${error.message}` }
        });
      });

      req.write(xmlrpcRequest);
      req.end();
    });
  }

  async login() {
    logInfo(`Attempting login for user: ${TEST_CONFIG.username}`);
    
    const response = await this.makeXMLRPCCall('login', [
      TEST_CONFIG.username,
      TEST_CONFIG.password
    ]);

    if (response.success) {
      logSuccess(`Login successful! Session token: ${response.result?.substring(0, 20)}...`);
      this.sessionToken = response.result;
      logInfo(`Cookies after login: ${this.cookies.join('; ')}`);
      return response.result;
    } else {
      logError(`Login failed: ${response.error.message}`);
      throw new Error(`Login failed: ${response.error.message}`);
    }
  }

  async testMethod(methodName, params = [], description = '') {
    logInfo(`Testing ${methodName}${description}...`);
    
    // Try 4 different authentication approaches
    const approaches = [
      { name: 'Cookie Only', useTokenInUrl: false, extraParams: false },
      { name: 'Token in URL + Cookie', useTokenInUrl: true, extraParams: false },
      { name: 'Token as Param + Cookie', useTokenInUrl: false, extraParams: true },
      { name: 'All Combined', useTokenInUrl: true, extraParams: true }
    ];

    for (const approach of approaches) {
      let testParams = params;
      if (approach.extraParams && this.sessionToken) {
        testParams = [this.sessionToken, ...params];
      }

      const response = await this.makeXMLRPCCall(methodName, testParams, approach.useTokenInUrl);
      
      if (response.success) {
        logSuccess(`  ✨ ${methodName} SUCCESS with ${approach.name}!`);
        console.log(`     Result: ${JSON.stringify(response.result)}`);
        return true;
      } else if (!response.error.message.includes('not logged in') && 
                 !response.error.message.includes('not found')) {
        logInfo(`     ${approach.name}: ${response.error.message}`);
      }
    }
    
    console.log(`     All approaches failed for ${methodName}`);
    return false;
  }
}

async function testHybridAuthentication() {
  log('\n' + '='.repeat(70), colors.bright + colors.blue);
  log('🔐 HYBRID SATSHOT AUTHENTICATION TEST', colors.bright + colors.blue);
  log('='.repeat(70), colors.bright + colors.blue);

  if (!TEST_CONFIG.username || !TEST_CONFIG.password) {
    logError('Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD in .env.local');
    return;
  }

  try {
    const client = new HybridSatshotClient();
    
    // Step 1: Login
    await client.login();

    // Step 2: Test various API methods with different authentication approaches
    logInfo('\n🧪 Testing API methods with multiple auth approaches...');
    
    const testMethods = [
      { name: 'get_my_user_info', params: [], desc: ' (basic user info)' },
      { name: 'get_visible_groups', params: [], desc: ' (user groups)' },
      { name: 'get_available_maps', params: [5], desc: ' (maps with limit)' },
      { name: 'get_available_maps', params: [], desc: ' (maps no limit)' },
    ];

    let successCount = 0;
    for (const test of testMethods) {
      const success = await client.testMethod(test.name, test.params, test.desc);
      if (success) successCount++;
    }

    // Step 3: Try some methods that might exist based on documentation
    logInfo('\n🔍 Testing documented Satshot API methods...');
    
    const documentedMethods = [
      { name: 'core_api.get_my_user_info', params: [], desc: ' (core API user info)' },
      { name: 'mapcenter_api.get_my_user_info', params: [], desc: ' (mapcenter API user info)' },
      { name: 'get_server_capabilities', params: [], desc: ' (server capabilities)' },
      { name: 'core_api.create_map_context', params: [], desc: ' (create map)' },
    ];

    for (const test of documentedMethods) {
      const success = await client.testMethod(test.name, test.params, test.desc);
      if (success) successCount++;
    }

    // Summary
    log('\n' + '='.repeat(70), colors.bright + colors.blue);
    log('📊 HYBRID AUTHENTICATION TEST RESULTS', colors.bright + colors.blue);
    log('='.repeat(70), colors.bright + colors.blue);

    logInfo(`Final cookies: ${client.cookies.join('; ')}`);
    logInfo(`Session token: ${client.sessionToken?.substring(0, 20)}...`);

    if (successCount > 0) {
      logSuccess(`🎉 BREAKTHROUGH! ${successCount} API method(s) worked!`);
      logSuccess('We found a working authentication approach.');
    } else {
      logError('❌ No API methods worked with any authentication approach');
      logInfo('This suggests:');
      logInfo('1. Account may lack basic permissions');
      logInfo('2. All method names in our tests are incorrect');
      logInfo('3. Additional authentication steps required');
      logInfo('4. Server/account configuration issue');
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

// Run the test
if (require.main === module) {
  testHybridAuthentication().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = testHybridAuthentication;
