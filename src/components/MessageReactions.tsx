'use client'

import { useState } from 'react'
import { Copy, Share, Check } from 'lucide-react'

interface MessageReactionsProps {
  messageId: string
  content: string
  onCopy?: (content: string) => void
  onShare?: (content: string) => void
  className?: string
}

export default function MessageReactions({
  messageId,
  content,
  onCopy,
  onShare,
  className = ''
}: MessageReactionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      if (onCopy) {
        onCopy(content)
      }
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AgMCP Chat Response',
        text: content,
      }).catch(console.error)
    } else {
      // Fallback to copy
      handleCopy()
    }
    
    if (onShare) {
      onShare(content)
    }
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={`
          p-1.5 rounded-md transition-all duration-200 group
          ${copied
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'
          }
        `}
        title={copied ? 'Copied!' : 'Copy response'}
      >
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4 group-hover:scale-105 transition-transform" />
        )}
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-all duration-200 group"
        title="Share response"
      >
        <Share className="w-4 h-4 group-hover:scale-105 transition-transform" />
      </button>
    </div>
  )
} 