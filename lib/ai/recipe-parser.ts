import { z } from 'zod'
import { env } from '@/lib/env'

const recipeExtractionSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  servings: z.number().int().min(1).default(2),
  prepTimeMinutes: z.number().int().min(1).default(15),
  cookTimeMinutes: z.number().int().min(1).default(20),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().positive().default(1),
    unit: z.string().min(1).default('pcs'),
  })).min(1),
  steps: z.array(z.object({
    instruction: z.string().min(1),
    durationMinutes: z.number().int().positive().optional(),
  })).min(1),
})

export type ExtractedRecipe = z.infer<typeof recipeExtractionSchema>

export async function extractRecipeWithGroq(rawText: string): Promise<ExtractedRecipe> {
  if (!env.GROQ_API_KEY) {
    throw new Error('Groq is not configured. Add GROQ_API_KEY to enable recipe text import.')
  }

  const text = rawText.slice(0, 6000)

  const body = {
    model: 'llama-3.1-8b-instant',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content: `You extract a recipe from free-form user text (could be a pasted recipe, a messy note, or a document dump).
Return ONLY valid JSON with this exact shape:
{ "title": string, "description": string, "servings": number, "prepTimeMinutes": number, "cookTimeMinutes": number,
  "tags": string[], "ingredients": [{ "name": string, "amount": number, "unit": string }],
  "steps": [{ "instruction": string, "durationMinutes": number|null }] }
Rules:
- Separate ingredients from cooking steps even if the input doesn't label them explicitly.
- Normalize units to short forms (g, kg, ml, l, tsp, tbsp, cup, pcs).
- If a quantity is missing, use amount 1 and unit "pcs".
- Keep step instructions short and actionable, one action per step.
- Keep the original language of the input.
- Do not invent ingredients that are not mentioned in the text.`,
      },
      { role: 'user', content: text },
    ],
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const textResponse = await response.text().catch(() => '')
    throw new Error(`Groq recipe extraction error (${response.status}): ${textResponse.slice(0, 200)}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Groq returned no content for recipe extraction.')

  const cleaned = content.replace(/```+\w*/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse Groq recipe extraction as JSON.')

  const parsed = recipeExtractionSchema.safeParse(JSON.parse(match[0]))
  if (!parsed.success) throw new Error('Groq extraction did not match the expected recipe shape.')
  return parsed.data
}

export default { extractRecipeWithGroq }
