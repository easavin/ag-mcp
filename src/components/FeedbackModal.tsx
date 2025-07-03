import { useState } from 'react'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, pageUrl: window.location.href })
    })
    setSent(true)
    setLoading(false)
    setTimeout(onClose, 1500)
  }

  if (!isOpen) return null
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: '#23272f', borderRadius: 12, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px #0008' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Feature requests and feedback</h2>
        {sent ? <p style={{ color: '#22c55e', fontWeight: 500 }}>Thank you for your feedback!</p> : (
          <>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Your feedback or feature request..."
              rows={5}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #444', padding: 12, marginBottom: 16, background: '#18181b', color: '#f3f4f6', resize: 'vertical' }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || loading}
              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginRight: 8 }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
            <button onClick={onClose} style={{ background: 'none', color: '#aaa', border: 'none', fontSize: 16, marginLeft: 8, cursor: 'pointer' }}>Close</button>
          </>
        )}
      </div>
    </div>
  )
} 