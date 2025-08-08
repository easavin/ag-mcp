import fs from 'fs'
import path from 'path'

describe('Prisma schema indexes', () => {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
  let schemaText = ''

  beforeAll(() => {
    schemaText = fs.readFileSync(schemaPath, 'utf8')
  })

  it('ChatSession has index on userId', () => {
    const chatSessionBlock = /model\s+ChatSession\s*\{[\s\S]*?\}/m.exec(schemaText)?.[0] || ''
    expect(chatSessionBlock).toMatch(/@@index\(\[userId\]\)/)
  })

  it('Message has indexes on sessionId and (sessionId, createdAt)', () => {
    const messageBlock = /model\s+Message\s*\{[\s\S]*?\}/m.exec(schemaText)?.[0] || ''
    expect(messageBlock).toMatch(/@@index\(\[sessionId\]\)/)
    expect(messageBlock).toMatch(/@@index\(\[sessionId,\s*createdAt\]\)/)
  })
})


