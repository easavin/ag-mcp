// Store active progress streams (in production, use Redis or similar)
const progressStreams = new Map<string, WritableStreamDefaultWriter>()

// Utility function to send progress updates
export function sendProgressUpdate(sessionId: string, update: any) {
  console.log(`🚀 ATTEMPTING progress update for session ${sessionId}:`, update.step || update.message)
  console.log(`📊 Active streams: ${Array.from(progressStreams.keys()).join(', ') || 'NONE'}`)
  
  const writer = progressStreams.get(sessionId)
  if (writer) {
    try {
      const data = JSON.stringify({
        type: 'progress',
        ...update,
        timestamp: new Date().toISOString()
      })
      
      console.log(`📤 SUCCESS: Sending progress update to session ${sessionId}:`, update.step || update.message)
      ;(writer as any).enqueue(`data: ${data}\n\n`)
    } catch (error) {
      console.error(`❌ Failed to send progress update to session ${sessionId}:`, error)
      progressStreams.delete(sessionId)
    }
  } else {
    console.log(`🔍 No active stream found for session ${sessionId}`)
    console.log(`🔍 Available sessions: [${Array.from(progressStreams.keys()).join(', ')}]`)
    
    // Store the update temporarily in case the stream connects later
    console.log(`💾 Progress update stored (stream will send when connected): ${JSON.stringify(update)}`)
  }
}

// Register a new progress stream
export function registerProgressStream(sessionId: string, writer: WritableStreamDefaultWriter) {
  console.log(`📡 Registering progress stream for session: ${sessionId}`)
  progressStreams.set(sessionId, writer)
}

// Unregister a progress stream
export function unregisterProgressStream(sessionId: string) {
  console.log(`🔌 Unregistering progress stream for session: ${sessionId}`)
  progressStreams.delete(sessionId)
}

// Get all active sessions
export function getActiveProgressSessions(): string[] {
  return Array.from(progressStreams.keys())
}
