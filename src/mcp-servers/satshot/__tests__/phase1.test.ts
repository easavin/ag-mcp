// Phase 1 Tests: Database Schema, XML-RPC Client, Authentication

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { SatshotXMLRPCClient } from '../client'
import { SatshotAuth } from '../auth'
import { SATSHOT_SERVERS } from '../types'

describe('Satshot Phase 1 - Foundation', () => {
  describe('Configuration', () => {
    test('should have valid server URLs', () => {
      expect(SATSHOT_SERVERS.us).toBe('https://us.satshot.com/xmlrpc.php')
      expect(SATSHOT_SERVERS.ca).toBe('https://ca.satshot.com/xmlrpc.php')
      expect(SATSHOT_SERVERS.mexico).toBe('https://mexico.satshot.com/xmlrpc.php')
    })
  })

  describe('SatshotXMLRPCClient', () => {
    let client: SatshotXMLRPCClient

    beforeEach(() => {
      const config = {
        username: 'test_user',
        password: 'test_pass',
        server: 'us' as const,
        baseUrl: SATSHOT_SERVERS.us
      }
      client = new SatshotXMLRPCClient(config)
    })

    afterEach(async () => {
      if (client) {
        await client.cleanup()
      }
    })

    test('should initialize client', () => {
      expect(client).toBeDefined()
      expect(client.isSessionValid()).toBe(false)
    })

    test('should handle session management', () => {
      expect(client.getSession()).toBeNull()
      
      const mockSession = {
        sessionToken: 'test-token',
        server: 'us',
        username: 'test_user'
      }
      
      client.setSession(mockSession)
      expect(client.getSession()).toEqual(mockSession)
      expect(client.isSessionValid()).toBe(true)
    })

    // Skip actual network tests in CI environment
    test.skip('should test connection to server', async () => {
      const result = await client.testConnection()
      expect(typeof result).toBe('boolean')
    }, 30000)
  })

  describe('SatshotAuth', () => {
    let auth: SatshotAuth

    beforeEach(() => {
      auth = new SatshotAuth()
    })

    afterEach(async () => {
      if (auth) {
        await auth.cleanup()
      }
    })

    test('should initialize authentication', () => {
      expect(auth).toBeDefined()
      
      const status = auth.getAuthStatus()
      expect(status.authenticated).toBe(false)
      expect(status.server).toBe('us') // Default server
      expect(status.sessionValid).toBe(false)
    })

    test('should handle server switching', () => {
      const initialServer = auth.getServerInfo()
      expect(initialServer.server).toBe('us')
      
      auth.switchServer('ca')
      
      const newServer = auth.getServerInfo()
      expect(newServer.server).toBe('ca')
      expect(newServer.url).toBe(SATSHOT_SERVERS.ca)
      expect(newServer.connected).toBe(false)
    })

    test('should validate server options', () => {
      const servers = auth.getAvailableServers()
      expect(servers).toContain('us')
      expect(servers).toContain('ca')
      expect(servers).toContain('mexico')
    })

    test('should handle invalid server', () => {
      expect(() => {
        auth.switchServer('invalid' as any)
      }).toThrow('Invalid Satshot server: invalid')
    })

    test('should check credentials configuration', () => {
      const hasCredentials = auth.hasCredentials()
      // Will be false in test environment without env vars
      expect(typeof hasCredentials).toBe('boolean')
    })

    // Skip actual authentication tests in CI environment
    test.skip('should authenticate with valid credentials', async () => {
      // This would require actual Satshot credentials
      const result = await auth.authenticate()
      expect(typeof result).toBe('boolean')
    }, 30000)
  })

  describe('Database Schema', () => {
    test('should have valid Prisma schema for SatshotToken', () => {
      // Test that the schema file contains SatshotToken model
      const fs = require('fs')
      const path = require('path')
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
      const schemaContent = fs.readFileSync(schemaPath, 'utf8')
      
      expect(schemaContent).toContain('model SatshotToken')
      expect(schemaContent).toContain('sessionToken String')
      expect(schemaContent).toContain('server       String   @default("us")')
    })

    test('should have satshotConnected field in User model', () => {
      // Test that User model has the satshotConnected field
      const fs = require('fs')
      const path = require('path')
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
      const schemaContent = fs.readFileSync(schemaPath, 'utf8')
      
      expect(schemaContent).toContain('satshotConnected  Boolean   @default(false)')
      expect(schemaContent).toContain('satshotToken      SatshotToken?')
    })
  })

  describe('Error Handling', () => {
    test('should handle missing configuration gracefully', () => {
      const auth = new SatshotAuth()
      const status = auth.getAuthStatus()
      
      expect(status).toHaveProperty('authenticated')
      expect(status).toHaveProperty('server')
      expect(status).toHaveProperty('sessionValid')
      expect(status).toHaveProperty('hasCredentials')
    })

    test('should handle client creation with invalid config', () => {
      const config = {
        username: '',
        password: '',
        server: 'us' as const,
        baseUrl: 'invalid-url'
      }
      
      // Should not throw during construction
      expect(() => {
        new SatshotXMLRPCClient(config)
      }).not.toThrow()
    })
  })
})
