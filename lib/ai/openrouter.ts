import { env } from '@/lib/env'

type OpenRouterMessage = { role: 'system' | 'user'; content: string }

export async function callOpenRouter(messages: OpenRouterMessage[], opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }) {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter is not configured. Add OPENROUTER_API_KEY to enable this feature.')
  }

  const model = process.env.OPENROUTER_API_MODEL ?? 'meta-llama/llama-3.1-8b-instruct:free'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
      'X-Title': 'Neichef',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.4,
      max_tokens: opts?.maxTokens ?? 700,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OpenRouter service error (${response.status}): ${text.slice(0, 200)}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('OpenRouter returned an empty response.')
  }
  return content
}

export async function polishRecipeWithOpenRouter(draft: {
  title: string
  description: string
  ingredients: { name: string; amount: number; unit: string }[]
  steps: { step: number; instruction: string }[]
}) {
  const content = await callOpenRouter([
    {
      role: 'system',
      content: `You are a recipe editor. You receive a JSON recipe draft and return ONLY valid JSON with the same shape: { "title": string, "description": string, "steps": [{ "step": number, "instruction": string }] }.
Rules:
- Improve clarity and grammar of the title, description, and step instructions.
- Do NOT add, remove, or change ingredients or quantities — you are not given the authority to alter the ingredient list.
- Do NOT add new steps or merge existing ones; keep the same step count and order.
- Keep the same language the input was written in.
- Return compact JSON only, no markdown fences, no commentary.`,
    },
    { role: 'user', content: JSON.stringify(draft) },
  ], { maxTokens: 700, temperature: 0.4 })

  const cleaned = content.replace(/```+\w*/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse OpenRouter polish response as JSON.')
  return JSON.parse(match[0]) as { title: string; description: string; steps: { step: number; instruction: string }[] }
}

export async function generateRecipeFromIngredients(ingredients: string[]) {
  return callOpenRouter([
    {
      role: 'system',
      content: 'You are an expert chef. Write a concise recipe using the provided ingredients, with a title, short prep time, ingredients, and numbered steps.',
    },
    { role: 'user', content: `Create a recipe using these pantry ingredients: ${ingredients.join(', ')}.` },
  ], { maxTokens: 600, temperature: 0.7 })
}

export default { polishRecipeWithOpenRouter, generateRecipeFromIngredients }
