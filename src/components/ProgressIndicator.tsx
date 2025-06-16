'use client'

import { useState, useEffect } from 'react'
import { Bot, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ProgressStep {
  id: string
  status: 'pending' | 'loading' | 'success' | 'error'
  message: string
  details?: string
}

interface ProgressIndicatorProps {
  steps: ProgressStep[]
  className?: string
}

export default function ProgressIndicator({ steps, className = '' }: ProgressIndicatorProps) {
  const [visibleSteps, setVisibleSteps] = useState<ProgressStep[]>([])

  // Animate steps appearing one by one
  useEffect(() => {
    if (steps.length === 0) {
      setVisibleSteps([])
      return
    }

    // Show steps progressively with a small delay
    const timeouts: NodeJS.Timeout[] = []
    
    steps.forEach((step, index) => {
      const timeout = setTimeout(() => {
        setVisibleSteps(prev => {
          const newSteps = [...prev]
          newSteps[index] = step
          return newSteps
        })
      }, index * 150) // 150ms delay between each step
      
      timeouts.push(timeout)
    })

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [steps])

  if (visibleSteps.length === 0) return null

  const getIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-gray-500 border-dashed" />
    }
  }

  const getStatusColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'loading':
        return 'text-blue-300'
      case 'success':
        return 'text-green-300'
      case 'error':
        return 'text-red-300'
      case 'pending':
        return 'text-gray-400'
    }
  }

  return (
    <div className={`message assistant ${className}`}>
      <div className="message-avatar avatar-assistant">
        <Bot className="w-4 h-4" />
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="name">Processing...</span>
        </div>
        
        <div className="message-text">
          <div className="space-y-2">
            {visibleSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 transition-all duration-300 ease-in-out transform ${
                  index === visibleSteps.length - 1 ? 'opacity-100 translate-y-0' : 'opacity-80'
                }`}
                style={{
                  animation: `slideIn 0.3s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${getStatusColor(step.status)}`}>
                    {step.message}
                  </div>
                  {step.details && (
                    <div className="text-xs text-gray-500 mt-1">
                      {step.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

// Hook to manage progress steps
export function useProgressIndicator() {
  const [steps, setSteps] = useState<ProgressStep[]>([])

  const addStep = (step: Omit<ProgressStep, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setSteps(prev => [...prev, { ...step, id }])
    return id
  }

  const updateStep = (id: string, updates: Partial<Pick<ProgressStep, 'status' | 'message' | 'details'>>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ))
  }

  const clearSteps = () => {
    setSteps([])
  }

  const setStepsDirectly = (newSteps: ProgressStep[]) => {
    setSteps(newSteps)
  }

  return {
    steps,
    addStep,
    updateStep,
    clearSteps,
    setStepsDirectly
  }
} 