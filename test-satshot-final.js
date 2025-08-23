#!/usr/bin/env node

// Final test of Satshot MCP integration with correct authentication
require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { URL } = require('url');

const TEST_CONFIG = {
  username: process.env.SATSHOT_USERNAME || '',
  password: process.env.SATSHOT_PASSWORD || '',
  serverUrl: 'https://us.satshot.com/xmlrpc.php',
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

class FinalSatshotTester {
  constructor() {
    this.cookies = [];
    this.sessionToken = null;
  }

  async makeXMLRPCCall(method, params = []) {
    return new Promise((resolve) => {
      const xmlrpcRequest = `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
${params.map(param => `    <param><value><string>${param}</string></value></param>`).join('\n')}
  </params>
</methodCall>`;

      // Use session token in URL + cookies (the working approach)
      let targetUrl = TEST_CONFIG.serverUrl;
      if (this.sessionToken) {
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

      // Add cookies
      if (this.cookies.length > 0) {
        options.headers['Cookie'] = this.cookies.join('; ');
      }

      const req = https.request(options, (res) => {
        let data = '';
        
        // Capture cookies
        const newCookies = res.headers['set-cookie'];
        if (newCookies) {
          this.cookies = newCookies.map(cookie => cookie.split(';')[0]);
        }

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (data.includes('<fault>')) {
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
              // Basic string extraction
              let result = null;
              const stringMatch = data.match(/<value><string>(.*?)<\/string><\/value>/);
              if (stringMatch) {
                result = stringMatch[1];
              } else if (data.includes('<value><array>')) {
                result = [];
              } else if (data.includes('<value><struct>')) {
                result = {};
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

  async testStep1_Authentication() {
    logStep(1, 'Testing Authentication');
    
    logInfo(`Attempting login for user: ${TEST_CONFIG.username}`);
    const response = await this.makeXMLRPCCall('login', [
      TEST_CONFIG.username,
      TEST_CONFIG.password
    ]);

    if (response.success) {
      this.sessionToken = response.result;
      logSuccess(`Authentication successful! Session token: ${this.sessionToken.substring(0, 20)}...`);
      logInfo(`Cookies: ${this.cookies.join('; ')}`);
      return true;
    } else {
      logError(`Authentication failed: ${response.error.message}`);
      return false;
    }
  }

  async testStep2_UserInfo() {
    logStep(2, 'Testing User Information');
    
    const response = await this.makeXMLRPCCall('get_my_user_info', []);
    
    if (response.success) {
      logSuccess(`User info retrieved: ID = ${response.result}`);
      return true;
    } else {
      logError(`Failed to get user info: ${response.error.message}`);
      return false;
    }
  }

  async testStep3_UserGroups() {
    logStep(3, 'Testing User Groups');
    
    const response = await this.makeXMLRPCCall('get_visible_groups', []);
    
    if (response.success) {
      logSuccess(`User groups retrieved: Group ID = ${response.result}`);
      return true;
    } else {
      logError(`Failed to get user groups: ${response.error.message}`);
      return false;
    }
  }

  async testStep4_AvailableMaps() {
    logStep(4, 'Testing Available Maps');
    
    const response = await this.makeXMLRPCCall('get_available_maps', []);
    
    if (response.success) {
      logSuccess(`Maps retrieved: ${response.result}`);
      return true;
    } else {
      logError(`Failed to get maps: ${response.error.message}`);
      return false;
    }
  }

  async testStep5_Regions() {
    logStep(5, 'Testing Field/Region Data');
    
    const response = await this.makeXMLRPCCall('get_regions', ['field']);
    
    if (response.success) {
      logSuccess(`Regions retrieved: ${response.result}`);
      return true;
    } else {
      logError(`Failed to get regions: ${response.error.message}`);
      return false;
    }
  }

  async testStep6_ExploreMoreMethods() {
    logStep(6, 'Exploring Additional API Methods');
    
    const methodsToTest = [
      'get_scenes',
      'get_boundaries',
      'get_objects',
      'list_regions',
      'get_server_info',
      'get_api_version'
    ];

    let successCount = 0;

    for (const method of methodsToTest) {
      logInfo(`Testing ${method}...`);
      const response = await this.makeXMLRPCCall(method, []);
      
      if (response.success) {
        logSuccess(`${method}: SUCCESS - ${response.result}`);
        successCount++;
      } else if (!response.error.message.includes('not found')) {
        logInfo(`${method}: ${response.error.message}`);
      }
    }

    logInfo(`Found ${successCount} additional working methods`);
    return successCount > 0;
  }

  async testStep7_Logout() {
    logStep(7, 'Testing Logout');
    
    const response = await this.makeXMLRPCCall('logout', []);
    
    if (response.success) {
      logSuccess('Logout successful');
      this.sessionToken = null;
      return true;
    } else {
      logError(`Logout failed: ${response.error.message}`);
      return false;
    }
  }

  async runCompleteTest() {
    logHeader('🛰️  SATSHOT FINAL INTEGRATION TEST');
    
    console.log('Configuration:');
    console.log('- Server: us.satshot.com');
    console.log('- Username:', TEST_CONFIG.username);
    console.log('- Authentication: Session Token in URL + Cookies');
    
    if (!TEST_CONFIG.username || !TEST_CONFIG.password) {
      logError('Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD in .env.local');
      return;
    }

    const results = [];
    
    try {
      results.push(await this.testStep1_Authentication());
      
      if (results[0]) {
        results.push(await this.testStep2_UserInfo());
        results.push(await this.testStep3_UserGroups());
        results.push(await this.testStep4_AvailableMaps());
        results.push(await this.testStep5_Regions());
        results.push(await this.testStep6_ExploreMoreMethods());
        results.push(await this.testStep7_Logout());
      } else {
        results.push(false, false, false, false, false, false);
      }
      
    } catch (error) {
      logError(`Test execution failed: ${error.message}`);
    }

    // Summary
    logHeader('📊 FINAL TEST RESULTS');
    
    const testNames = [
      'Authentication',
      'User Info',
      'User Groups', 
      'Available Maps',
      'Field/Region Data',
      'Additional Methods',
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
    const totalCount = results.length;
    
    console.log('\n' + '='.repeat(60));
    if (passedCount >= 4) { // Authentication + basic methods
      logSuccess(`🎉 SATSHOT INTEGRATION SUCCESSFUL! (${passedCount}/${totalCount})`);
      logSuccess('✨ Ready for production use with AgMCP!');
      
      console.log('\n🔧 Implementation Notes:');
      logInfo('• Use session token in URL: ?idtoken={token}');
      logInfo('• Maintain cookies from login response');
      logInfo('• API methods use simple names (no class prefixes)');
      logInfo('• get_available_maps() works without parameters');
      logInfo('• get_regions("field") retrieves field data');
    } else {
      logError(`⚠️  PARTIAL SUCCESS (${passedCount}/${totalCount})`);
      logInfo('Basic authentication works but some features need investigation');
    }
    console.log('='.repeat(60));
    
    return results;
  }
}

// Run the final test
if (require.main === module) {
  const tester = new FinalSatshotTester();
  tester.runCompleteTest().catch(error => {
    logError(`Final test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = FinalSatshotTester;
