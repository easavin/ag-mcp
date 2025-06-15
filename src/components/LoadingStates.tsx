'use client'

import { Loader2, Tractor, Sprout } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

interface AgricultureLoadingProps {
  message?: string
  className?: string
}

export function AgricultureLoading({ message = 'Loading...', className = '' }: AgricultureLoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="relative">
        {/* Animated tractor */}
        <div className="animate-bounce">
          <Tractor className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        
        {/* Growing plant animation */}
        <div className="absolute -top-2 -right-2 animate-pulse">
          <Sprout className="w-6 h-6 text-green-500 dark:text-green-300" />
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{message}</p>
        <div className="flex justify-center mt-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MessageSkeletonProps {
  isUser?: boolean
  className?: string
}

export function MessageSkeleton({ isUser = false, className = '' }: MessageSkeletonProps) {
  return (
    <div className={`message ${isUser ? 'user' : 'assistant'} ${className}`}>
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
          <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        <div className="message-text">
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DataVisualizationSkeletonProps {
  type?: 'chart' | 'table' | 'cards'
  className?: string
}

export function DataVisualizationSkeleton({ type = 'chart', className = '' }: DataVisualizationSkeletonProps) {
  if (type === 'cards') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
              <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-32 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex space-x-4">
                <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Default chart skeleton
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-32 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {/* Chart bars */}
          <div className="flex items-end space-x-2 h-32">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                style={{
                  width: '40px',
                  height: `${Math.random() * 80 + 20}%`
                }}
              ></div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FullPageLoadingProps {
  title?: string
  subtitle?: string
  className?: string
}

export function FullPageLoading({ 
  title = 'Loading AgMCP', 
  subtitle = 'Preparing your agricultural data...', 
  className = '' 
}: FullPageLoadingProps) {
  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="text-center">
        <AgricultureLoading message={title} />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  )
}

interface ProgressBarProps {
  progress: number
  label?: string
  className?: string
}

export function ProgressBar({ progress, label, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>{label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  )
}

interface PulsingDotProps {
  color?: 'green' | 'blue' | 'red' | 'yellow'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PulsingDot({ color = 'green', size = 'md', className = '' }: PulsingDotProps) {
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  }

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse ${className}`}></div>
  )
} 