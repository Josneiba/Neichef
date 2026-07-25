import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    nutritionPlan: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    mealRoutine: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
  })),
}))

vi.mock('@/lib/dbCircuit', () => ({
  isDbAvailable: vi.fn(() => true),
  reportDbFailure: vi.fn(),
  markDbSuccess: vi.fn(),
}))

describe('nutrition API routes and helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.OPENAI_API_KEY = 'openai-test-key'
    process.env.FDC_API_KEY = 'test-key'
  })

  it('rejects unsupported plan upload file types', async () => {
    const { extractNutritionPlan } = await import('@/lib/nutrition/extract-plan')
    const file = new File([new Uint8Array([1, 2, 3])], 'plan.txt', { type: 'text/plain' })

    const result = await extractNutritionPlan(file, 'upload_file')

    expect(result).toEqual({
      ok: false,
      error: 'Unsupported file type. Use JPEG, PNG, WEBP, or PDF.',
    })
  })

  it('rejects plan uploads larger than 10MB', async () => {
    const { extractNutritionPlan } = await import('@/lib/nutrition/extract-plan')
    const largePayload = new Uint8Array(10 * 1024 * 1024 + 1)
    const file = new File([largePayload], 'plan.pdf', { type: 'application/pdf' })

    const result = await extractNutritionPlan(file, 'upload_file')

    expect(result).toEqual({
      ok: false,
      error: 'File is too large. Maximum size is 10MB.',
    })
  })

  it('scores ingredient nutrition and excludes staple items', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          {
            foodNutrients: [
              { nutrientName: 'Protein', value: 8 },
              { nutrientName: 'Total lipid (fat)', value: 2 },
            ],
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/nutrition/route')
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        ingredients: [
          { name: 'Chicken', amount: 100, unit: 'g' },
          { name: 'Salt', amount: 1, unit: 'tsp' },
        ],
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(body).toEqual({
      calories: 0,
      protein: 8,
      carbs: 0,
      fat: 2,
      sugars: 0,
      matchedIngredients: 1,
      note: expect.any(String),
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('returns the authenticated user nutrition plan', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.nutritionPlan.findFirst).mockResolvedValueOnce({ id: 'plan-1', title: 'Weekly plan', restrictions: [] } as any)

    const { GET } = await import('@/app/api/nutrition/plans/route')
    const response = await GET()
    const body = await response.json()

    expect(body).toEqual({ id: 'plan-1', title: 'Weekly plan', restrictions: [] })
    expect(prisma.nutritionPlan.findFirst).toHaveBeenCalledOnce()
  })

  it('creates a nutrition plan with restrictions', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.nutritionPlan.create).mockResolvedValueOnce({ id: 'plan-2', title: 'Custom plan', restrictions: [{ type: 'allergy', ingredientName: 'Peanuts' }] } as any)

    const { POST } = await import('@/app/api/nutrition/plans/route')
    const body = JSON.stringify({
      title: 'Custom plan',
      source: 'manual',
      restrictions: [{ type: 'allergy', ingredientName: 'Peanuts' }],
    })
    const response = await POST(new Request('http://localhost', { method: 'POST', body }))
    const result = await response.json()

    expect(result).toEqual({ id: 'plan-2', title: 'Custom plan', restrictions: [{ type: 'allergy', ingredientName: 'Peanuts' }] })
    expect(prisma.nutritionPlan.create).toHaveBeenCalledOnce()
  })

  it('returns meal routines for the authenticated user', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.mealRoutine.findMany).mockResolvedValueOnce([{ id: 'routine-1', name: 'Morning', slots: [] } as any])

    const { GET } = await import('@/app/api/nutrition/routines/route')
    const response = await GET()
    const body = await response.json()

    expect(body).toEqual([{ id: 'routine-1', name: 'Morning', slots: [] }])
    expect(prisma.mealRoutine.findMany).toHaveBeenCalledOnce()
  })

  it('creates a meal routine from a valid payload', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.mealRoutine.create).mockResolvedValueOnce({ id: 'routine-2', name: 'Lunch', slots: [] } as any)

    const { POST } = await import('@/app/api/nutrition/routines/route')
    const body = JSON.stringify({ name: 'Lunch', daysOfWeek: ['monday'], slots: [] })
    const response = await POST(new Request('http://localhost', { method: 'POST', body }))
    const result = await response.json()

    expect(result).toEqual({ id: 'routine-2', name: 'Lunch', slots: [] })
    expect(prisma.mealRoutine.create).toHaveBeenCalledOnce()
  })
})
