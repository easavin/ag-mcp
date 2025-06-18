'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, ChevronDown } from 'lucide-react'
import AuthModal from './AuthModal'

export default function AuthHeader() {
  const { data: session, status } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const openSignIn = () => {
    setAuthModalMode('signin')
    setShowAuthModal(true)
  }

  const openSignUp = () => {
    setAuthModalMode('signup')
    setShowAuthModal(true)
  }

  if (status === 'loading') {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="w-8 h-8 bg-gray-200/50 rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-200 shadow-lg text-white"
          >
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium hidden sm:block">
              {session.user.name || session.user.email?.split('@')[0]}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl py-2 animate-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-gray-200/50">
                <p className="text-sm font-semibold text-gray-900">{session.user.name || 'User'}</p>
                <p className="text-xs text-gray-600">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100/50 flex items-center space-x-3 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={openSignIn}
          style={{
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: '500',
            color: 'rgba(255, 255, 255, 0.9)',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement
            target.style.color = 'white'
            target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            target.style.borderColor = 'rgba(255, 255, 255, 0.5)'
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement
            target.style.color = 'rgba(255, 255, 255, 0.9)'
            target.style.backgroundColor = 'transparent'
            target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
          }}
        >
          Log in
        </button>
        <button
          onClick={openSignUp}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: '600',
            color: '#1f2937',
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement
            target.style.backgroundColor = '#f3f4f6'
            target.style.transform = 'scale(1.05)'
            target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement
            target.style.backgroundColor = 'white'
            target.style.transform = 'scale(1)'
            target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          Sign up for free
        </button>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultMode={authModalMode}
      />
    </>
  )
} 