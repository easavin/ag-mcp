#!/usr/bin/env node

// Show raw HTTP request and response for Satshot support

const xmlrpc = require('xmlrpc');
const https = require('https');

console.log('📤 RAW SATSHOT XML-RPC REQUEST & RESPONSE\n');

// Intercept HTTPS to show raw data
const originalHttpsRequest = https.request;

let requestData = '';
let responseData = '';

https.request = function(options, callback) {
  console.log('🔗 REQUEST URL:', `${options.protocol || 'https:'}//${options.host}${options.path || options.pathname || '/'}`);
  console.log('🔗 REQUEST METHOD:', options.method || 'GET');
  console.log('🔗 REQUEST HEADERS:');
  Object.entries(options.headers || {}).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  
  const req = originalHttpsRequest.call(this, options, (res) => {
    console.log('\n📨 RESPONSE STATUS:', res.statusCode, res.statusMessage);
    console.log('📨 RESPONSE HEADERS:');
    Object.entries(res.headers || {}).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    let responseBody = '';
    res.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    res.on('end', () => {
      console.log('\n📨 RESPONSE BODY:');
      console.log(responseBody);
      console.log('\n' + '='.repeat(80));
    });
    
    if (callback) callback(res);
  });
  
  const originalWrite = req.write;
  req.write = function(data) {
    console.log('\n📤 REQUEST BODY:');
    console.log(data);
    return originalWrite.call(this, data);
  };
  
  return req;
};

async function showRawLoginRequest() {
  console.log('Testing login with:');
  console.log('- Username: evgenys');
  console.log('- Password: Satshot25%API');
  console.log('\n' + '='.repeat(80));
  
  const client = xmlrpc.createSecureClient('https://us.satshot.com/xmlrpc.php');
  
  try {
    const result = await new Promise((resolve, reject) => {
      client.methodCall('login', ['evgenys', 'Satshot25%API'], (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    
    console.log('✅ SUCCESS:', result);
    
  } catch (error) {
    console.log('❌ ERROR:', error.faultString || error.message);
  }
}

showRawLoginRequest();
