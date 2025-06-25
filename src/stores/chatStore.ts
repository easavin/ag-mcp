import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  fileAttachments?: Array<{
    filename: string
    fileType: string
    fileSize: number
  }>
  metadata?: {
    model?: string
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    visualizations?: Array<{
      type: 'table' | 'chart' | 'metric' | 'comparison'
      title?: string
      description?: string
      data: any
    }>
    reasoning?: {
      isValid: boolean
      confidence: number
      explanation: string
      suggestions?: string[]
    }
  }
  createdAt: Date | string
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  createdAt: Date | string
  updatedAt: Date | string
  messages: Message[]
}

interface ChatState {
  // Current state
  currentSessionId: string | null
  sessions: ChatSession[]
  isLoading: boolean
  error: string | null
  currentDataSource: string | null
  selectedDataSources: string[]

  // Actions
  setCurrentSession: (sessionId: string | null) => void
  createSession: (title: string) => Promise<ChatSession>
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'sessionId' | 'createdAt'>) => Promise<Message>
  sendMessage: (sessionId: string, content: string, fileAttachments?: Array<{filename: string, fileType: string, fileSize: number}>) => Promise<Message>
  loadSessions: () => Promise<void>
  loadMessages: (sessionId: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentDataSource: (sourceId: string) => void
  setSelectedDataSources: (sources: string[]) => void
  toggleDataSource: (sourceId: string) => void
  reprocessLastFarmDataQuestion: (sessionId: string) => Promise<void>
  generateChatTitle: (sessionId: string, firstUserMessage: string) => Promise<void>
}

