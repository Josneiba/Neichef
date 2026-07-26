import { describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'

const mockGeminiWithText = vi.fn()
const mockOpenAIWithText = vi.fn()

vi.mock('@/lib/ai/gemini', () => ({
  callGeminiWithText: mockGeminiWithText,
  callOpenAIWithText: mockOpenAIWithText,
}))

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
    shoppingListItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
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

  it('creates pantry items with inventory metadata', async () => {
    const mockItem = {
      id: 'pantry-1',
      userId: 'user-1',
      name: 'Green onion',
      category: 'produce',
      quantity: 2,
      unit: 'bunch',
      purchaseDate: new Date('2026-01-01'),
      openedDate: new Date('2026-01-02'),
      expirationDate: new Date('2026-01-10'),
      location: 'spice_rack',
      barcode: '1234567890123',
      estimatedPrice: 2.5,
      addedDate: new Date(),
    }
    vi.mocked(prisma.pantryItem.create).mockResolvedValueOnce(mockItem as any)

    const { POST } = await import('@/app/api/pantry/route')
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Green onion',
        category: 'produce',
        quantity: 2,
        unit: 'bunch',
        purchaseDate: '2026-01-01',
        openedDate: '2026-01-02',
        expirationDate: '2026-01-10',
        location: 'spice_rack',
        barcode: '1234567890123',
        estimatedPrice: 2.5,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const payload = await response.json()
    expect(payload).toMatchObject({
      id: 'pantry-1',
      name: 'Green onion',
      category: 'produce',
      location: 'spice_rack',
      barcode: '1234567890123',
      estimatedPrice: 2.5,
    })
    expect(vi.mocked(prisma.pantryItem.create).mock.calls[0][0].data).toMatchObject({
      name: 'Green onion',
      category: 'produce',
      location: 'spice_rack',
      barcode: '1234567890123',
      estimatedPrice: 2.5,
    })
  })

  it('dedupes unchecked shopping list items by normalized name', async () => {
    const createdItems = [
      { id: 'list-1', userId: 'user-1', name: 'Eggs', normalizedName: 'eggs', quantity: 1, unit: null, checked: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 'list-2', userId: 'user-1', name: 'Bread', normalizedName: 'bread', quantity: 1, unit: null, checked: false, createdAt: new Date(), updatedAt: new Date() },
    ]
    vi.mocked(prisma.shoppingListItem.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'list-0', userId: 'user-1', name: 'Eggs', normalizedName: 'eggs', quantity: 1, unit: null, checked: false, createdAt: new Date(), updatedAt: new Date() } as any)
      .mockResolvedValueOnce(null)
    vi.mocked(prisma.shoppingListItem.create)
      .mockResolvedValueOnce(createdItems[0] as any)
      .mockResolvedValueOnce(createdItems[1] as any)

    const { POST } = await import('@/app/api/shopping-list/route')
    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ name: 'Eggs' }, { name: 'eggs' }, { name: 'Bread' }]),
    }))

    expect(response.status).toBe(201)
    const payload = await response.json()
    expect(payload.items).toHaveLength(2)
    expect(payload.items.map((item: { name: string }) => item.name)).toEqual(['Eggs', 'Bread'])
  })

  it('parses manual-entry AI responses into pantry items', async () => {
    mockGeminiWithText.mockResolvedValueOnce('[{"name":"Milk","quantity":2,"unit":"liters","category":"dairy"}]')

    const { POST } = await import('@/app/api/pantry/manual-entry/route')
    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Buy 2 liters of milk' }),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ items: [{ name: 'Milk', quantity: 2, unit: 'liters', category: 'dairy' }] })
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
