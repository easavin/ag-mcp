'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Smartphone, Tablet, Monitor } from 'lucide-react'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  className?: string
}

type DeviceType = 'mobile' | 'tablet' | 'desktop'

export default function ResponsiveLayout({ children, sidebar, className = '' }: ResponsiveLayoutProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType('mobile')
        setSidebarOpen(false) // Auto-close sidebar on mobile
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
        setSidebarOpen(true) // Auto-open sidebar on desktop
      }
    }

    checkDeviceType()
    window.addEventListener('resize', checkDeviceType)
    return () => window.removeEventListener('resize', checkDeviceType)
  }, [])

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'tablet':
        return <Tablet className="w-4 h-4" />
      case 'desktop':
        return <Monitor className="w-4 h-4" />
    }
  }

  return (
    <div className={`responsive-layout ${deviceType} ${className}`}>
      {/* Mobile Header */}
      {deviceType === 'mobile' && (
        <div className="mobile-header">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-button"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="mobile-title">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AgMCP
            </span>
          </div>
          <div className="device-indicator">
            {getDeviceIcon()}
          </div>
        </div>
      )}

      <div className="layout-content">
        {/* Sidebar */}
        {sidebar && (
          <>
            {/* Mobile Overlay */}
            {deviceType === 'mobile' && sidebarOpen && (
              <div
                className="mobile-overlay"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* Sidebar Container */}
            <div className={`sidebar-container ${sidebarOpen ? 'open' : 'closed'}`}>
              {sidebar}
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="main-content">
          {children}
        </div>
      </div>

      <style jsx>{`
        .responsive-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
        }

        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .mobile-menu-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border: none;
          background: none;
          color: #374151;
          cursor: pointer;
          border-radius: 0.375rem;
          transition: background-color 0.2s;
        }

        .mobile-menu-button:hover {
          background-color: #f3f4f6;
        }

        .mobile-title {
          flex: 1;
          text-align: center;
        }

        .device-indicator {
          display: flex;
          align-items: center;
          color: #6b7280;
        }

        .layout-content {
          display: flex;
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 45;
        }

        .sidebar-container {
          background: white;
          border-right: 1px solid #e5e7eb;
          transition: transform 0.3s ease-in-out;
          z-index: 50;
        }

        .main-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Mobile Styles */
        .responsive-layout.mobile .sidebar-container {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 280px;
          transform: translateX(-100%);
        }

        .responsive-layout.mobile .sidebar-container.open {
          transform: translateX(0);
        }

        .responsive-layout.mobile .main-content {
          width: 100%;
        }

        /* Tablet Styles */
        .responsive-layout.tablet .sidebar-container {
          width: 240px;
          position: relative;
        }

        .responsive-layout.tablet .sidebar-container.closed {
          width: 60px;
        }

        /* Desktop Styles */
        .responsive-layout.desktop .sidebar-container {
          width: 280px;
          position: relative;
        }

        .responsive-layout.desktop .sidebar-container.closed {
          width: 80px;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .mobile-header {
            background: #1f2937;
            border-bottom-color: #374151;
          }

          .mobile-menu-button {
            color: #d1d5db;
          }

          .mobile-menu-button:hover {
            background-color: #374151;
          }

          .sidebar-container {
            background: #1f2937;
            border-right-color: #374151;
          }
        }

        /* Responsive breakpoints */
        @media (max-width: 767px) {
          .layout-content {
            padding-top: 0;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .sidebar-container {
            min-width: 60px;
          }
        }

        @media (min-width: 1024px) {
          .sidebar-container {
            min-width: 80px;
          }
        }
      `}</style>
    </div>
  )
} 