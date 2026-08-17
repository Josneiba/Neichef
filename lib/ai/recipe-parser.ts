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
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content: `You are a recipe extraction expert. Parse recipe text into structured JSON format.

REQUIRED OUTPUT FORMAT (no deviations):
{
  "title": "Recipe name",
  "description": "Brief summary of the dish (1-2 sentences)",
  "servings": 2,
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "tags": ["tag1", "tag2"],
  "ingredients": [
    {"name": "ingredient name", "amount": 1.5, "unit": "cup"},
    {"name": "another ingredient", "amount": 100, "unit": "g"}
  ],
  "steps": [
    {"instruction": "First action to perform", "durationMinutes": null},
    {"instruction": "Second action", "durationMinutes": 10}
  ]
}

EXTRACTION RULES:
1. title: Use the recipe name. If not explicit, infer from ingredients/instructions.
2. description: Create a brief, helpful summary if not present.
3. servings: Extract from "serves X" or similar. Default to 2.
4. prepTimeMinutes: Look for "prep time", "preparation", "active time". Default to 15.
5. cookTimeMinutes: Look for "cook time", "baking time", "total time" minus prep. Default to 30.
6. tags: Extract 2-4 relevant tags (cuisine type, dietary, difficulty level, flavor profile).
7. ingredients:
   - Split each ingredient into name, amount, unit.
   - Normalize units: g, kg, ml, l, tsp, tbsp, cup, oz, lb, pcs
   - For complex ingredients (e.g., "2 cups (240g) flour"), use the first quantity.
   - For "to taste" or unmeasured, use amount 1 and unit "pcs".
   - Extract quantity as a decimal number (e.g., "2 1/2" → 2.5).
   - DO NOT include preparation notes in ingredient name (e.g., "butter" not "softened butter").
8. steps:
   - Break into single-action steps (not multi-step paragraphs).
   - Remove vague intro text; start with actionable verbs (Mix, Heat, Pour, etc.).
   - Extract duration if mentioned (e.g., "bake for 25 minutes" → durationMinutes: 25).
   - Keep instructions clear and concise (1-2 sentences per step).
9. Special handling:
   - For recipes with multiple ingredient lists (Dough, Filling, Icing), merge them into one flat ingredients list with clear names.
   - Preserve original ingredient language.
   - If recipe has titled sections (e.g., "### For the Dough:"), flatten them and clarify in ingredient names if needed.

ERROR PREVENTION:
- MUST output valid JSON that parses successfully.
- MUST include all required fields (title, description, servings, prepTimeMinutes, cookTimeMinutes, tags, ingredients, steps).
- ingredients array MUST have at least 1 item.
- steps array MUST have at least 1 item.
- All number fields MUST be numbers, not strings.
- durationMinutes can be null if not specified.

Return ONLY the JSON object. No markdown, no explanations, no code fences.`,
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
