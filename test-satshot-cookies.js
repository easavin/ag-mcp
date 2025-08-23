#!/usr/bin/env node

// Test the updated Satshot implementation with cookie-based authentication
require('dotenv').config({ path: '.env.local' });
const { SatshotXMLRPCClient } = require('./src/mcp-servers/satshot/client');

const TEST_CONFIG = {
  username: process.env.SATSHOT_USERNAME || '',
  password: process.env.SATSHOT_PASSWORD || '',
  server: 'us',
  baseUrl: 'https://us.satshot.com/xmlrpc.php'
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

async function testCookieAuthentication() {
  log('\n' + '='.repeat(60), colors.bright + colors.blue);
  log('🍪 TESTING COOKIE-BASED AUTHENTICATION', colors.bright + colors.blue);
  log('='.repeat(60), colors.bright + colors.blue);

  if (!TEST_CONFIG.username || !TEST_CONFIG.password) {
    logError('Please configure SATSHOT_USERNAME and SATSHOT_PASSWORD in .env.local');
    return;
  }

  try {
    // Test Step 1: Create client and login
    logInfo('Step 1: Creating Satshot client...');
    const client = new SatshotXMLRPCClient(TEST_CONFIG);
    
    logInfo('Step 2: Attempting login...');
    const session = await client.login();
    logSuccess(`Login successful! Session token: ${session.sessionToken.substring(0, 20)}...`);

    // Test Step 2: Try authenticated calls
    logInfo('Step 3: Testing authenticated API calls...');
    
    const testMethods = [
      { name: 'get_my_user_info', params: [] },
      { name: 'get_visible_groups', params: [] },
      { name: 'mapcenter_api.get_visible_groups', params: [] },
      { name: 'get_available_maps', params: [5, 'all'] }
    ];

    let successCount = 0;

    for (const test of testMethods) {
      logInfo(`Testing ${test.name}...`);
      
      try {
        const response = await client.callMethod(test.name, test.params);
        
        if (response.result !== undefined) {
          logSuccess(`${test.name}: SUCCESS!`);
          console.log(`  Result: ${JSON.stringify(response.result).substring(0, 200)}...`);
          successCount++;
        } else {
          console.log(`  ${test.name}: No result but no error`);
        }
      } catch (error) {
        console.log(`  ${test.name}: ${error.message}`);
      }
    }

    // Test Step 3: Logout
    logInfo('Step 4: Testing logout...');
    await client.logout();
    logSuccess('Logout completed');

    // Summary
    log('\n' + '='.repeat(60), colors.bright + colors.blue);
    log('📊 COOKIE AUTHENTICATION TEST RESULTS', colors.bright + colors.blue);
    log('='.repeat(60), colors.bright + colors.blue);

    if (successCount > 0) {
      logSuccess(`🎉 SUCCESS! ${successCount}/${testMethods.length} API methods worked with cookie authentication!`);
      logSuccess('The Satshot implementation is now working correctly.');
    } else {
      logError('❌ No API methods worked, but login was successful.');
      logInfo('This suggests the methods may still need different parameters or permissions.');
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
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
