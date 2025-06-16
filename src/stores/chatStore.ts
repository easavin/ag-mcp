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
          const currentSession = get().sessions.find(s => s.id === sessionId)
          if (!currentSession) {
            throw new Error('Session not found')
          }

          const allMessages = [...currentSession.messages, userMessage]

          // Generate LLM response
          const completionResponse = await fetch('/api/chat/completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              currentDataSource: get().currentDataSource,
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
    }),
    {
      name: 'chat-store',
    }
  )
) 