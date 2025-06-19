import { NextRequest, NextResponse } from 'next/server'
import { getLLMService } from '@/lib/llm'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get current authenticated user
    const authUser = await getCurrentUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get LLM service
    const llmService = getLLMService()

    // Generate a concise title based on the user's first message
    const titlePrompt = `Generate a concise, descriptive title (3-6 words) for a chat conversation based on this user message. The title should capture the main topic or intent.

User message: "${message}"

Requirements:
- Maximum 6 words
- Descriptive and specific
- No quotes or special characters
- Professional tone
- Focus on the main topic/intent

Examples:
- "Tell me about my fields" → "Field Information Request"
- "How many machines do I have?" → "Equipment Count Inquiry"
- "Schedule planting for corn" → "Corn Planting Schedule"
- "What's the weather forecast?" → "Weather Forecast Check"
- "Upload prescription file" → "Prescription File Upload"

Title:`

    const response = await llmService.generateChatCompletion([
      {
        role: 'user',
        content: titlePrompt,
        fileAttachments: []
      }
    ], {
      maxTokens: 50,
      temperature: 0.3, // Lower temperature for more consistent titles
      systemPrompt: 'You are a helpful assistant that generates concise, descriptive titles for chat conversations. Always respond with just the title, no additional text.',
      enableFunctions: false, // Disable functions for title generation
    })

    let title = response.content?.trim() || 'New Chat'
    
    // Clean up the title (remove quotes, limit length, etc.)
    title = title.replace(/['"]/g, '').trim()
    
    // Ensure title is not too long (max 50 characters)
    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    }

    // If the title is empty or just punctuation, fallback to default
    if (!title || title.length < 3 || /^[^\w\s]*$/.test(title)) {
      title = 'New Chat'
    }

    console.log('🏷️ Generated title:', title)

    return NextResponse.json({ title })
  } catch (error) {
    console.error('Error generating chat title:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    )
  }
} 