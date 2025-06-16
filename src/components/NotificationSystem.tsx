'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }
    
    setNotifications(prev => [...prev, newNotification])

    // Auto-remove after duration (default 5 seconds)
    const duration = notification.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications()

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        maxWidth: '20rem',
        width: 'auto'
      }}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onRemove: () => void
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(onRemove, 300) // Wait for exit animation
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
    }
  }

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-white dark:bg-gray-800',
          border: 'border-green-200 dark:border-green-700',
          icon: 'text-green-600 dark:text-green-400',
          title: 'text-green-900 dark:text-green-100',
          message: 'text-green-700 dark:text-green-300'
        }
      case 'error':
        return {
          bg: 'bg-white dark:bg-gray-800',
          border: 'border-red-200 dark:border-red-700',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-900 dark:text-red-100',
          message: 'text-red-700 dark:text-red-300'
        }
      case 'warning':
        return {
          bg: 'bg-white dark:bg-gray-800',
          border: 'border-yellow-200 dark:border-yellow-700',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-900 dark:text-yellow-100',
          message: 'text-yellow-700 dark:text-yellow-300'
        }
      case 'info':
        return {
          bg: 'bg-white dark:bg-gray-800',
          border: 'border-blue-200 dark:border-blue-700',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-900 dark:text-blue-100',
          message: 'text-blue-700 dark:text-blue-300'
        }
    }
  }

  const colors = getColors()

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out pointer-events-auto
        ${isVisible && !isRemoving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
      style={{
        pointerEvents: 'auto'
      }}
    >
      <div 
        className={`
          ${colors.bg} ${colors.border} border rounded-lg shadow-lg p-3
          backdrop-blur-sm min-w-0 max-w-sm
        `}
        style={{
          backgroundColor: notification.type === 'error' 
            ? '#1f2937' 
            : notification.type === 'success'
            ? '#1f2937'
            : notification.type === 'warning'
            ? '#1f2937'
            : '#1f2937',
          borderColor: notification.type === 'error' 
            ? '#ef4444' 
            : notification.type === 'success'
            ? '#10b981'
            : notification.type === 'warning'
            ? '#f59e0b'
            : '#3b82f6',
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${colors.icon}`}>
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white">
              {notification.title}
            </h4>
            {notification.message && (
              <p className="text-sm mt-1 text-gray-300">
                {notification.message}
              </p>
            )}
            
            {/* Action Button */}
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="text-sm font-medium mt-2 underline hover:no-underline text-white"
              >
                {notification.action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-md transition-colors text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Convenience hooks for different notification types
export function useNotificationHelpers() {
  const { addNotification } = useNotifications()

  return {
    success: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'info', title, message, ...options })
  }
} 