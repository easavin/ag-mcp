#!/usr/bin/env node

// Test get_my_user_info via our API
const https = require('https');

console.log('🔧 Testing get_my_user_info via Satshot API...\n');

async function testUserInfoAPI() {
  try {
    // First, let's call our connection test to see what's happening
    console.log('1. Testing Satshot connection tool...');
    
    const response = await fetch('http://localhost:3000/api/satshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'test_satshot_connection',
        authenticate: true
      })
    });
    
    const result = await response.json();
    console.log('Connection test result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n2. Server is responding correctly');
      console.log('Authentication details:', result.data?.authentication);
    } else {
      console.log('\n❌ Connection test failed');
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Let's also test the XML-RPC client directly with `get_my_user_info`
async function testGetMyUserInfoDirect() {
  console.log('\n🧪 Testing get_my_user_info directly...\n');
  
  const xmlrpc = require('xmlrpc');
  const client = xmlrpc.createSecureClient('https://us.satshot.com/xmlrpc.php');
  
  // Test available methods first
  const methods = [
    'get_my_user_info',
    'mapcenter_api.get_my_user_info', 
    'core_api.get_my_user_info',
    'system.listMethods'
  ];
  
  for (const method of methods) {
    try {
      console.log(`Testing method: ${method}`);
      
      const result = await new Promise((resolve, reject) => {
        client.methodCall(method, [], (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
      
      console.log(`✅ ${method} result:`, JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.log(`❌ ${method} failed: ${error.faultString || error.message}`);
    }
  }
}

// Run both tests
async function runTests() {
  await testUserInfoAPI();
  await testGetMyUserInfoDirect();
}

runTests().catch(console.error);
