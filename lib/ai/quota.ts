import { headers } from 'next/headers'
import { createRateLimiter, type RateLimitResult } from '@/lib/rate-limit'

export type AiTaskName =
  | 'pantry-photo-detect'
  | 'pantry-manual-entry'
  | 'pantry-receipt-import'
  | 'nutrition-extract'
  | 'recipe-import'
  | 'recipe-generate'

const burstLimiter = createRateLimiter({ windowMs: 60_000, max: 6, prefix: 'ai-burst' })
const perUserDailyLimiter = createRateLimiter({ windowMs: 24 * 60 * 60_000, max: 20, prefix: 'ai-daily-user' })
const openRouterGlobalDailyLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60_000,
  max: Number(process.env.OPENROUTER_DAILY_BUDGET ?? 40),
  prefix: 'ai-daily-global-openrouter',
})

const TASK_WEIGHT: Record<AiTaskName, number> = {
  'pantry-photo-detect': 1,
  'pantry-manual-entry': 1,
  'pantry-receipt-import': 1,
  'nutrition-extract': 1,
  'recipe-import': 2,
  'recipe-generate': 1,
}

const USES_OPENROUTER: Record<AiTaskName, boolean> = {
  'pantry-photo-detect': false,
  'pantry-manual-entry': false,
  'pantry-receipt-import': false,
  'nutrition-extract': false,
  'recipe-import': true,
  'recipe-generate': true,
}

export type AiQuotaResult = {
  allowed: boolean
  reason?: string
  retryAfterMs: number
  worst?: RateLimitResult
}

async function resolveKey(userId: string | null) {
  if (userId) return `user:${userId}`
  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown-ip'
    return `ip:${ip}`
  } catch {
    return 'ip:unknown'
  }
}

export async function checkAiQuota(userId: string | null, task: AiTaskName, opts?: { weight?: number }): Promise<AiQuotaResult> {
  const key = await resolveKey(userId)
  const weight = opts?.weight ?? TASK_WEIGHT[task]

  const burst = await burstLimiter.check(key)
  if (!burst.allowed) {
    return { allowed: false, reason: 'Too many requests — slow down a moment.', retryAfterMs: burst.retryAfterMs, worst: burst }
  }

  for (let i = 0; i < weight; i += 1) {
    const daily = await perUserDailyLimiter.check(key)
    if (!daily.allowed) {
      return { allowed: false, reason: "You've hit today's AI usage limit for your account. Try again tomorrow.", retryAfterMs: daily.retryAfterMs, worst: daily }
    }
  }

  if (USES_OPENROUTER[task]) {
    const global = await openRouterGlobalDailyLimiter.check('global')
    if (!global.allowed) {
      return { allowed: false, reason: 'AI recipe generation is at capacity for today for all users — please try again tomorrow, or add ingredients manually.', retryAfterMs: global.retryAfterMs, worst: global }
    }
  }

  return { allowed: true, retryAfterMs: 0 }
}

export function aiQuotaHeaders(result: AiQuotaResult): Record<string, string> {
  if (!result.worst) return {}
  const headers: Record<string, string> = {}
  if (result.retryAfterMs > 0) headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000))
  return headers
}

export default { checkAiQuota, aiQuotaHeaders }