// Helper function to convert API response dates
const convertDates = (obj: any): any => {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(convertDates)
    }
    
    const converted = { ...obj }
    if (converted.createdAt && typeof converted.createdAt === 'string') {
      converted.createdAt = new Date(converted.createdAt)
    }
    if (converted.updatedAt && typeof converted.updatedAt === 'string') {
      converted.updatedAt = new Date(converted.updatedAt)
    }
    if (converted.messages && Array.isArray(converted.messages)) {
      converted.messages = converted.messages.map(convertDates)
    }
    return converted
  }
  return obj
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSessionId: null,
      sessions: [],
      isLoading: false,
      error: null,
      currentDataSource: null,
      selectedDataSources: ['weather'], // Weather always selected by default

      // Actions
      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId })
      },

      createSession: async (title) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          })

          if (!response.ok) {
            throw new Error('Failed to create session')
          }

          const rawSession = await response.json()
          const newSession: ChatSession = convertDates(rawSession)
          
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id,
            isLoading: false,
          }))

          return newSession
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      updateSessionTitle: async (sessionId, title) => {
        try {
          const response = await fetch(`/api/chat/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          })

          if (!response.ok) {
            throw new Error('Failed to update session')
          }

          const rawSession = await response.json()
          const updatedSession: ChatSession = convertDates(rawSession)

          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId ? updatedSession : session
            ),
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage })
          throw error
        }
      },

      deleteSession: async (sessionId) => {
        try {
          const response = await fetch(`/api/chat/sessions/${sessionId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Failed to delete session')
          }

          set((state) => ({
            sessions: state.sessions.filter((session) => session.id !== sessionId),
            currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage })
          throw error
        }
      },

      addMessage: async (sessionId, messageData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData),
          })

          if (!response.ok) {
            throw new Error('Failed to add message')
          }

          const rawMessage = await response.json()
          const newMessage: Message = convertDates(rawMessage)

          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [...session.messages, newMessage],
                    updatedAt: new Date(),
                  }
                : session
            ),
            isLoading: false,
          }))

          return newMessage
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      sendMessage: async (sessionId, content, fileAttachments) => {
        console.log('📤 sendMessage called with sessionId:', sessionId)
        set({ isLoading: true, error: null })
        try {
          // First, save the user message
          const userMessageResponse = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              role: 'user',
              content, 
              fileAttachments 
            }),
          })

          if (!userMessageResponse.ok) {
            throw new Error('Failed to save user message')
          }

          const rawUserMessage = await userMessageResponse.json()
          const userMessage: Message = convertDates(rawUserMessage)

          // Update state with user message
          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [...session.messages, userMessage],
                    updatedAt: new Date(),
                  }
                : session
            ),
          }))

          // Get all messages for the session to send to LLM
          const state = get()
          console.log('🔍 Looking for session:', sessionId, 'in sessions:', state.sessions.map(s => s.id))
          let currentSession = state.sessions.find(s => s.id === sessionId)
          
          if (!currentSession) {
            console.error('❌ Session not found:', sessionId)
            console.error('Available sessions:', state.sessions.map(s => ({ id: s.id, title: s.title })))
            throw new Error(`Session not found: ${sessionId}`)
          }
          
          console.log('✅ Found session:', currentSession.id, 'with', currentSession.messages.length, 'messages')

          const allMessages = [...currentSession.messages, userMessage]

          // Generate LLM response
          const completionResponse = await fetch('/api/chat/completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              selectedDataSources: get().selectedDataSources,
              messages: allMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                fileAttachments: msg.fileAttachments
              }))
            }),
          })

          if (!completionResponse.ok) {
            const errorData = await completionResponse.json()
            throw new Error(errorData.error || 'Failed to generate response')
          }

          const completionData = await completionResponse.json()
          const assistantMessage: Message = convertDates(completionData.message)

          // Update state with assistant message
          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [...session.messages.filter(m => m.id !== userMessage.id), userMessage, assistantMessage],
                    updatedAt: new Date(),
                  }
                : session
            ),
            isLoading: false,
          }))

          // Check if this is the first user message (session has only 2 messages: user + assistant)
          const updatedSession = get().sessions.find(s => s.id === sessionId)
          if (updatedSession && updatedSession.messages.length === 2 && updatedSession.title === 'New Chat') {
            // Generate a smart title based on the first user message
            console.log('🏷️ First message exchange complete, generating title...')
            get().generateChatTitle(sessionId, content).catch(error => {
              console.error('❌ Failed to generate title:', error)
            })
          }

          return assistantMessage
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      loadSessions: async () => {
        console.log('🔄 Starting loadSessions...')
        set({ isLoading: true, error: null })
        try {
          console.log('📡 Fetching sessions from API...')
          const response = await fetch('/api/chat/sessions')
          
          console.log('📡 Response status:', response.status, response.ok)
          
          if (!response.ok) {
            console.error('❌ API request failed:', response.status, response.statusText)
            throw new Error('Failed to load sessions')
          }

          console.log('📦 Parsing JSON response...')
          const rawSessions = await response.json()
          console.log('📦 Raw sessions:', rawSessions.length, 'sessions received')
          
          console.log('🔄 Converting dates...')
          const sessions: ChatSession[] = rawSessions.map(convertDates)
          console.log('✅ Sessions converted successfully:', sessions.length)
          
          console.log('💾 Updating store state...')
          set({ sessions, isLoading: false })
          console.log('✅ loadSessions completed successfully')
        } catch (error) {
          console.error('❌ Error in loadSessions:', error)
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage, isLoading: false })
        }
      },

      loadMessages: async (sessionId) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`/api/chat/sessions/${sessionId}/messages`)
          
          if (!response.ok) {
            throw new Error('Failed to load messages')
          }

          const rawMessages = await response.json()
          const messages: Message[] = rawMessages.map(convertDates)
          
          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? { ...session, messages }
                : session
            ),
            isLoading: false,
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage, isLoading: false })
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setCurrentDataSource: (sourceId) => set({ currentDataSource: sourceId }),
      setSelectedDataSources: (sources) => set({ selectedDataSources: sources }),
      toggleDataSource: (sourceId) => set((state) => ({
        selectedDataSources: state.selectedDataSources.includes(sourceId)
          ? state.selectedDataSources.filter(id => id !== sourceId)
          : [...state.selectedDataSources, sourceId]
      })),
      
      reprocessLastFarmDataQuestion: async (sessionId) => {
        const state = get()
        const currentSession = state.sessions.find(s => s.id === sessionId)
        
        if (!currentSession || currentSession.messages.length === 0) {
          console.log('❌ No session or messages found for reprocessing')
          return
        }

        // Helper function to check if a message is asking about farm data
        const isFarmDataQuestion = (content: string) => {
          const farmDataPatterns = [
            /my (fields?|equipment|machines?|operations?|organizations?|farms?)/i,
            /how many (fields?|machines?|equipment|operations?)/i,
            /tell me about my (fields?|equipment|machines?|operations?|farms?)/i,
            /show me my (fields?|equipment|machines?|operations?|farms?)/i,
            /list my (fields?|equipment|machines?|operations?|farms?)/i,
            /what (fields?|equipment|machines?|operations?|farms?) do I have/i,
            /my farm data/i,
            /field count/i,
            /equipment count/i,
            /machine count/i
          ]
          return farmDataPatterns.some(pattern => pattern.test(content))
        }

        // Find the most recent user message that was about farm data
        const userMessages = currentSession.messages.filter(m => m.role === 'user')
        const lastFarmDataQuestion = userMessages.reverse().find(msg => isFarmDataQuestion(msg.content))
        
        if (!lastFarmDataQuestion) {
          console.log('❌ No farm data question found to reprocess')
          return
        }

        console.log('🔄 Reprocessing farm data question:', lastFarmDataQuestion.content)
        set({ isLoading: true, error: null })

        try {
          // Get all messages including the question we want to reprocess
          const allMessages = currentSession.messages

          // Generate LLM response with the new data source context
          const completionResponse = await fetch('/api/chat/completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              selectedDataSources: state.selectedDataSources,
              messages: allMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                fileAttachments: msg.fileAttachments
              }))
            }),
          })

          if (!completionResponse.ok) {
            const errorData = await completionResponse.json()
            throw new Error(errorData.error || 'Failed to reprocess farm data question')
          }

          const completionData = await completionResponse.json()
          const assistantMessage: Message = convertDates(completionData.message)

          // Update state with the new assistant message
          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [...session.messages, assistantMessage],
                    updatedAt: new Date(),
                  }
                : session
            ),
            isLoading: false,
          }))

          console.log('✅ Farm data question reprocessed successfully')
        } catch (error) {
          console.error('❌ Error reprocessing farm data question:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ error: errorMessage, isLoading: false })
        }
      },

      generateChatTitle: async (sessionId, firstUserMessage) => {
        try {
          console.log('🏷️ Generating title for session:', sessionId, 'based on message:', firstUserMessage.substring(0, 50) + '...')
          
          // Call the completion API to generate a title
          const response = await fetch('/api/chat/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: firstUserMessage 
            }),
          })

          if (!response.ok) {
            console.error('❌ Failed to generate title:', response.status)
            return // Silently fail, keep the default "New Chat" title
          }

          const { title } = await response.json()
          
          if (title) {
            console.log('✅ Generated title:', title)
            // Update the session title
            await get().updateSessionTitle(sessionId, title)
          }
        } catch (error) {
          console.error('❌ Error generating chat title:', error)
          // Silently fail, keep the default "New Chat" title
        }
      },
    }),
    {
      name: 'chat-store',
    }
  )
) 