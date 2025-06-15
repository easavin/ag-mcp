import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface FileUpload {
  id: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  filePath: string
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'error'
  progress: number
  metadata?: {
    fields?: number
    features?: number
    bounds?: [number, number, number, number] // [minX, minY, maxX, maxY]
    crs?: string
    [key: string]: any
  }
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface UploadProgress {
  fileId: string
  progress: number
  status: string
}

interface FileState {
  // Current state
  uploads: FileUpload[]
  activeUploads: Map<string, UploadProgress>
  isUploading: boolean
  error: string | null

  // Actions
  startUpload: (file: File) => Promise<string> // Returns file ID
  updateUploadProgress: (fileId: string, progress: number, status?: string) => void
  completeUpload: (fileId: string, uploadData: Partial<FileUpload>) => void
  failUpload: (fileId: string, error: string) => void
  removeUpload: (fileId: string) => void
  processFile: (fileId: string) => Promise<void>
  loadUploads: () => Promise<void>
  deleteFile: (fileId: string) => Promise<void>
  setError: (error: string | null) => void
}

export const useFileStore = create<FileState>()(
  devtools(
    (set, get) => ({
      // Initial state
      uploads: [],
      activeUploads: new Map(),
      isUploading: false,
      error: null,

      // Actions
      startUpload: async (file) => {
        const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        set((state) => ({
          activeUploads: new Map(state.activeUploads).set(fileId, {
            fileId,
            progress: 0,
            status: 'uploading',
          }),
          isUploading: true,
          error: null,
        }))

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('fileId', fileId)

          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error('Upload failed')
          }

          const uploadData: FileUpload = await response.json()
          
          get().completeUpload(fileId, uploadData)
          
          return fileId
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed'
          get().failUpload(fileId, errorMessage)
          throw error
        }
      },

      updateUploadProgress: (fileId, progress, status) => {
        set((state) => {
          const newActiveUploads = new Map(state.activeUploads)
          const current = newActiveUploads.get(fileId)
          if (current) {
            newActiveUploads.set(fileId, {
              ...current,
              progress,
              status: status || current.status,
            })
          }
          return { activeUploads: newActiveUploads }
        })
      },

      completeUpload: (fileId, uploadData) => {
        set((state) => {
          const newActiveUploads = new Map(state.activeUploads)
          newActiveUploads.delete(fileId)
          
          const newUpload: FileUpload = {
            id: uploadData.id || fileId,
            filename: uploadData.filename || '',
            originalName: uploadData.originalName || '',
            fileType: uploadData.fileType || '',
            fileSize: uploadData.fileSize || 0,
            filePath: uploadData.filePath || '',
            status: uploadData.status || 'uploaded',
            progress: 100,
            metadata: uploadData.metadata,
            createdAt: uploadData.createdAt || new Date(),
            updatedAt: uploadData.updatedAt || new Date(),
          }

          return {
            uploads: [newUpload, ...state.uploads],
            activeUploads: newActiveUploads,
            isUploading: newActiveUploads.size > 0,
          }
        })
      },

      failUpload: (fileId, error) => {
        set((state) => {
          const newActiveUploads = new Map(state.activeUploads)
          newActiveUploads.delete(fileId)
          
          return {
            activeUploads: newActiveUploads,
            isUploading: newActiveUploads.size > 0,
            error,
          }
        })
      },

      removeUpload: (fileId) => {
        set((state) => {
          const newActiveUploads = new Map(state.activeUploads)
          newActiveUploads.delete(fileId)
          
          return {
            uploads: state.uploads.filter((upload) => upload.id !== fileId),
            activeUploads: newActiveUploads,
            isUploading: newActiveUploads.size > 0,
          }
        })
      },

      processFile: async (fileId) => {
        set((state) => ({
          uploads: state.uploads.map((upload) =>
            upload.id === fileId
              ? { ...upload, status: 'processing' as const }
              : upload
          ),
        }))

        try {
          const response = await fetch(`/api/files/${fileId}/process`, {
            method: 'POST',
          })

          if (!response.ok) {
            throw new Error('File processing failed')
          }

          const processedData = await response.json()

          set((state) => ({
            uploads: state.uploads.map((upload) =>
              upload.id === fileId
                ? {
                    ...upload,
                    status: 'processed' as const,
                    metadata: { ...upload.metadata, ...processedData.metadata },
                    updatedAt: new Date(),
                  }
                : upload
            ),
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Processing failed'
          
          set((state) => ({
            uploads: state.uploads.map((upload) =>
              upload.id === fileId
                ? {
                    ...upload,
                    status: 'error' as const,
                    error: errorMessage,
                    updatedAt: new Date(),
                  }
                : upload
            ),
            error: errorMessage,
          }))
        }
      },

      loadUploads: async () => {
        try {
          const response = await fetch('/api/files')
          
          if (!response.ok) {
            throw new Error('Failed to load uploads')
          }

          const uploads: FileUpload[] = await response.json()
          
          set({ uploads })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load uploads'
          set({ error: errorMessage })
        }
      },

      deleteFile: async (fileId) => {
        try {
          const response = await fetch(`/api/files/${fileId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Failed to delete file')
          }

          set((state) => ({
            uploads: state.uploads.filter((upload) => upload.id !== fileId),
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Delete failed'
          set({ error: errorMessage })
          throw error
        }
      },

      setError: (error) => set({ error }),
    }),
    {
      name: 'file-store',
    }
  )
) 