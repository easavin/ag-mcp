'use client'

import { useState } from 'react'
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

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
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
    } catch (err) {
      setError('An error occurred during sign in')
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
        backgroundColor: '#1f2937',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        maxWidth: '28rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid #374151'
      }}>
        {/* Header */}
        <div style={{
          position: 'relative',
          padding: '24px',
          borderBottom: '1px solid #374151'
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
              backgroundColor: '#065f46',
              borderRadius: '8px'
            }}>
              <Sprout style={{ width: '24px', height: '24px', color: '#10b981' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#f9fafb',
                margin: 0,
                marginBottom: '4px'
              }}>
                {isSignUp ? 'Join Ag MCP' : 'Sign in to continue'}
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#9ca3af',
                margin: 0
              }}>
                Connect your FMS accounts and unlock powerful farm management tools
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div style={{
          padding: '24px',
          backgroundColor: '#111827'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#f9fafb',
            margin: 0,
            marginBottom: '12px'
          }}>
            What you'll get:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#065f46',
                borderRadius: '4px'
              }}>
                <Sprout style={{ width: '16px', height: '16px', color: '#10b981' }} />
              </div>
              <span style={{ fontSize: '14px', color: '#d1d5db' }}>
                Access to your field data and equipment
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#1e3a8a',
                borderRadius: '4px'
              }}>
                <Zap style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
              </div>
              <span style={{ fontSize: '14px', color: '#d1d5db' }}>
                AI-powered agricultural insights and recommendations
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#581c87',
                borderRadius: '4px'
              }}>
                <Shield style={{ width: '16px', height: '16px', color: '#a855f7' }} />
              </div>
              <span style={{ fontSize: '14px', color: '#d1d5db' }}>
                Secure, personalized farm management dashboard
              </span>
            </div>
          </div>
        </div>

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
              color: '#f3f4f6',
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
                border: '1px solid #4b5563',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                backgroundColor: '#374151',
                color: '#f9fafb'
              }}
              placeholder="Enter your email"
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981'
                e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#4b5563'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#f3f4f6',
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
                border: '1px solid #4b5563',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                backgroundColor: '#374151',
                color: '#f9fafb'
              }}
              placeholder="Enter your password"
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981'
                e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#4b5563'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#f87171',
              fontSize: '14px',
              backgroundColor: '#1f2937',
              border: '1px solid #ef4444',
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
            {isLoading ? 'Signing in...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                fontSize: '14px',
                color: '#10b981',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.color = '#059669'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.color = '#10b981'
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

        {/* Demo credentials */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            backgroundColor: '#1f2937',
            border: '1px solid #d97706',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#f59e0b',
              margin: 0,
              marginBottom: '4px'
            }}>
              Demo Account
            </h4>
            <p style={{
              fontSize: '12px',
              color: '#fbbf24',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Email: <span style={{ fontFamily: 'monospace' }}>admin@farm.com</span><br />
              Password: <span style={{ fontFamily: 'monospace' }}>admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 