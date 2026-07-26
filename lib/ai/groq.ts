import { env } from '@/lib/env'

export async function callGroqWithText(text: string): Promise<string> {
  if (!env.GROQ_API_KEY) {
    throw new Error('Groq is not configured. Add GROQ_API_KEY to your environment to enable fast text parsing.')
  }

  const body = {
    messages: [
      {
        role: 'system',
        content: `You are a strict pantry data-extraction engine. Return only valid JSON.
Output an object with an "items" array. Each item must include name, quantity, unit, category, and optional notes.
Use short normalized names and keep the response compact.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    model: 'llama-3.1-8b-instant',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 384,
    top_p: 1,
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const textResponse = await response.text().catch(() => '')
    throw new Error(`Groq extraction service error (${response.status}): ${textResponse.slice(0, 200)}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Unable to parse extraction response from the Groq provider.')
  }

  return content
}

export default { callGroqWithText }
