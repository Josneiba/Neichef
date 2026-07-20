import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterMs: number
}

export type RateLimitOptions = {
  windowMs: number
  max: number
  prefix?: string
}

function createInMemoryLimiter(options: RateLimitOptions) {
  const { windowMs, max, prefix = 'rl' } = options
  const buckets = new Map<string, { count: number; resetAt: number }>()

  function cleanup(now: number) {
    for (const [key, entry] of buckets.entries()) {
      if (entry.resetAt <= now) {
        buckets.delete(key)
      }
    }
  }

  return {
    async check(key = 'default'): Promise<RateLimitResult> {
      const now = Date.now()
      cleanup(now)
      const bucketKey = `${prefix}:${key}`
      const existing = buckets.get(bucketKey)

      if (!existing) {
        const resetAt = now + windowMs
        buckets.set(bucketKey, { count: 1, resetAt })
        return { allowed: true, remaining: Math.max(0, max - 1), resetAt, retryAfterMs: 0 }
      }

      if (existing.count >= max) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.resetAt,
          retryAfterMs: Math.max(0, existing.resetAt - now),
        }
      }

      existing.count += 1
      return {
        allowed: true,
        remaining: Math.max(0, max - existing.count),
        resetAt: existing.resetAt,
        retryAfterMs: 0,
      }
    },
  }
}

function createUpstashLimiter(options: RateLimitOptions) {
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return null

  try {
    const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(options.max, `${options.windowMs} ms`),
      analytics: false,
      prefix: options.prefix ?? 'rl',
    })

    return {
      async check(key = 'default'): Promise<RateLimitResult> {
        const result = await limiter.limit(key)
        return {
          allowed: result.success,
          remaining: Math.max(0, result.remaining),
          resetAt: Date.now() + options.windowMs,
          retryAfterMs: result.success ? 0 : Math.max(0, Number(result.retryAfter ?? 0)),
        }
      },
    }
  } catch {
    return null
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  const upstashLimiter = createUpstashLimiter(options)
  if (upstashLimiter) return upstashLimiter
  return createInMemoryLimiter(options)
}
