import bcrypt from 'bcryptjs'

// Mock prisma BEFORE importing authOptions
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

import { authOptions } from '@/lib/auth-config'

describe('auth-config authorize()', () => {
  const mockedPrisma = (require('@/lib/prisma').prisma as unknown) as {
    user: { findUnique: jest.Mock }
  }

  const getAuthorize = () => {
    const provider = (authOptions.providers as any[])[0]
    return provider.options.authorize as (credentials?: { email?: string; password?: string }) => Promise<any>
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null when credentials are missing', async () => {
    const authorize = getAuthorize()
    const result = await authorize({})
    expect(result).toBeNull()
  })

  it('returns null when user not found', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)
    const authorize = getAuthorize()
    const result = await authorize({ email: 'x@example.com', password: 'pass' })
    expect(result).toBeNull()
  })

  it('returns null when user has no password set (no fallback allowed)', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@example.com', password: null })
    const authorize = getAuthorize()
    const result = await authorize({ email: 'x@example.com', password: 'admin123' })
    expect(result).toBeNull()
  })

  it('authenticates with valid bcrypt password', async () => {
    const hash = await bcrypt.hash('secret', 8)
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@example.com', password: hash, name: 'User' })
    const authorize = getAuthorize()
    const result = await authorize({ email: 'x@example.com', password: 'secret' })
    expect(result).toEqual({ id: 'u1', email: 'x@example.com', name: 'User' })
  })

  it('fails with invalid password', async () => {
    const hash = await bcrypt.hash('secret', 8)
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@example.com', password: hash })
    const authorize = getAuthorize()
    const result = await authorize({ email: 'x@example.com', password: 'wrong' })
    expect(result).toBeNull()
  })
})


