import { sanitizeResponseContent } from '@/lib/response-sanitizer'

describe('sanitizeResponseContent', () => {
  it('removes validation/confidence text', () => {
    const raw = 'Response Validation 95% confidence. The LLM response accurately answers. confidence: 80%.'
    const cleaned = sanitizeResponseContent(raw)
    expect(cleaned).not.toMatch(/Validation|confidence|accurately/)
  })

  it('removes leaked function names', () => {
    const raw = 'We will call getEUMarketPrices({ sector: "cereals" }) next.'
    const cleaned = sanitizeResponseContent(raw)
    expect(cleaned).not.toMatch(/getEUMarketPrices/)
    expect(cleaned).toContain('[action performed]')
  })

  it('normalizes whitespace', () => {
    const raw = 'Line 1\n\n\nLine 2'
    const cleaned = sanitizeResponseContent(raw)
    expect(cleaned).toBe('Line 1\n\nLine 2')
  })
})


