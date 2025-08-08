/**
 * Sanitize LLM response content for user-facing display.
 * - Remove internal validation/confidence text
 * - Remove leaked function names like getSomething(...)
 * - Normalize excessive whitespace
 */
export function sanitizeResponseContent(raw: string): string {
  if (!raw) return ''
  let content = raw

  // Remove validation/confidence phrases
  content = content.replace(/Response Validation\s*\d+%?\s*confidence/gi, '')
  content = content.replace(/The LLM response accurately[^.]+\./gi, '')
  content = content.replace(/confidence:\s*\d+%?/gi, '')
  content = content.replace(/validation (passed|failed|completed)/gi, '')
  content = content.replace(/\b\d+%?\s*confidence\b/gi, '')

  // Remove leaked function names with parentheses, e.g., getEUMarketPrices(...)
  content = content.replace(/\b(get|list|create|update|delete)[A-Za-z0-9_]*\s*\([^)]*\)/g, '[action performed]')

  // Collapse excessive newlines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n')
  return content.trim()
}


