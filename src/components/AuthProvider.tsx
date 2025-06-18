'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthProviderProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export default function AuthProvider({ children, requireAuth = true }: AuthProviderProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      // Redirect to sign-in page
      router.push('/auth/signin')
    }
  }, [status, requireAuth, router])

  // Show loading spinner while checking authentication
  if (requireAuth && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show sign-in prompt if authentication required but user not authenticated
  if (requireAuth && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access the Ag Assistant.</p>
          <button
            onClick={() => signIn()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 