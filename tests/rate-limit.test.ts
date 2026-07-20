import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@/lib/rate-limit'

describe('createRateLimiter', () => {
  it('blocks requests after the configured limit', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, keyGenerator: () => 'test-key' })

    const first = await limiter.check()
    const second = await limiter.check()
    const third = await limiter.check()

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(third.allowed).toBe(false)
    expect(third.remaining).toBe(0)
  })
})
