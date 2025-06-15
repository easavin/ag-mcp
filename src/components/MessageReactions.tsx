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
    <div className={`flex items-center space-x-2 ${className}`} style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        style={{
          padding: '4px',
          borderRadius: '4px',
          border: '1px solid #4b5563',
          backgroundColor: copied ? '#4b5563' : '#374151',
          color: copied ? '#f3f4f6' : '#d1d5db',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px'
        }}
        onMouseEnter={(e) => {
          if (!copied) {
            e.currentTarget.style.backgroundColor = '#4b5563'
            e.currentTarget.style.color = '#f3f4f6'
            e.currentTarget.style.borderColor = '#6b7280'
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            e.currentTarget.style.backgroundColor = '#374151'
            e.currentTarget.style.color = '#d1d5db'
            e.currentTarget.style.borderColor = '#4b5563'
          }
        }}
        title={copied ? 'Copied!' : 'Copy response'}
      >
        {copied ? (
          <Check style={{ width: '14px', height: '14px' }} />
        ) : (
          <Copy style={{ width: '14px', height: '14px' }} />
        )}
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        style={{
          padding: '4px',
          borderRadius: '4px',
          border: '1px solid #4b5563',
          backgroundColor: '#374151',
          color: '#d1d5db',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#4b5563'
          e.currentTarget.style.color = '#f3f4f6'
          e.currentTarget.style.borderColor = '#6b7280'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#374151'
          e.currentTarget.style.color = '#d1d5db'
          e.currentTarget.style.borderColor = '#4b5563'
        }}
        title="Share response"
      >
        <Share style={{ width: '14px', height: '14px' }} />
      </button>
    </div>
  )
} 