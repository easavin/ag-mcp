import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name?: string
  johnDeereConnected: boolean
  createdAt: Date
  updatedAt: Date
}

export interface JohnDeereConnection {
  isConnected: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: string | null
  scope?: string
  organizations?: Array<{ id: string; name: string; type: string; member: boolean }>
}

interface AuthState {
  // Current state
  user: User | null
  isAuthenticated: boolean
  johnDeereConnection: JohnDeereConnection
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  loadUser: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  connectJohnDeere: () => Promise<string> // Returns authorization URL
  handleJohnDeereCallback: (code: string, state: string) => Promise<void>
  disconnectJohnDeere: () => Promise<void>
  refreshJohnDeereToken: () => Promise<void>
  checkJohnDeereConnection: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        johnDeereConnection: {
          isConnected: false,
        },
        isLoading: false,
        error: null,

        // Actions
        setUser: (user) => {
          set({
            user,
            isAuthenticated: !!user,
            johnDeereConnection: {
              ...get().johnDeereConnection,
              isConnected: user?.johnDeereConnected || false,
            },
          })
        },

        loadUser: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/auth/user')

            if (!response.ok) {
              // For 401 errors (unauthenticated), don't set error state
              if (response.status === 401) {
                set({ isLoading: false, user: null, isAuthenticated: false })
                return
              }
              throw new Error('Failed to load user')
            }

            const { user } = await response.json()
            get().setUser(user)
            set({ isLoading: false })
          } catch (error) {
            // Only set error for unexpected failures, not authentication failures
            const errorMessage = error instanceof Error ? error.message : 'Failed to load user'
            set({ isLoading: false, user: null, isAuthenticated: false })
            // Don't set error for expected authentication failures
            if (errorMessage !== 'Failed to load user') {
              set({ error: errorMessage })
            }
          }
        },

        login: async (email, password) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            })

            if (!response.ok) {
              throw new Error('Login failed')
            }

            const { user } = await response.json()
            get().setUser(user)
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        logout: async () => {
          set({ isLoading: true, error: null })
          try {
            await fetch('/api/auth/logout', { method: 'POST' })
            
            set({
              user: null,
              isAuthenticated: false,
              johnDeereConnection: { isConnected: false },
              isLoading: false,
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Logout failed'
            set({ error: errorMessage, isLoading: false })
          }
        },

        connectJohnDeere: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/auth/johndeere/authorize', {
              method: 'POST',
            })

            if (!response.ok) {
              throw new Error('Failed to initiate John Deere connection')
            }

            const { authorizationUrl } = await response.json()
            set({ isLoading: false })
            
            return authorizationUrl
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        handleJohnDeereCallback: async (code, state) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/auth/johndeere/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, state }),
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              const errorMessage = errorData.error || 'Failed to complete John Deere connection'
              throw new Error(errorMessage)
            }

            const { user, connection } = await response.json()
            
            set({
              user,
              johnDeereConnection: {
                isConnected: true,
                expiresAt: new Date(connection.expiresAt).toISOString(),
                scope: connection.scope,
              },
              isLoading: false,
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        disconnectJohnDeere: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/auth/johndeere/disconnect', {
              method: 'POST',
            })

            if (!response.ok) {
              throw new Error('Failed to disconnect John Deere')
            }

            const { user } = await response.json()
            
            set({
              user,
              johnDeereConnection: { isConnected: false },
              isLoading: false,
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Disconnect failed'
            set({ error: errorMessage, isLoading: false })
            throw error
          }
        },

        refreshJohnDeereToken: async () => {
          try {
            const response = await fetch('/api/auth/johndeere/refresh', {
              method: 'POST',
            })

            if (!response.ok) {
              // Token refresh failed, disconnect user
              set({
                johnDeereConnection: { isConnected: false },
                user: get().user ? { ...get().user!, johnDeereConnected: false } : null,
              })
              return
            }

            const { connection } = await response.json()
            
            set({
              johnDeereConnection: {
                isConnected: true,
                expiresAt: new Date(connection.expiresAt).toISOString(),
                scope: connection.scope,
              },
            })
          } catch (error) {
            console.error('Token refresh failed:', error)
            set({
              johnDeereConnection: { isConnected: false },
              user: get().user ? { ...get().user!, johnDeereConnected: false } : null,
            })
          }
        },

        checkJohnDeereConnection: async () => {
          try {
            const response = await fetch('/api/johndeere/connection-status')
            
            if (!response.ok) {
              set({ johnDeereConnection: { isConnected: false } })
              return
            }

            const data = await response.json()
            
            const isConnected = data.status === 'connected' || data.status === 'partial_connection'
            
            if (isConnected) {
              set({
                johnDeereConnection: {
                  isConnected: true,
                  organizations: data.organizations || [],
                },
              })
            } else {
              set({ johnDeereConnection: { isConnected: false } })
            }
          } catch (error) {
            console.error('Connection check failed:', error)
            set({ johnDeereConnection: { isConnected: false } })
          }
        },

        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          johnDeereConnection: state.johnDeereConnection,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
) 