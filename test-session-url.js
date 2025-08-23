#!/usr/bin/env node

// Test session token as URL parameter

const xmlrpc = require('xmlrpc');

console.log('🔍 TESTING SATSHOT SESSION TOKEN AS URL PARAMETER\n');

async function testSessionURL() {
  const baseClient = xmlrpc.createSecureClient('https://us.satshot.com/xmlrpc.php');
  
  try {
    // Step 1: Login and get session token
    console.log('1. Logging in...');
    const sessionToken = await new Promise((resolve, reject) => {
      baseClient.methodCall('login', ['evgenys', 'Satshot25API'], (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    
    console.log('✅ Login successful. Session token:', sessionToken);
    
    // Step 2: Create new client with session token in URL
    console.log('\n2. Testing with session token in URL...');
    const urlWithSession = `https://us.satshot.com/xmlrpc.php?idtoken=${sessionToken}`;
    console.log('URL:', urlWithSession);
    
    const sessionClient = xmlrpc.createSecureClient(urlWithSession);
    
    try {
      const maps = await new Promise((resolve, reject) => {
        sessionClient.methodCall('get_available_maps', [10, 'all'], (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
      
      console.log('✅ Maps with URL session:', JSON.stringify(maps, null, 2));
      
    } catch (error) {
      console.log('❌ Maps with URL session failed:', error.faultString || error.message);
      
      // Step 3: Try get_my_user_info with URL session
      console.log('\n3. Testing get_my_user_info with URL session...');
      try {
        const userInfo = await new Promise((resolve, reject) => {
          sessionClient.methodCall('get_my_user_info', [], (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
        
        console.log('✅ User info with URL session:', JSON.stringify(userInfo, null, 2));
        
      } catch (error2) {
        console.log('❌ User info with URL session failed:', error2.faultString || error2.message);
      }
    }
    
  } catch (loginError) {
    console.log('❌ Login failed:', loginError.faultString || loginError.message);
  }
}

testSessionURL();
