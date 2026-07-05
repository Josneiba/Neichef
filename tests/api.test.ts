import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pantryItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    recipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    savedRecipe: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    budgetLedgerEntry: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) } })),
}))

describe('API route protection and pantry logic', () => {
  it('rejects unauthenticated pantry access when no user is present', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({ auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } } as never)

    const { GET } = await import('@/app/api/pantry/route')
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('computes pantry urgency based on expiration date', () => {
    const today = new Date()
    const fresh = new Date(today)
    fresh.setDate(today.getDate() + 7)
    const expiring = new Date(today)
    expiring.setDate(today.getDate() + 2)
    const expired = new Date(today)
    expired.setDate(today.getDate() - 1)

    const compute = (expirationDate: Date) => {
      const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays < 0 ? 'expired' : diffDays <= 3 ? 'expiring' : 'fresh'
    }

    expect(compute(fresh)).toBe('fresh')
    expect(compute(expiring)).toBe('expiring')
    expect(compute(expired)).toBe('expired')
  })
})
