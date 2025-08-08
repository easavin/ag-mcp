export interface RateLimitRecord {
  count: number
  resetTime: number
}

export interface RateLimiterStore {
  get(key: string): Promise<RateLimitRecord | undefined> | RateLimitRecord | undefined
  set(key: string, value: RateLimitRecord): Promise<void> | void
}

export class MemoryRateLimiterStore implements RateLimiterStore {
  private store = new Map<string, RateLimitRecord>()

  get(key: string): RateLimitRecord | undefined {
    return this.store.get(key)
  }

  set(key: string, value: RateLimitRecord): void {
    this.store.set(key, value)
  }
}

export class RateLimiter {
  constructor(private readonly store: RateLimiterStore) {}

  async allow(key: string, maxRequests: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }>{
    const now = Date.now()
    const record = (await this.store.get(key))

    if (!record || now > record.resetTime) {
      const newRecord: RateLimitRecord = { count: 1, resetTime: now + windowMs }
      await this.store.set(key, newRecord)
      return { allowed: true, remaining: maxRequests - 1, resetTime: newRecord.resetTime }
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime }
    }

    const updated: RateLimitRecord = { count: record.count + 1, resetTime: record.resetTime }
    await this.store.set(key, updated)
    return { allowed: true, remaining: Math.max(0, maxRequests - updated.count), resetTime: updated.resetTime }
  }
}

// Default in-memory limiter instance
export const defaultRateLimiter = new RateLimiter(new MemoryRateLimiterStore())


