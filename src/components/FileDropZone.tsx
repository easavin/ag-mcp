'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react'

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedTypes?: string[]
  className?: string
}

interface FilePreview {
  file: File
  id: string
  preview?: string
  error?: string
}

export default function FileDropZone({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['.shp', '.zip', '.kml', '.geojson', '.json', '.csv'],
  className = ''
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [files, setFiles] = useState<FilePreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit`
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type ${fileExtension} not supported`
    }

    return null
  }

  const createFilePreview = useCallback(async (file: File): Promise<FilePreview> => {
    const id = Math.random().toString(36).substr(2, 9)
    const error = validateFile(file)

    let preview: string | undefined

    // Create preview for images
    if (file.type.startsWith('image/')) {
      try {
        preview = URL.createObjectURL(file)
      } catch (err) {
        console.warn('Failed to create image preview:', err)
      }
    }

    return {
      file,
      id,
      preview,
      error: error || undefined
    }
  }, [maxSize, acceptedTypes])

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    
    // Check total file count
    if (files.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    setIsUploading(true)

    try {
      const previews = await Promise.all(
        fileArray.map(file => createFilePreview(file))
      )

      setFiles(prev => [...prev, ...previews])

      // Only pass valid files to parent
      const validFiles = previews
        .filter(preview => !preview.error)
        .map(preview => preview.file)

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    } catch (error) {
      console.error('Error processing files:', error)
    } finally {
      setIsUploading(false)
    }
  }, [files.length, maxFiles, createFilePreview, onFilesSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }, [handleFiles])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [handleFiles])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id)
      
      // Update parent with remaining valid files
      const validFiles = updated
        .filter(preview => !preview.error)
        .map(preview => preview.file)
      
      onFilesSelected(validFiles)
      
      return updated
    })
  }, [onFilesSelected])

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />
    }
    if (file.type.includes('text') || file.name.endsWith('.csv')) {
      return <FileText className="w-4 h-4" />
    }
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <div className="space-y-2">
          <Upload className={`w-8 h-8 mx-auto ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports: {acceptedTypes.join(', ')} • Max {maxFiles} files • {(maxSize / 1024 / 1024).toFixed(1)}MB each
            </p>
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Processing files...</span>
            </div>
          </div>
        )}
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((filePreview) => (
              <div
                key={filePreview.id}
                className={`
                  flex items-center space-x-3 p-3 rounded-lg border
                  ${filePreview.error 
                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' 
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }
                `}
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {filePreview.preview ? (
                    <img
                      src={filePreview.preview}
                      alt={filePreview.file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className={`
                      w-8 h-8 rounded flex items-center justify-center
                      ${filePreview.error 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' 
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                      }
                    `}>
                      {filePreview.error ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        getFileIcon(filePreview.file)
                      )}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className={`
                    text-sm font-medium truncate
                    ${filePreview.error 
                      ? 'text-red-900 dark:text-red-100' 
                      : 'text-gray-900 dark:text-gray-100'
                    }
                  `}>
                    {filePreview.file.name}
                  </p>
                  <p className={`
                    text-xs
                    ${filePreview.error 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}>
                    {filePreview.error || formatFileSize(filePreview.file.size)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(filePreview.id)
                  }}
                  className={`
                    flex-shrink-0 p-1 rounded-full transition-colors
                    ${filePreview.error
                      ? 'text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 