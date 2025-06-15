import { render, screen } from '@testing-library/react'
import { MessageBubble } from '../MessageBubble'
import { Message } from '@/types/chat'

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>
  }
})

describe('MessageBubble', () => {
  const mockMessage: Message = {
    id: '1',
    sessionId: 'session-1',
    role: 'user',
    content: 'Test message content',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    metadata: null,
    fileAttachments: null,
  }

  it('renders user message correctly', () => {
    render(<MessageBubble message={mockMessage} />)
    
    expect(screen.getByText('Test message content')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('renders assistant message correctly', () => {
    const assistantMessage: Message = {
      ...mockMessage,
      role: 'assistant',
    }

    render(<MessageBubble message={assistantMessage} />)
    
    expect(screen.getByText('Test message content')).toBeInTheDocument()
    expect(screen.getByText('AgMCP Assistant')).toBeInTheDocument()
  })

  it('renders John Deere branded message correctly', () => {
    const johnDeereMessage: Message = {
      ...mockMessage,
      role: 'assistant',
      content: 'Your organization Green Growth has 5 fields',
    }

    render(<MessageBubble message={johnDeereMessage} />)
    
    expect(screen.getByText('John Deere Data')).toBeInTheDocument()
    expect(screen.getByAltText('John Deere')).toBeInTheDocument()
  })

  it('renders markdown content', () => {
    const markdownMessage: Message = {
      ...mockMessage,
      role: 'assistant',
      content: '**Bold text** and *italic text*',
    }

    render(<MessageBubble message={markdownMessage} />)
    
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
  })

  it('displays timestamp correctly', () => {
    render(<MessageBubble message={mockMessage} />)
    
    // Should display time in format like "10:00 AM"
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
  })

  it('handles file attachments', () => {
    const messageWithFiles: Message = {
      ...mockMessage,
      fileAttachments: [
        {
          filename: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
        },
      ],
    }

    render(<MessageBubble message={messageWithFiles} />)
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
    expect(screen.getByText('1.0 KB')).toBeInTheDocument()
  })

  it('applies correct styling for user vs assistant messages', () => {
    const { rerender } = render(<MessageBubble message={mockMessage} />)
    
    // User message should be right-aligned
    const userBubble = screen.getByTestId('message-bubble')
    expect(userBubble).toHaveClass('justify-end')

    // Assistant message should be left-aligned
    const assistantMessage: Message = { ...mockMessage, role: 'assistant' }
    rerender(<MessageBubble message={assistantMessage} />)
    
    const assistantBubble = screen.getByTestId('message-bubble')
    expect(assistantBubble).toHaveClass('justify-start')
  })
}) 