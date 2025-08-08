import { getLLMService } from '@/lib/llm'

describe('LLM config', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    // Ensure API clients do not initialize in jsdom
    process.env.OPENAI_API_KEY = ''
    process.env.GOOGLE_API_KEY = ''
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('uses default models when env vars are not set', () => {
    delete process.env.GEMINI_MODEL
    delete process.env.OPENAI_MODEL
    const svc = getLLMService()
    const cfg = svc.getConfig()
    expect(cfg.gemini.model).toBe('gemini-2.0-flash-exp')
    expect(cfg.openai.model).toBe('gpt-4o-mini')
  })

  it('uses env-configured model names when provided', () => {
    process.env.GEMINI_MODEL = 'gemini-custom'
    process.env.OPENAI_MODEL = 'gpt-custom'
    // force new instance by resetting the module cache
    jest.resetModules()
    const { getLLMService: fresh } = require('@/lib/llm')
    const svc = fresh()
    const cfg = svc.getConfig()
    expect(cfg.gemini.model).toBe('gemini-custom')
    expect(cfg.openai.model).toBe('gpt-custom')
  })
})


