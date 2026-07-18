import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { searchRecipesByIngredients, type RecipeSearchResult } from '@/lib/recipes/external-source'
import { ingredientMatchesPantry, isStapleIngredient, matchIngredientsToPantry } from '@/lib/recipes/enrich'

const querySchema = z.object({
  maxTimeMinutes: z.string().optional(),
  difficulty: z.string().optional(),
  costLevel: z.string().optional(),
  ingredients: z.string().optional(),
  matchMode: z.enum(['flexible', 'exact']).optional(),
})

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

type Ranked = RecipeSearchResult

function parseIngredientQuery(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && !isStapleIngredient(item))
    .slice(0, 8)
}

function hasAllMainIngredients(recipe: Ranked, pantryNames: string[]) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const mainIngredients = ingredients.filter((ingredient) => !isStapleIngredient(ingredient.name))
  if (mainIngredients.length === 0) return false
  return mainIngredients.every((ingredient) => pantryNames.some((pantryName) => ingredientMatchesPantry(ingredient.name, pantryName)))
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()))

    const maxTime = parsed.success && parsed.data.maxTimeMinutes ? Number(parsed.data.maxTimeMinutes) : undefined
    const difficulty = parsed.success ? parsed.data.difficulty : undefined
    const costLevel = parsed.success ? parsed.data.costLevel : undefined
    const requestedIngredients = parsed.success ? parseIngredientQuery(parsed.data.ingredients) : []
    const matchMode = parsed.success ? parsed.data.matchMode ?? 'flexible' : 'flexible'

    const [pantry, savedRows] = await Promise.all([
      prisma.pantryItem.findMany({ where: { userId } }),
      prisma.savedRecipe.findMany({ where: { userId }, select: { recipeId: true } }),
    ])
    const pantryNames = requestedIngredients.length > 0 ? requestedIngredients : pantry.map((p) => p.name)
    const pantryForMatching = requestedIngredients.length > 0
      ? requestedIngredients.map((name) => ({ name, expirationDate: new Date('2999-12-31') }))
      : pantry
    const savedIds = new Set(savedRows.map((s) => s.recipeId))

    console.info('[recipes:suggestions] building suggestions', {
      userId,
      source: requestedIngredients.length > 0 ? 'manual-ingredients' : 'pantry',
      ingredientCount: pantryNames.length,
      matchMode,
    })

    // Get matching recipes already in DB
    const dbRecipes = await prisma.recipe.findMany({ where: { OR: [{ isPublic: true }, { userId }] }, include: { ingredients: true, steps: true } })

    const normalizedDb: Ranked[] = dbRecipes.map((r) => {
      const match = matchIngredientsToPantry(r.ingredients, pantryForMatching)
      return { ...r, ...match, isSaved: savedIds.has(r.id) }
    })

    // External results
    const external: Ranked[] = (await searchRecipesByIngredients(pantryNames)).map((recipe) => {
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
      const match = matchIngredientsToPantry(ingredients, pantryForMatching)
      return { ...recipe, ...match, isSaved: savedIds.has(recipe.id) }
    })

    // Merge and dedupe by title
    const combinedMap = new Map<string, Ranked>()
    for (const r of [...normalizedDb, ...external]) {
      if (difficulty && r.difficulty && r.difficulty !== difficulty) continue
      if (costLevel && r.costLevel && r.costLevel !== costLevel) continue
      const totalTime = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0)
      if (maxTime !== undefined && totalTime > maxTime) continue
      if (matchMode === 'exact' && !hasAllMainIngredients(r, pantryNames)) continue
      const key = (r.title || '').toLowerCase()
      const existing = combinedMap.get(key)
      if (!existing || (r.pantryMatchCount ?? 0) > (existing.pantryMatchCount ?? 0)) combinedMap.set(key, r)
    }

    const results = Array.from(combinedMap.values())
    results.sort((a, b) => {
      if (Boolean(b.usesExpiringItems) !== Boolean(a.usesExpiringItems)) return b.usesExpiringItems ? 1 : -1
      const aRatio = (a.pantryMatchCount ?? 0) / Math.max(a.totalIngredients ?? 1, 1)
      const bRatio = (b.pantryMatchCount ?? 0) / Math.max(b.totalIngredients ?? 1, 1)
      return bRatio - aRatio
    })

    return NextResponse.json(results)
  } catch (err) {
    console.error('Failed to build recipe suggestions:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
