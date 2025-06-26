#!/usr/bin/env node

/**
 * Test script for Auravant Extension authentication
 * 
 * This script tests:
 * 1. Extension configuration
 * 2. Token generation from Extension credentials
 * 3. API connection validation
 * 4. Extension user listing (if available)
 */

const { spawn } = require('child_process');

async function testExtensionAuth() {
  console.log('🧪 Testing Auravant Extension Authentication\n');

  // Test 1: Check if environment variables are set
  console.log('1️⃣ Checking Extension environment variables...');
  const extensionId = process.env.AURAVANT_EXTENSION_ID;
  const extensionSecret = process.env.AURAVANT_EXTENSION_SECRET;
  
  if (!extensionId || !extensionSecret) {
    console.log('❌ Extension environment variables not set:');
    console.log(`   - AURAVANT_EXTENSION_ID: ${extensionId ? '✅ Set' : '❌ Not set'}`);
    console.log(`   - AURAVANT_EXTENSION_SECRET: ${extensionSecret ? '✅ Set' : '❌ Not set'}`);
    console.log('\n💡 Please set these environment variables in your .env file:');
    console.log('   AURAVANT_EXTENSION_ID=your_extension_id');
    console.log('   AURAVANT_EXTENSION_SECRET=your_extension_secret\n');
    return false;
  }
  
  console.log('✅ Extension environment variables are set');
  console.log(`   - Extension ID: ${extensionId}`);
  console.log(`   - Extension Secret: ${extensionSecret.substring(0, 8)}...\n`);

  // Test 2: Test direct Extension token generation
  console.log('2️⃣ Testing direct Extension token generation...');
  try {
    const response = await fetch('https://api.auravant.com/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        extension_id: extensionId,
        secret: extensionSecret
      })
    });

    if (!response.ok) {
      console.log(`❌ Extension token generation failed: HTTP ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
      return false;
    }

    const data = await response.json();
    
    if (data.code !== undefined && data.code !== 0) {
      console.log(`❌ Extension token generation failed: ${data.msg || 'Unknown error'}`);
      return false;
    }

    const token = data.token || data.access_token || data.bearer_token;
    if (!token) {
      console.log('❌ No token received from Extension authentication');
      return false;
    }

    console.log('✅ Extension token generation successful');
    console.log(`   - Token: ${token.substring(0, 20)}...\n`);

    // Test 3: Validate token by testing API call
    console.log('3️⃣ Testing Extension token validation...');
    const testResponse = await fetch('https://api.auravant.com/api/fields', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!testResponse.ok) {
      console.log(`❌ Extension token validation failed: HTTP ${testResponse.status}`);
      const errorText = await testResponse.text();
      console.log(`   Error: ${errorText}`);
      return false;
    }

    const testData = await testResponse.json();
    console.log('✅ Extension token validation successful');
    console.log(`   - API Response: ${JSON.stringify(testData).substring(0, 100)}...\n`);

  } catch (error) {
    console.log('❌ Extension token generation failed:', error.message);
    return false;
  }

  // Test 4: Test Extension users listing (if available)
  console.log('4️⃣ Testing Extension users listing...');
  try {
    const response = await fetch('https://api.auravant.com/api/auth/extension/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Extension ${extensionId}:${extensionSecret}`
      }
    });

    if (!response.ok) {
      console.log(`⚠️  Extension users listing not available: HTTP ${response.status}`);
      console.log('   This is normal if no users have installed your Extension yet.');
    } else {
      const data = await response.json();
      console.log('✅ Extension users listing successful');
      console.log(`   - Users: ${data.users?.length || 0}`);
      if (data.users?.length > 0) {
        console.log(`   - User details: ${JSON.stringify(data.users).substring(0, 100)}...`);
      }
    }
  } catch (error) {
    console.log('⚠️  Extension users listing failed:', error.message);
    console.log('   This is normal if the endpoint is not available yet.');
  }

  console.log('\n🎉 Extension authentication tests completed successfully!');
  console.log('\n📋 Extension is ready for production use:');
  console.log('   1. ✅ Environment variables configured');
  console.log('   2. ✅ Extension token generation working');
  console.log('   3. ✅ API access validated');
  console.log('   4. 🔗 Ready for user installations');
  
  console.log('\n🚀 Next steps:');
  console.log('   1. Users can now connect via Extension method in the UI');
  console.log('   2. Extension provides better security and UX than Bearer tokens');
  console.log('   3. Share your Extension with users for installation');
  console.log('   4. Users who install your Extension will be auto-connected');
  
  return true;
}

// Check if we need to authenticate first
async function checkAuth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (!response.ok) {
      console.log('⚠️  Server not running. Some tests will be skipped.');
      console.log('   To test full integration, start the server with: npm run dev');
      return false;
    }
    return true;
  } catch (error) {
    console.log('⚠️  Cannot connect to local server. Some tests will be skipped.');
    console.log('   To test full integration, start the server with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 Auravant Extension Authentication Test\n');
  
  // Check if server is running (optional for this test)
  const serverRunning = await checkAuth();
  if (!serverRunning) {
    console.log('   Continuing with Extension-only tests...\n');
  }

  // Run tests
  const success = await testExtensionAuth();
  
  if (success) {
    console.log('\n✅ All tests passed! Extension authentication is ready.');
    
    if (serverRunning) {
      console.log('\n🌐 Server Integration Tests:');
      console.log('   Visit: http://localhost:3000');
      console.log('   Try connecting via Extension method in the UI');
    }
    
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the configuration.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { testExtensionAuth }; 