import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Groq text parsing', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    process.env.GROQ_API_KEY = 'test-groq-key'
  })

  it('uses low-token Groq settings for structured pantry parsing', async () => {
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
})
