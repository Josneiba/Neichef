import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedRecipe: { findMany: vi.fn().mockResolvedValue([]) },
    recipe: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

import { generateMealSuggestions } from '@/lib/recipes/predictive'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('predictive shopping', () => {
  it('generates suggestions for anonymous user', async () => {
    const result = await generateMealSuggestions(null, 3)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})
