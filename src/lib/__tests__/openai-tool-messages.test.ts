import { LLMService, ChatMessage } from '@/lib/llm'

beforeAll(() => {
  // Ensure API clients do not initialize in jsdom
  process.env.OPENAI_API_KEY = ''
  process.env.GOOGLE_API_KEY = ''
})

// We won’t call the API, we just test message conversion is shaped correctly

describe('OpenAI message conversion with tool messages', () => {
  it('converts function messages into tool role when callId is present', async () => {
    const svc = new LLMService()
    const messages: ChatMessage[] = [
      { role: 'user', content: 'How many fields do I have?' },
      { role: 'assistant', content: '', functionCall: { name: 'getFields', arguments: {}, callId: 'call_1' } },
      { role: 'function', content: '{"fields":[{"id":"f1"}]}' },
    ]

    // @ts-ignore access private for test via type cast
    const openaiMsgs = (svc as any).convertToOpenAIFormat(messages, 'system')

    expect(openaiMsgs[0]).toEqual({ role: 'system', content: 'system' })
    expect(openaiMsgs[1]).toEqual({ role: 'user', content: 'How many fields do I have?' })
    expect(openaiMsgs[2]).toEqual({ role: 'assistant', content: '' })
    expect(openaiMsgs[3]).toEqual({ role: 'tool', content: '{"fields":[{"id":"f1"}]}', tool_call_id: 'call_1' })
  })
})


