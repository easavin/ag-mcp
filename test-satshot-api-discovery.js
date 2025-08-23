#!/usr/bin/env node

// Deep dive into Satshot API to discover working methods
require('dotenv').config({ path: '.env.local' });
const xmlrpc = require('xmlrpc');

const TEST_CONFIG = {
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

class SatshotAPIDiscovery {
  constructor() {
    this.client = xmlrpc.createSecureClient(TEST_CONFIG.serverUrl);
    this.sessionToken = null;
  }

  async makeAPICall(method, params = [], clientToUse = null) {
    return new Promise((resolve) => {
      const client = clientToUse || this.client;
      
      client.methodCall(method, params, (error, value) => {
        if (error) {
          resolve({
            success: false,
            error: {
              code: error.faultCode || -1,
              message: error.faultString || error.message || 'Unknown error'
            }
          });
        } else {
          resolve({
            success: true,
            result: value
          });
        }
      });
    });
  }

  async testSessionTokenFormats() {
    log('\n🔍 TESTING SESSION TOKEN FORMATS', colors.bright + colors.yellow);
    
    // Get session token
    const loginResponse = await this.makeAPICall('login', [
      TEST_CONFIG.credentials.username,
      TEST_CONFIG.credentials.password
    ]);

    if (!loginResponse.success) {
      logError(`Login failed: ${loginResponse.error.message}`);
      return false;
    }

    this.sessionToken = loginResponse.result;
    logInfo(`Raw session token: ${JSON.stringify(this.sessionToken)}`);
    logInfo(`Token type: ${typeof this.sessionToken}`);
    logInfo(`Token length: ${this.sessionToken ? this.sessionToken.length : 'N/A'}`);

    // Test different URL token formats
    const tokenFormats = [
      `?idtoken=${this.sessionToken}`,
      `?sessionId=${this.sessionToken}`,
      `?token=${this.sessionToken}`,
      `?session=${this.sessionToken}`,
      `?auth=${this.sessionToken}`,
      `?id=${this.sessionToken}`,
      `?sid=${this.sessionToken}`
    ];

    for (const format of tokenFormats) {
      logInfo(`Testing token format: ${format.substring(0, 30)}...`);
      const urlWithToken = `${TEST_CONFIG.serverUrl}${format}`;
      const testClient = xmlrpc.createSecureClient(urlWithToken);
      
      const response = await this.makeAPICall('get_my_user_info', [], testClient);
      
      if (response.success) {
        logSuccess(`Format ${format.split('=')[0]} WORKS!`);
        return true;
      } else if (!response.error.message.includes('not logged in')) {
        logInfo(`  Different error: ${response.error.message}`);
      }
    }

    return false;
  }

  async testKnownSatshotMethods() {
    log('\n🔍 TESTING KNOWN SATSHOT METHODS FROM DOCUMENTATION', colors.bright + colors.yellow);
    
    // Methods from the actual Satshot API documentation
    const knownMethods = [
      // Core API methods
      'get_my_user_info',
      'core_api.get_my_user_info',
      'mapcenter_api.get_my_user_info',
      
      // Map context methods
      'core_api.create_map_context',
      'core_api.load_map_context',
      'core_api.get_map_context_info',
      
      // Scene and display methods
      'core_api.display_scene',
      'core_api.get_displayed_scene',
      'core_api.clear_displayed_scene',
      
      // Mapcenter API methods
      'mapcenter_api.get_visible_groups',
      'mapcenter_api.create_user',
      'mapcenter_api.create_group',
      'mapcenter_api.get_regions',
      'mapcenter_api.create_region',
      'mapcenter_api.get_scenes',
      'mapcenter_api.analyze_scene',
      
      // CLU (Common Land Unit) methods
      'clu_mapcenter_api.get_clu_boundaries',
      'clu_mapcenter_api.search_clus',
      
      // System methods that might work
      'get_server_capabilities',
      'get_api_version',
      'ping'
    ];

    // Test with no authentication first
    logInfo('Testing methods without authentication...');
    for (const method of knownMethods.slice(0, 5)) {
      const response = await this.makeAPICall(method, []);
      if (response.success) {
        logSuccess(`${method}: No auth required!`);
      } else if (!response.error.message.includes('not logged in') && 
                 !response.error.message.includes('not found')) {
        logInfo(`${method}: Different response - ${response.error.message}`);
      }
    }

    // Test with session token (even though previous tests failed)
    if (this.sessionToken) {
      logInfo('\nTesting methods with session token in URL...');
      const urlWithToken = `${TEST_CONFIG.serverUrl}?idtoken=${this.sessionToken}`;
      const authClient = xmlrpc.createSecureClient(urlWithToken);
      
      for (const method of knownMethods) {
        const response = await this.makeAPICall(method, [], authClient);
        if (response.success) {
          logSuccess(`${method}: SUCCESS with session token!`);
          console.log(`  Result: ${JSON.stringify(response.result).substring(0, 200)}...`);
        } else if (response.error.message.includes('invalid method parameters')) {
          logInfo(`${method}: Method exists but needs parameters`);
        } else if (response.error.message.includes('permission denied')) {
          logInfo(`${method}: Method exists but permission denied`);
        }
      }
    }

    return false;
  }

  async testWithDifferentParameters() {
    log('\n🔍 TESTING METHODS WITH DIFFERENT PARAMETERS', colors.bright + colors.yellow);
    
    if (!this.sessionToken) return false;
    
    const urlWithToken = `${TEST_CONFIG.serverUrl}?idtoken=${this.sessionToken}`;
    const authClient = xmlrpc.createSecureClient(urlWithToken);

    // Test methods that gave "invalid method parameters" with different param combinations
    const paramTests = [
      { method: 'core_api.create_map_context', params: [] },
      { method: 'core_api.create_map_context', params: [{}] },
      { method: 'core_api.create_map_context', params: ['test_map'] },
      { method: 'core_api.create_map_context', params: [{ name: 'test' }] },
      
      { method: 'mapcenter_api.get_regions', params: [] },
      { method: 'mapcenter_api.get_regions', params: ['field'] },
      { method: 'mapcenter_api.get_regions', params: [{ type: 'field' }] },
      
      { method: 'mapcenter_api.get_visible_groups', params: [] },
      { method: 'mapcenter_api.get_visible_groups', params: [{}] }
    ];

    for (const test of paramTests) {
      logInfo(`Testing ${test.method} with params: ${JSON.stringify(test.params)}`);
      const response = await this.makeAPICall(test.method, test.params, authClient);
      
      if (response.success) {
        logSuccess(`${test.method} SUCCESS!`);
        console.log(`  Result: ${JSON.stringify(response.result, null, 2)}`);
        return true;
      } else {
        const msg = response.error.message;
        if (msg.includes('invalid method parameters')) {
          console.log(`    Still needs different parameters`);
        } else if (msg.includes('permission')) {
          console.log(`    Permission issue: ${msg}`);
        } else if (!msg.includes('not logged in') && !msg.includes('not found')) {
          console.log(`    Different error: ${msg}`);
        }
      }
    }

    return false;
  }

  async testCookieBasedAuthentication() {
    log('\n🔍 TESTING COOKIE-BASED AUTHENTICATION', colors.bright + colors.yellow);
    
    // Try to maintain session via cookies instead of URL token
    const request = require('https');
    const { URL } = require('url');
    
    return new Promise((resolve) => {
      logInfo('Attempting login with cookie capture...');
      
      // Create XML-RPC login request
      const loginXML = `<?xml version="1.0"?>
<methodCall>
  <methodName>login</methodName>
  <params>
    <param><value><string>${TEST_CONFIG.credentials.username}</string></value></param>
    <param><value><string>${TEST_CONFIG.credentials.password}</string></value></param>
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
          'Content-Length': Buffer.byteLength(loginXML),
          'User-Agent': 'NodeJS XML-RPC Client'
        }
      };

      const req = request.request(options, (res) => {
        let data = '';
        const cookies = res.headers['set-cookie'];
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          logInfo(`Response status: ${res.statusCode}`);
          if (cookies) {
            logInfo(`Cookies received: ${cookies.join('; ')}`);
            logSuccess('Server supports cookies! This might be the answer.');
          } else {
            logInfo('No cookies in response');
          }
          resolve(!!cookies);
        });
      });

      req.on('error', (error) => {
        logError(`Cookie test failed: ${error.message}`);
        resolve(false);
      });

      req.write(loginXML);
      req.end();
    });
  }

  async runDiscovery() {
    log('\n' + '='.repeat(80), colors.bright + colors.blue);
    log('🔍 SATSHOT API DISCOVERY & DEBUGGING', colors.bright + colors.blue);
    log('='.repeat(80), colors.bright + colors.blue);

    if (!TEST_CONFIG.credentials.username || !TEST_CONFIG.credentials.password) {
      logError('Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD in .env.local');
      return;
    }

    console.log('Starting deep API investigation...\n');

    const tests = [
      { name: 'Session Token Formats', test: () => this.testSessionTokenFormats() },
      { name: 'Known Satshot Methods', test: () => this.testKnownSatshotMethods() },
      { name: 'Different Parameters', test: () => this.testWithDifferentParameters() },
      { name: 'Cookie Authentication', test: () => this.testCookieBasedAuthentication() }
    ];

    const results = [];

    for (const test of tests) {
      try {
        const result = await test.test();
        results.push({ name: test.name, success: result });
      } catch (error) {
        logError(`${test.name} failed: ${error.message}`);
        results.push({ name: test.name, success: false });
      }
    }

    // Summary
    log('\n' + '='.repeat(80), colors.bright + colors.blue);
    log('📊 DISCOVERY RESULTS', colors.bright + colors.blue);
    log('='.repeat(80), colors.bright + colors.blue);

    results.forEach(result => {
      if (result.success) {
        logSuccess(`${result.name}: Found working approach! ✨`);
      } else {
        logError(`${result.name}: No success`);
      }
    });

    const workingApproaches = results.filter(r => r.success);
    
    if (workingApproaches.length === 0) {
      log('\n🤔 ANALYSIS:', colors.bright + colors.yellow);
      logInfo('The login works but no subsequent methods succeed.');
      logInfo('This suggests either:');
      logInfo('1. Account lacks permissions for basic methods');
      logInfo('2. Session management requires cookies (most likely)');
      logInfo('3. API method names are completely different than expected');
      logInfo('4. There is a missing authentication step after login');
    } else {
      logSuccess(`\n🎉 Found working approach(es)!`);
    }

    return results;
  }
}

// Run the discovery
if (require.main === module) {
  const discovery = new SatshotAPIDiscovery();
  discovery.runDiscovery().catch(error => {
    logError(`Discovery failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = SatshotAPIDiscovery;
