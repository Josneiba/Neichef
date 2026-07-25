import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: { create: vi.fn() },
    user: { create: vi.fn() },
  },
}))

vi.mock('@/lib/dbCircuit', () => ({
  isDbAvailable: vi.fn(() => false),
  reportDbFailure: vi.fn(),
  markDbSuccess: vi.fn(),
}))

vi.mock('@/lib/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit')
  return {
    ...actual,
    aiRateLimiter: {
      check: vi.fn(),
    },
  }
})

const { createSupabaseServerClient } = await import('@/lib/supabase/server')
const { aiRateLimiter } = await import('@/lib/rate-limit')

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-actual'
  process.env.ENABLE_ADMIN_SIGNUP = 'true'
  globalThis.fetch = vi.fn()
})

describe('Security audit suite', () => {
  it('POST /api/auth/admin-create returns 401 when user is unauthenticated', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const { POST } = await import('@/app/api/auth/admin-create/route')
    const request = new Request('http://localhost/api/auth/admin-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin', email: 'admin@example.com', password: 'Password123!', householdSize: 1 }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const payload = await response.json()
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('POST /api/auth/admin-create returns 403 when user is authenticated but not admin', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', app_metadata: { role: 'user' } } },
        }),
      },
    } as any)

    const { POST } = await import('@/app/api/auth/admin-create/route')
    const request = new Request('http://localhost/api/auth/admin-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin', email: 'admin@example.com', password: 'Password123!', householdSize: 1 }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
    const payload = await response.json()
    expect(payload).toEqual({ error: 'Forbidden' })
  })

  it('POST /api/recipes returns 400 for schema validation failures', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
    } as any)

    const { POST } = await import('@/app/api/recipes/route')
    const request = new Request('http://localhost/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload).toHaveProperty('error')
  })

  it('POST /api/pantry/photo-detect returns 429 with rate limit headers when throttled', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
    } as any)

    vi.mocked(aiRateLimiter.check).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterMs: 30_000,
      limit: 5,
    })

    const { POST } = await import('@/app/api/pantry/photo-detect/route')
    const request = new Request('http://localhost/api/pantry/photo-detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: 'http://example.com/receipt.jpg' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('Retry-After')).toBeTruthy()
  })

  it('POST /api/nutrition/extract returns 401 when unauthenticated', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const { POST } = await import('@/app/api/nutrition/extract/route')
    const formData = new FormData()
    const blob = new Blob(['dummy'], { type: 'application/pdf' })
    formData.set('file', blob, 'dummy.pdf')
    formData.set('source', 'upload_file')

    const request = new Request('http://localhost/api/nutrition/extract', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const payload = await response.json()
    expect(payload).toEqual({ error: 'Unauthorized' })
  })
})
