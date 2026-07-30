import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAiQuota, aiQuotaHeaders } from '@/lib/ai/quota'
import { generateRecipeFromIngredients } from '@/lib/ai/openrouter'

async function getUserId() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  let userId: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    userId = null
  }

  const quota = await checkAiQuota(userId, 'recipe-generate')
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.reason }, { status: 429, headers: aiQuotaHeaders(quota) })
  }

  try {
    const body = await request.json()
    const ingredients = Array.isArray(body?.ingredients) ? body.ingredients : []

    if (ingredients.length === 0) {
      return NextResponse.json({ error: 'Please provide a list of ingredients.' }, { status: 400 })
    }

    const recipe = await generateRecipeFromIngredients(ingredients)
    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('[pantry:generate-recipe] failed', error)
    return NextResponse.json({ error: 'Failed to generate recipe.' }, { status: 500 })
  }
}
