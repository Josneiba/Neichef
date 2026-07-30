import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('item enrichment fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GROQ_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    delete process.env.HF_API_KEY
  })

  it('falls back to the original name and generic aisle when no AI provider is available', async () => {
    const { enrichItems } = await import('@/lib/pantry/enrich-items')

    const result = await enrichItems([{ name: 'ORG BANANA 3CT' }])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      originalName: 'ORG BANANA 3CT',
      name: 'ORG BANANA 3CT',
      category: 'other',
      aisle: 'Household & Other',
    })
  })
})
