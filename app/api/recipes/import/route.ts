import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { extractRecipeWithGroq } from '@/lib/ai/recipe-parser'
import { polishRecipeWithOpenRouter } from '@/lib/ai/openrouter'
import { computeDifficulty } from '@/lib/recipes/difficulty'
import { checkAiQuota, aiQuotaHeaders } from '@/lib/ai/quota'

const schema = z.object({
  text: z.string().min(10, 'Add a bit more text so we can find a title, ingredients, and steps.').max(20000),
  source: z.enum(['paste', 'document']).default('paste'),
})

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function POST(request: Request) {
  let userId: string | null = null
  try {
    userId = await getUserId()
  } catch {
    userId = null
  }

  if (!userId) {
    return NextResponse.json({ error: 'Sign in to import a recipe.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
  }

  const quota = await checkAiQuota(userId, 'recipe-import', { weight: 2 })
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason ?? 'Too many AI requests. Try again later.' },
      { status: 429, headers: aiQuotaHeaders(quota) },
    )
  }

  try {
    const extracted = await extractRecipeWithGroq(parsed.data.text)

    const difficulty = computeDifficulty({
      ingredientsCount: extracted.ingredients.length,
      stepsCount: extracted.steps.length,
      totalTimeMinutes: extracted.prepTimeMinutes + extracted.cookTimeMinutes,
      instructionsText: extracted.steps.map((s) => s.instruction).join(' '),
    })

    let title = extracted.title
    let description = extracted.description
    let stepInstructions = extracted.steps.map((s) => s.instruction)

    try {
      const polished = await polishRecipeWithOpenRouter({
        title: extracted.title,
        description: extracted.description,
        ingredients: extracted.ingredients,
        steps: extracted.steps.map((s, i) => ({ step: i + 1, instruction: s.instruction })),
      })
      title = polished.title || title
      description = polished.description || description
      if (polished.steps?.length === extracted.steps.length) {
        stepInstructions = polished.steps.map((s) => s.instruction)
      }
    } catch (polishError) {
      console.warn('[recipes:import] OpenRouter polish skipped, using raw Groq extraction', polishError)
    }

    const draft = {
      title,
      description,
      servings: extracted.servings,
      prepTimeMinutes: extracted.prepTimeMinutes,
      cookTimeMinutes: extracted.cookTimeMinutes,
      difficulty,
      tags: extracted.tags,
      costLevel: 'medium' as const,
      ingredients: extracted.ingredients.map((i) => ({ ...i, inPantry: false })),
      steps: stepInstructions.map((instruction, idx) => ({
        step: idx + 1,
        instruction,
        durationMinutes: extracted.steps[idx]?.durationMinutes,
      })),
    }

    const response = NextResponse.json({ draft, note: 'Review and edit before saving.' })
    Object.entries(aiQuotaHeaders(quota)).forEach(([k, v]) => response.headers.set(k, v))
    return response
  } catch (err) {
    console.error('[recipes:import] extraction failed', { userId, source: parsed.data.source, err })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not parse this recipe.' }, { status: 502 })
  }
}
