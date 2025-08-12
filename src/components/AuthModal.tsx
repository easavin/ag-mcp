'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { X, Sprout, Shield, Zap } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(defaultMode === 'signup')

  // Update isSignUp when defaultMode changes or when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSignUp(defaultMode === 'signup')
      setError('') // Clear any previous errors when modal opens
    }
  }, [isOpen, defaultMode])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isSignUp) {
        // Handle sign-up
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to create account')
          return
        }

        // After successful registration, automatically sign in
        const signInResult = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (signInResult?.error) {
          setError('Account created but sign-in failed. Please try signing in manually.')
        } else {
          onClose()
          window.location.reload() // Refresh to update auth state
        }
      } else {
        // Handle sign-in
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError('Invalid email or password')
        } else {
          onClose()
          window.location.reload() // Refresh to update auth state
        }
      }
    } catch (err) {
      setError(isSignUp ? 'An error occurred during account creation' : 'An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: isSignUp ? '#f3f4f6' : '#1f2937', // light for sign up, dark for sign in
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        maxWidth: '28rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: `1px solid ${isSignUp ? '#e5e7eb' : '#374151'}`
      }}>
        {/* Header */}
        <div style={{
          position: 'relative',
          padding: '24px',
          borderBottom: `1px solid ${isSignUp ? '#e5e7eb' : '#374151'}`
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#374151'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
            }}
          >
            <X style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '8px',
              backgroundColor: isSignUp ? '#dcfce7' : '#065f46',
              borderRadius: '8px'
            }}>
              <Sprout style={{ width: '24px', height: '24px', color: isSignUp ? '#065f46' : '#10b981' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: isSignUp ? '#111827' : '#f9fafb',
                margin: 0,
                marginBottom: '4px'
              }}>
                {isSignUp ? 'Join Ag MCP' : 'Sign in to continue'}
              </h2>
              <p style={{
                fontSize: '14px',
                color: isSignUp ? '#4b5563' : '#9ca3af',
                margin: 0
              }}>
                Connect your FMS accounts and unlock powerful farm management tools
              </p>
            </div>
          </div>
        </div>

        {/* Benefits (only for Sign Up) */}
        {isSignUp && (
          <div style={{
            padding: '24px',
            backgroundColor: isSignUp ? '#ffffff' : '#111827',
            borderBottom: isSignUp ? '1px solid #e5e7eb' : undefined
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '500',
              color: isSignUp ? '#111827' : '#f9fafb',
              margin: 0,
              marginBottom: '12px'
            }}>
              What you'll get:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '4px',
                  backgroundColor: isSignUp ? '#dcfce7' : '#065f46',
                  borderRadius: '4px'
                }}>
                  <Sprout style={{ width: '16px', height: '16px', color: isSignUp ? '#065f46' : '#10b981' }} />
                </div>
                <span style={{ fontSize: '14px', color: isSignUp ? '#374151' : '#d1d5db' }}>
                  Access to your field data and equipment
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '4px',
                  backgroundColor: isSignUp ? '#dbeafe' : '#1e3a8a',
                  borderRadius: '4px'
                }}>
                  <Zap style={{ width: '16px', height: '16px', color: isSignUp ? '#1e3a8a' : '#3b82f6' }} />
                </div>
                <span style={{ fontSize: '14px', color: isSignUp ? '#374151' : '#d1d5db' }}>
                  AI-powered agricultural insights and recommendations
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '4px',
                  backgroundColor: isSignUp ? '#ede9fe' : '#581c87',
                  borderRadius: '4px'
                }}>
                  <Shield style={{ width: '16px', height: '16px', color: isSignUp ? '#6d28d9' : '#a855f7' }} />
                </div>
                <span style={{ fontSize: '14px', color: isSignUp ? '#374151' : '#d1d5db' }}>
                  Secure, personalized farm management dashboard
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: isSignUp ? '#111827' : '#f3f4f6',
              marginBottom: '4px'
            }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${isSignUp ? '#d1d5db' : '#4b5563'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                backgroundColor: isSignUp ? '#ffffff' : '#374151',
                color: isSignUp ? '#111827' : '#f9fafb'
              }}
              placeholder="Enter your email"
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981'
                e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isSignUp ? '#d1d5db' : '#4b5563'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: isSignUp ? '#111827' : '#f3f4f6',
              marginBottom: '4px'
            }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${isSignUp ? '#d1d5db' : '#4b5563'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                backgroundColor: isSignUp ? '#ffffff' : '#374151',
                color: isSignUp ? '#111827' : '#f9fafb'
              }}
              placeholder="Enter your password"
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981'
                e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isSignUp ? '#d1d5db' : '#4b5563'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#b91c1c',
              fontSize: '14px',
              backgroundColor: isSignUp ? '#fee2e2' : '#1f2937',
              border: `1px solid ${isSignUp ? '#fecaca' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '12px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              backgroundColor: isLoading ? '#065f46' : '#10b981',
              color: 'white',
              fontWeight: '600',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#059669'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#10b981'
              }
            }}
          >
            {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                fontSize: '14px',
                color: isSignUp ? '#065f46' : '#10b981',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                ;(e.target as HTMLButtonElement).style.color = isSignUp ? '#047857' : '#059669'
              }}
              onMouseLeave={(e) => {
                ;(e.target as HTMLButtonElement).style.color = isSignUp ? '#065f46' : '#10b981'
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 