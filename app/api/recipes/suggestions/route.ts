import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { searchRecipesByIngredients } from '@/lib/recipes/external-source'

const querySchema = z.object({ maxTimeMinutes: z.string().optional(), difficulty: z.string().optional(), costLevel: z.string().optional() })

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()))

    const maxTime = parsed.success && parsed.data.maxTimeMinutes ? Number(parsed.data.maxTimeMinutes) : undefined
    const difficulty = parsed.success ? parsed.data.difficulty : undefined
    const costLevel = parsed.success ? parsed.data.costLevel : undefined

    const pantry = await prisma.pantryItem.findMany({ where: { userId } })
    const pantryNames = pantry.map((p) => p.name.toLowerCase())

    // Get matching recipes already in DB
    const dbRecipes = await prisma.recipe.findMany({ where: { OR: [{ isPublic: true }, { userId }] }, include: { ingredients: true, steps: true } })

    const normalizedDb = dbRecipes.map((r) => {
      const pantryMatchCount = r.ingredients.reduce((acc, ing) => pantryNames.includes(ing.name.toLowerCase()) ? acc + 1 : acc, 0)
      return { ...r, pantryMatchCount, totalIngredients: r.ingredients.length, usesExpiringItems: false }
    })

    // External results
    const external = await searchRecipesByIngredients(pantryNames)

    // Merge and dedupe by title
    const combinedMap = new Map<string, unknown>()
    for (const r of [...normalizedDb, ...external]) {
      if (difficulty && r.difficulty && r.difficulty !== difficulty) continue
      if (costLevel && r.costLevel && r.costLevel !== costLevel) continue
      const totalTime = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0)
      if (maxTime !== undefined && totalTime > maxTime) continue
      const key = (r.title || '').toLowerCase()
      const existing = combinedMap.get(key)
      if (!existing || (r.pantryMatchCount ?? 0) > (existing.pantryMatchCount ?? 0)) combinedMap.set(key, r)
    }

    const results = Array.from(combinedMap.values())
    // Sort: uses expiring items first (placeholder), then pantry match ratio
    results.sort((a, b) => {
      const aRatio = (a.pantryMatchCount ?? 0) / Math.max(a.totalIngredients ?? 1, 1)
      const bRatio = (b.pantryMatchCount ?? 0) / Math.max(b.totalIngredients ?? 1, 1)
      return bRatio - aRatio
    })

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
