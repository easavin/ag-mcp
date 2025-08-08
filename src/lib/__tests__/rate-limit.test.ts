import { MemoryRateLimiterStore, RateLimiter } from '@/lib/rate-limit'

describe('RateLimiter', () => {
  it('allows first request and enforces limits', async () => {
    const limiter = new RateLimiter(new MemoryRateLimiterStore())
    const key = '127.0.0.1'
    const windowMs = 1000
    const max = 2

    const r1 = await limiter.allow(key, max, windowMs)
    expect(r1.allowed).toBe(true)
    const r2 = await limiter.allow(key, max, windowMs)
    expect(r2.allowed).toBe(true)
    const r3 = await limiter.allow(key, max, windowMs)
    expect(r3.allowed).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('resets after window elapses', async () => {
    const limiter = new RateLimiter(new MemoryRateLimiterStore())
    const key = 'reset:test'
    const windowMs = 10
    const max = 1

    const r1 = await limiter.allow(key, max, windowMs)
    expect(r1.allowed).toBe(true)
    await new Promise(res => setTimeout(res, 15))
    const r2 = await limiter.allow(key, max, windowMs)
    expect(r2.allowed).toBe(true)
  })
})


