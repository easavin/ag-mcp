'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function JohnDeereConnectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      setStatus('error')
      setMessage('Missing authorization parameters')
      return
    }

    // Complete the John Deere connection
    const completeConnection = async () => {
      try {
        console.log('🔄 Completing John Deere connection from fallback page...')
        
        const response = await fetch('/api/auth/johndeere/callback', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        })

        const data = await response.json()

        if (response.ok) {
          console.log('✅ Connection completed successfully')
          setStatus('success')
          setMessage('John Deere connection completed successfully!')
          
          // Redirect to main page after a short delay
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          console.error('❌ Connection failed:', data)
          setStatus('error')
          setMessage(data.error || 'Failed to complete connection')
        }
      } catch (error) {
        console.error('❌ Error completing connection:', error)
        setStatus('error')
        setMessage('An unexpected error occurred')
      }
    }

    completeConnection()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            {status === 'loading' && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
            {status === 'success' && (
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            {status === 'loading' && 'Completing John Deere Connection...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </h2>
          
          <p className="text-sm text-gray-600 mb-4">
            {status === 'loading' && 'Please wait while we complete your John Deere connection.'}
            {status === 'success' && 'You will be redirected to the main page shortly.'}
            {status === 'error' && message}
          </p>
          
          {status === 'error' && (
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Main Page
            </button>
          )}
          
          {status === 'success' && (
            <button
              onClick={() => router.push('/')}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Continue to Main Page
            </button>
          )}
        </div>
      </div>
    </div>
  )
}