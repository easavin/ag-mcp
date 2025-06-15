'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, X, Upload } from 'lucide-react'
import FileDropZone from './FileDropZone'

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void
  disabled?: boolean
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showFileDropZone, setShowFileDropZone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() && files.length === 0) return

    onSendMessage(message, files)
    setMessage('')
    setFiles([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
    // Reset file input value to allow selecting the same file again
    if (fileInputRef.current) {
        fileInputRef.current.value = ''
    }
  }

  const handleFilesFromDropZone = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles])
    setShowFileDropZone(false)
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="chat-input-container" style={{
      padding: '1rem 0',
      background: '#1c1c1c',
      width: '100%',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      {/* Enhanced File Drop Zone */}
      {showFileDropZone && (
        <div className="mb-4">
          <FileDropZone
            onFilesSelected={handleFilesFromDropZone}
            maxFiles={10}
            maxSize={50 * 1024 * 1024} // 50MB
            acceptedTypes={['.shp', '.zip', '.kml', '.geojson', '.pdf', '.csv', '.json', '.txt', '.xlsx']}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="file-tags">
          {files.map((file, index) => (
            <div key={index} className="file-tag">
              <Paperclip className="w-4 h-4" />
              <span>{file.name}</span>
              <button onClick={() => removeFile(index)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>

      <div className="chat-input-form">
        <div className="input-wrapper" style={{
          flexGrow: 1,
          position: 'relative',
          border: '1px solid #444',
          borderRadius: '16px',
          background: '#2a2a2a',
          minHeight: '80px' // Increased from 60px to 80px for better mobile visibility
        }}>
            <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about your fields, equipment, or upload a prescription file..."
                className="chat-input-field"
                rows={1}
                disabled={disabled}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                    }
                }}
                style={{
                  width: '100%',
                  padding: '22px 60px 22px 20px', // Increased padding for better mobile touch
                  border: 'none',
                  background: 'transparent',
                  color: '#e0e0e0',
                  fontSize: '1.1rem',
                  lineHeight: 1.5,
                  resize: 'none',
                  outline: 'none',
                  maxHeight: '200px',
                  minHeight: '36px' // Increased from 24px to 36px for better mobile visibility
                }}
            />
            <div className="input-buttons" style={{
              position: 'absolute',
              right: '16px',
              bottom: '16px', // Adjusted to match increased padding
              display: 'flex',
              alignItems: 'center',
              gap: '8px' // Slightly increased gap for better mobile touch
            }}>
                <button
                    type="button"
                    onClick={() => setShowFileDropZone(!showFileDropZone)}
                    className="input-btn"
                    disabled={disabled}
                    title={showFileDropZone ? "Hide file uploader" : "Show file uploader"}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      border: 'none',
                      background: showFileDropZone ? '#374151' : 'none',
                      color: showFileDropZone ? '#60a5fa' : '#a0a0a0',
                      cursor: 'pointer',
                      borderRadius: '10px'
                    }}
                >
                    {showFileDropZone ? <Upload className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                </button>
                <button
                    type="submit"
                    disabled={disabled || (!message.trim() && files.length === 0)}
                    className="input-btn send-btn"
                    title="Send message"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      cursor: 'pointer',
                      borderRadius: '10px'
                    }}
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".shp,.zip,.kml,.geojson, .pdf, .csv, .json"
        onChange={handleFileSelect}
        style={{
          display: 'none',
          visibility: 'hidden',
          position: 'absolute',
          left: '-9999px'
        }}
      />
      </form>
    </div>
  )
} 