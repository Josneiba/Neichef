import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('AI provider behavior', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    delete process.env.GROQ_API_KEY
    delete process.env.HF_API_KEY
  })

  it('uses the Groq configuration for structured pantry parsing', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"items":[{"name":"milk","quantity":2,"unit":"liters","category":"dairy"}]}' } }],
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)

    const { callGroqWithText } = await import('@/lib/ai/groq')
    const result = await callGroqWithText('2 liters of milk')

    expect(result).toContain('milk')
    expect(fetchMock).toHaveBeenCalledOnce()
    const init = (fetchMock.mock.calls[0] as unknown as [RequestInfo, RequestInit | undefined])?.[1]
    expect(init).toBeDefined()
    const body = JSON.parse(init?.body as string)
    expect(body.model).toBe('llama-3.1-8b-instant')
    expect(body.temperature).toBe(0.1)
    expect(body.max_tokens).toBe(384)
    expect(body.response_format).toEqual({ type: 'json_object' })
  })

  it('prefers Groq for text parsing and OpenRouter for enrichment', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key'
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'

    const { resolveProviderSelection } = await import('@/lib/ai/provider-router')

    const textSelection = resolveProviderSelection('text-parse')
    const enrichmentSelection = resolveProviderSelection('item-enrichment')

    expect(textSelection.provider).toBe('groq')
    expect(textSelection.fallbackProviders).toEqual(['groq'])
    expect(textSelection.reason).toContain('Groq is preferred')

    expect(enrichmentSelection.provider).toBe('openrouter')
    expect(enrichmentSelection.fallbackProviders).toEqual(['openrouter'])
    expect(enrichmentSelection.reason).toContain('OpenRouter is preferred')
  })

  it('parses manual entries through Gemini into structured JSON', async () => {
    process.env.GOOGLE_API_KEY = 'test-google-key'
    const source = 'manual_entry'
    const text = 'Buy 2 liters of milk and 1 loaf of bread'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ items: [{ name: 'Milk', quantity: 2, unit: 'liters', category: 'dairy' }] }) }],
          },
        }],
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)

    const { callGeminiWithText } = await import('@/lib/ai/gemini')
    const result = await callGeminiWithText(text, source as 'manual_entry' | 'receipt_text')

    expect(result).toContain('Milk')
    expect(fetchMock).toHaveBeenCalledOnce()
    const init = (fetchMock.mock.calls[0] as unknown as [RequestInfo, RequestInit | undefined])?.[1]
    expect(init).toBeDefined()
    const body = JSON.parse(init?.body as string)
    expect(body.contents[0].parts[0].text).toContain(source)
    expect(body.contents[0].parts[0].text).toContain(text)
  }, 15000)

  it('parses receipt text through Gemini into structured JSON', async () => {
    process.env.GOOGLE_API_KEY = 'test-google-key'
    const source = 'receipt_text'
    const text = 'Milk 2L\nBread 1 loaf\nEggs 1 dozen'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ items: [{ name: 'Milk', quantity: 2, unit: 'liters', category: 'dairy' }] }) }],
          },
        }],
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)

    const { callGeminiWithText } = await import('@/lib/ai/gemini')
    const result = await callGeminiWithText(text, source as 'manual_entry' | 'receipt_text')

    expect(result).toContain('Milk')
    expect(fetchMock).toHaveBeenCalledOnce()
    const init = (fetchMock.mock.calls[0] as unknown as [RequestInfo, RequestInit | undefined])?.[1]
    expect(init).toBeDefined()
    const body = JSON.parse(init?.body as string)
    expect(body.contents[0].parts[0].text).toContain(source)
    expect(body.contents[0].parts[0].text).toContain(text)
  }, 15000)

  it('uses OpenRouter for recipe generation and recipe polishing', async () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '```json\n{"title":"Tomato Soup","ingredients":[{"name":"tomato","amount":2,"unit":"cups"}],"steps":[{"step":1,"instruction":"Chop tomatoes."}]}\n```' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '```json\n{"title":"Tomato Onion Soup","ingredients":[{"name":"tomato","amount":2,"unit":"cups"},{"name":"onion","amount":1,"unit":"whole"}],"steps":[{"step":1,"instruction":"Saute onion and tomatoes."}]}\n```' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '```json\n{"title":"Tomato Onion Soup","description":"A quick comfort soup.","steps":[{"step":1,"instruction":"Chop the onion and tomatoes."}]}\n```' } }],
        }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const { callOpenRouter, generateRecipeFromIngredients, polishRecipeWithOpenRouter } = await import('@/lib/ai/openrouter')

    const raw = await callOpenRouter([
      { role: 'system', content: 'You are a helpful kitchen assistant.' },
      { role: 'user', content: 'Make a tomato soup recipe' },
    ])
    const generated = await generateRecipeFromIngredients(['tomato', 'onion'])

    expect(raw).toContain('Tomato Soup')
    expect(generated).toContain('Tomato')

    const polished = await polishRecipeWithOpenRouter({
      title: 'Tomato Soup',
      description: 'Quick soup.',
      ingredients: [{ name: 'tomato', amount: 2, unit: 'cups' }],
      steps: [{ step: 1, instruction: 'Chop tomatoes.' }],
    })

    expect(polished).toMatchObject({
      title: 'Tomato Onion Soup',
      description: 'A quick comfort soup.',
      steps: [{ step: 1, instruction: 'Chop the onion and tomatoes.' }],
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
