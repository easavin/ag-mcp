#!/usr/bin/env node

// Test session token handling with direct XML-RPC calls

const xmlrpc = require('xmlrpc');

console.log('🔍 TESTING SATSHOT SESSION TOKEN HANDLING\n');

async function testSessionFlow() {
  const client = xmlrpc.createSecureClient('https://us.satshot.com/xmlrpc.php');
  
  try {
    // Step 1: Login and get session token
    console.log('1. Logging in...');
    const sessionToken = await new Promise((resolve, reject) => {
      client.methodCall('login', ['evgenys', 'Satshot25API'], (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    
    console.log('✅ Login successful. Session token:', sessionToken);
    
    // Step 2: Try get_available_maps with session token as first parameter
    console.log('\n2. Testing get_available_maps with session token as first parameter...');
    try {
      const maps = await new Promise((resolve, reject) => {
        client.methodCall('get_available_maps', [sessionToken, 10, 'all'], (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
      
      console.log('✅ Maps retrieved successfully:', JSON.stringify(maps, null, 2));
      
    } catch (error) {
      console.log('❌ Maps call failed:', error.faultString || error.message);
      
      // Step 3: Try without session token (to compare)
      console.log('\n3. Testing get_available_maps WITHOUT session token...');
      try {
        const maps2 = await new Promise((resolve, reject) => {
          client.methodCall('get_available_maps', [10, 'all'], (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
        
        console.log('✅ Maps without token:', JSON.stringify(maps2, null, 2));
        
      } catch (error2) {
        console.log('❌ Maps without token failed:', error2.faultString || error2.message);
      }
      
      // Step 4: Try get_my_user_info with session token
      console.log('\n4. Testing get_my_user_info with session token...');
      try {
        const userInfo = await new Promise((resolve, reject) => {
          client.methodCall('get_my_user_info', [sessionToken], (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
        
        console.log('✅ User info:', JSON.stringify(userInfo, null, 2));
        
      } catch (error3) {
        console.log('❌ User info failed:', error3.faultString || error3.message);
      }
    }
    
  } catch (loginError) {
    console.log('❌ Login failed:', loginError.faultString || loginError.message);
  }
}

testSessionFlow();
