// Jest setup for regression tests (Node environment)

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'

// Add fetch polyfill for Node.js
global.fetch = require('node-fetch')

// Set longer timeout for API tests
jest.setTimeout(30000)

// Clean up after each test
afterEach(() => {
  // No mocks to clear in regression tests
}) 