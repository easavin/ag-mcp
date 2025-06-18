'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { X, Sprout, Shield, Zap } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '28rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          position: 'relative',
          padding: '24px',
          borderBottom: '1px solid #f3f4f6'
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
              (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
            }}
          >
            <X style={{ width: '20px', height: '20px', color: '#6b7280' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '8px',
              backgroundColor: '#dcfce7',
              borderRadius: '8px'
            }}>
              <Sprout style={{ width: '24px', height: '24px', color: '#16a34a' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0,
                marginBottom: '4px'
              }}>
                {isSignUp ? 'Join Ag Assistant' : 'Sign in to continue'}
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Connect your John Deere account and unlock powerful farm management tools
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div style={{
          padding: '24px',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#111827',
            margin: 0,
            marginBottom: '12px'
          }}>
            What you'll get:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#dcfce7',
                borderRadius: '4px'
              }}>
                <Sprout style={{ width: '16px', height: '16px', color: '#16a34a' }} />
              </div>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                Access to your John Deere field data and equipment
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#dbeafe',
                borderRadius: '4px'
              }}>
                <Zap style={{ width: '16px', height: '16px', color: '#2563eb' }} />
              </div>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                AI-powered agricultural insights and recommendations
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '4px',
                backgroundColor: '#e9d5ff',
                borderRadius: '4px'
              }}>
                <Shield style={{ width: '16px', height: '16px', color: '#9333ea' }} />
              </div>
              <span style={{ fontSize: '14px', color: '#374151' }}>
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
              color: '#374151',
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
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your email"
              onFocus={(e) => {
                e.target.style.borderColor = '#16a34a'
                e.target.style.boxShadow = '0 0 0 2px rgba(22, 163, 74, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
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
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
              onFocus={(e) => {
                e.target.style.borderColor = '#16a34a'
                e.target.style.boxShadow = '0 0 0 2px rgba(22, 163, 74, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
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
              backgroundColor: isLoading ? '#86efac' : '#16a34a',
              color: 'white',
              fontWeight: '500',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#15803d'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#16a34a'
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
                color: '#16a34a',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.color = '#15803d'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.color = '#16a34a'
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

        {/* Demo credentials */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fed7aa',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#92400e',
              margin: 0,
              marginBottom: '4px'
            }}>
              Demo Account
            </h4>
            <p style={{
              fontSize: '12px',
              color: '#b45309',
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