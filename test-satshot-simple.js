#!/usr/bin/env node

// Simple test of Satshot cookie authentication without TypeScript compilation
require('dotenv').config({ path: '.env.local' });
const xmlrpc = require('xmlrpc');
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

class SimpleSatshotClient {
  constructor() {
    this.cookies = [];
  }

  async makeXMLRPCCall(method, params = []) {
    return new Promise((resolve) => {
      // Create XML-RPC request body
      const xmlrpcRequest = `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
${params.map(param => `    <param><value><string>${param}</string></value></param>`).join('\n')}
  </params>
</methodCall>`;

      const url = new URL(TEST_CONFIG.serverUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
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
          logInfo(`Updated cookies: ${this.cookies.join('; ')}`);
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
              // Extract result - simple string extraction for basic cases
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
      return response.result;
    } else {
      logError(`Login failed: ${response.error.message}`);
      throw new Error(`Login failed: ${response.error.message}`);
    }
  }

  async testAuthenticatedCall(method, params = []) {
    logInfo(`Testing ${method}...`);
    
    const response = await this.makeXMLRPCCall(method, params);
    
    if (response.success) {
      logSuccess(`${method}: SUCCESS!`);
      console.log(`  Result: ${JSON.stringify(response.result)}`);
      return true;
    } else {
      console.log(`  ${method}: ${response.error.message}`);
      return false;
    }
  }
}

async function testCookieAuthentication() {
  log('\n' + '='.repeat(60), colors.bright + colors.blue);
  log('🍪 SIMPLE SATSHOT COOKIE TEST', colors.bright + colors.blue);
  log('='.repeat(60), colors.bright + colors.blue);

  if (!TEST_CONFIG.username || !TEST_CONFIG.password) {
    logError('Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD in .env.local');
    return;
  }

  try {
    const client = new SimpleSatshotClient();
    
    // Step 1: Login
    await client.login();

    // Step 2: Test authenticated calls
    logInfo('\nTesting authenticated API calls...');
    
    const testMethods = [
      { name: 'get_my_user_info', params: [] },
      { name: 'get_visible_groups', params: [] },
      { name: 'mapcenter_api.get_visible_groups', params: [] },
      { name: 'get_available_maps', params: [5, 'all'] },
      { name: 'mapcenter_api.get_regions', params: ['field'] }
    ];

    let successCount = 0;
    for (const test of testMethods) {
      const success = await client.testAuthenticatedCall(test.name, test.params);
      if (success) successCount++;
    }

    // Summary
    log('\n' + '='.repeat(60), colors.bright + colors.blue);
    log('📊 SIMPLE COOKIE TEST RESULTS', colors.bright + colors.blue);
    log('='.repeat(60), colors.bright + colors.blue);

    logInfo(`Cookies captured: ${client.cookies.length}`);
    client.cookies.forEach((cookie, i) => {
      console.log(`  ${i + 1}. ${cookie}`);
    });

    if (successCount > 0) {
      logSuccess(`🎉 SUCCESS! ${successCount}/${testMethods.length} API methods worked!`);
      logSuccess('Cookie-based authentication is working correctly.');
    } else {
      logError('No API methods worked after login');
      logInfo('This suggests either method names are wrong or additional permissions needed');
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

// Run the test
if (require.main === module) {
  testCookieAuthentication().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = testCookieAuthentication;
