#!/usr/bin/env node

// Test simple authenticated call in same session

const xmlrpc = require('xmlrpc');

console.log('🔍 TESTING AUTHENTICATED CALL IN SAME CLIENT\n');

async function testSameClientAuth() {
  const client = xmlrpc.createSecureClient('https://us.satshot.com/xmlrpc.php');
  
  try {
    // Step 1: Login 
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
    
    // Step 2: Immediately call get_my_user_info (no session token)
    console.log('\n2. Testing get_my_user_info immediately after login...');
    try {
      const userInfo = await new Promise((resolve, reject) => {
        client.methodCall('get_my_user_info', [], (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
      
      console.log('✅ User info after login:', JSON.stringify(userInfo, null, 2));
      
      // Step 3: Test get_available_maps immediately after login
      console.log('\n3. Testing get_available_maps immediately after login...');
      try {
        const maps = await new Promise((resolve, reject) => {
          client.methodCall('get_available_maps', [], (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
        
        console.log('✅ Maps after login:', JSON.stringify(maps, null, 2));
        
      } catch (mapsError) {
        console.log('❌ Maps after login failed:', mapsError.faultString || mapsError.message);
        console.log('Let\'s try a different method...');
        
        // Step 4: Try load_maps 
        console.log('\n4. Testing load_maps...');
        try {
          const loadMaps = await new Promise((resolve, reject) => {
            client.methodCall('load_maps', [], (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            });
          });
          
          console.log('✅ load_maps result:', JSON.stringify(loadMaps, null, 2));
          
        } catch (loadError) {
          console.log('❌ load_maps failed:', loadError.faultString || loadError.message);
        }
      }
      
    } catch (userError) {
      console.log('❌ User info failed:', userError.faultString || userError.message);
    }
    
  } catch (loginError) {
    console.log('❌ Login failed:', loginError.faultString || loginError.message);
  }
}

testSameClientAuth();
