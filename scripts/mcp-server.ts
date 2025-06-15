#!/usr/bin/env tsx

import { createAgMCPServer } from '../src/lib/mcp-server'

async function main() {
  const userId = process.argv[2] || 'user_placeholder'
  
  console.log(`Starting Ag MCP Server for user: ${userId}`)
  
  try {
    const server = createAgMCPServer(userId)
    await server.start()
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
  }
}

main().catch(console.error) 