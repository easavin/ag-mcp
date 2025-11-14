import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { registerProgressStream, unregisterProgressStream } from '@/lib/progress-stream'

export async function GET(request: NextRequest) {
  console.log('🔄 Starting progress stream endpoint')
  
  // Get current authenticated user
  const authUser = await getCurrentUser(request)
  if (!authUser) {
    return new Response('Authentication required', { status: 401 })
  }

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  
  if (!sessionId) {
    return new Response('Session ID required', { status: 400 })
  }

  console.log(`📡 Setting up SSE stream for session: ${sessionId}`)

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      console.log(`🎯 SSE stream started for session: ${sessionId}`)
      
      // Store the controller so we can write to it from other parts of the app
      const writer = controller
      registerProgressStream(sessionId, writer as any)
      
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connection',
        message: 'Progress stream connected',
        timestamp: new Date().toISOString()
      })
      
      controller.enqueue(`data: ${data}\n\n`)
      
      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`)
        } catch (error) {
          console.log(`💔 Heartbeat failed for session ${sessionId}, closing stream`)
          clearInterval(heartbeat)
          unregisterProgressStream(sessionId)
        }
      }, 30000) // 30 second heartbeat
      
      // Clean up when stream closes
      request.signal?.addEventListener('abort', () => {
        console.log(`🔌 SSE stream closed for session: ${sessionId}`)
        clearInterval(heartbeat)
        unregisterProgressStream(sessionId)
      })
    },
    
    cancel() {
      console.log(`❌ SSE stream cancelled for session: ${sessionId}`)
      unregisterProgressStream(sessionId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

// Note: sendProgressUpdate is now in @/lib/progress-stream
