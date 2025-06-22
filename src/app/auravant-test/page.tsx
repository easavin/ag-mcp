'use client';

import React, { useState } from 'react';
import AuravantConnectionHelper from '@/components/AuravantConnectionHelper';

export default function AuravantTestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testAuravantAPI = async (endpoint: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auravant/${endpoint}`);
      const data = await response.json();
      
      setTestResults({
        endpoint,
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResults({
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <img 
          src="/assets/logos/auravant-logo.png" 
          alt="Auravant" 
          style={{ width: '40px', height: '40px', borderRadius: '4px' }}
        />
        <h1 style={{ margin: 0 }}>Auravant Integration Test</h1>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Connection Status</h2>
        <AuravantConnectionHelper />
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>API Tests</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button 
            onClick={() => testAuravantAPI('fields')}
            disabled={isLoading}
            style={{
              padding: '10px 15px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Fields
          </button>
          
          <button 
            onClick={() => testAuravantAPI('labour?yeargroup=2024')}
            disabled={isLoading}
            style={{
              padding: '10px 15px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Labour (2024)
          </button>
          
          <button 
            onClick={() => testAuravantAPI('livestock')}
            disabled={isLoading}
            style={{
              padding: '10px 15px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Livestock
          </button>
          
          <button 
            onClick={() => testAuravantAPI('work-orders')}
            disabled={isLoading}
            style={{
              padding: '10px 15px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Work Orders
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '5px',
          textAlign: 'center'
        }}>
          Loading...
        </div>
      )}

      {testResults && !isLoading && (
        <div style={{ marginTop: '20px' }}>
          <h2>Test Results</h2>
          <div style={{
            padding: '15px',
            backgroundColor: testResults.success ? '#d1fae5' : '#fef2f2',
            border: `1px solid ${testResults.success ? '#10b981' : '#ef4444'}`,
            borderRadius: '5px'
          }}>
            <h3>Endpoint: {testResults.endpoint}</h3>
            <p><strong>Status:</strong> {testResults.success ? '✅ Success' : '❌ Failed'}</p>
            <p><strong>Timestamp:</strong> {testResults.timestamp}</p>
            
            {testResults.error && (
              <div>
                <strong>Error:</strong>
                <pre style={{ 
                  backgroundColor: '#fee2e2', 
                  padding: '10px', 
                  borderRadius: '3px',
                  overflow: 'auto',
                  fontSize: '14px'
                }}>
                  {testResults.error}
                </pre>
              </div>
            )}
            
            {testResults.data && (
              <div>
                <strong>Response Data:</strong>
                <pre style={{ 
                  backgroundColor: '#f9fafb', 
                  padding: '10px', 
                  borderRadius: '3px',
                  overflow: 'auto',
                  fontSize: '12px',
                  maxHeight: '300px'
                }}>
                  {JSON.stringify(testResults.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '5px' }}>
        <h2>Instructions</h2>
        <ol>
          <li>First, connect your Auravant account using the connection helper above</li>
          <li>Once connected, test the different API endpoints using the buttons</li>
          <li>Check the response data to verify the integration is working</li>
        </ol>
        
        <h3>Note:</h3>
        <p>You'll need a valid Auravant developer token to test this integration. Get one by:</p>
        <ol>
          <li>Logging into your Auravant account</li>
          <li>Applying for developer status in Settings</li>
          <li>Creating an Extension in the Developer Space</li>
          <li>Generating a test token</li>
        </ol>
      </div>
    </div>
  );
} 