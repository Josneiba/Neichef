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
  flavor: z.enum(['any', 'sweet', 'savory']).optional(),
  mealType: z.enum(['any', 'breakfast', 'lunch', 'dinner', 'snack', 'dessert']).optional(),
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

function recipeText(recipe: Ranked) {
  const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ') : ''
  return `${recipe.title ?? ''} ${recipe.description ?? ''} ${tags}`.toLowerCase()
}

function matchesFlavor(recipe: Ranked, flavor: 'any' | 'sweet' | 'savory') {
  if (flavor === 'any') return true
  const text = recipeText(recipe)
  const sweetWords = /(dessert|cake|cookie|brownie|pudding|sweet|chocolate|sugar|honey|cream|pie|tart|custard|ice cream)/
  if (flavor === 'sweet') return sweetWords.test(text)
  return !sweetWords.test(text)
}

function matchesMealType(recipe: Ranked, mealType: 'any' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert') {
  if (mealType === 'any') return true
  const text = recipeText(recipe)
  const patterns: Record<Exclude<typeof mealType, 'any'>, RegExp> = {
    breakfast: /(breakfast|brunch|egg|omelette|pancake|toast|oat|cereal)/,
    lunch: /(lunch|salad|sandwich|wrap|soup|bowl)/,
    dinner: /(dinner|main|roast|stew|curry|pasta|rice|beef|chicken|fish|seafood|pork)/,
    snack: /(snack|dip|toast|chips|appetizer|starter|bite)/,
    dessert: /(dessert|cake|cookie|brownie|pudding|chocolate|pie|tart|custard|sweet)/,
  }
  return patterns[mealType].test(text)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()))

    const maxTime = parsed.success && parsed.data.maxTimeMinutes ? Number(parsed.data.maxTimeMinutes) : undefined
    const difficulty = parsed.success ? parsed.data.difficulty : undefined
    const costLevel = parsed.success ? parsed.data.costLevel : undefined
    const requestedIngredients = parsed.success ? parseIngredientQuery(parsed.data.ingredients) : []
    const matchMode = parsed.success ? parsed.data.matchMode ?? 'flexible' : 'flexible'
    const flavor = parsed.success ? parsed.data.flavor ?? 'any' : 'any'
    const mealType = parsed.success ? parsed.data.mealType ?? 'any' : 'any'

    // Try to get user ID, but don't fail if user is not authenticated
    let userId: string | null = null
    try {
      userId = await getUserId()
    } catch {
      userId = null
    }

    // Fetch pantry items only if user is authenticated and no ingredients were manually provided
    let pantry: { name: string; expirationDate: Date }[] = []
    let savedIds = new Set<string>()
    
    if (userId && requestedIngredients.length === 0) {
      const [pantryItems, savedRows] = await Promise.all([
        prisma.pantryItem.findMany({ where: { userId } }),
        prisma.savedRecipe.findMany({ where: { userId }, select: { recipeId: true } }),
      ])
      pantry = pantryItems
      savedIds = new Set(savedRows.map((s) => s.recipeId))
    }

    const pantryNames = requestedIngredients.length > 0 ? requestedIngredients : pantry.map((p) => p.name)
    const pantryForMatching = requestedIngredients.length > 0
      ? requestedIngredients.map((name) => ({ name, expirationDate: new Date('2999-12-31') }))
      : pantry

    console.info('[recipes:suggestions] building suggestions', {
      userId,
      source: requestedIngredients.length > 0 ? 'manual-ingredients' : 'pantry',
      ingredientCount: pantryNames.length,
      matchMode,
      flavor,
      mealType,
    })

    // Get matching recipes already in DB
    let normalizedDb: Ranked[] = []
    try {
      const dbRecipes = await prisma.recipe.findMany({ where: { OR: [{ isPublic: true }, { userId }] }, include: { ingredients: true, steps: true } })
      normalizedDb = dbRecipes.map((r) => {
        const match = matchIngredientsToPantry(r.ingredients, pantryForMatching)
        return { ...r, ...match, isSaved: savedIds.has(r.id), isOwner: r.userId === userId }
      })
    } catch (err) {
      console.warn('[recipes:suggestions] database query failed, will use external recipes only', err)
    }

    // External results
    let external: Ranked[] = []
    try {
      external = (await searchRecipesByIngredients(pantryNames)).map((recipe) => {
        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
        const match = matchIngredientsToPantry(ingredients, pantryForMatching)
        return { ...recipe, ...match, isSaved: savedIds.has(recipe.id), isOwner: false }
      })
    } catch (err) {
      console.error('[recipes:suggestions] external search failed', err)
    }

    // Merge and dedupe by title
    const combinedMap = new Map<string, Ranked>()
    for (const r of [...normalizedDb, ...external]) {
      if (difficulty && r.difficulty && r.difficulty !== difficulty) continue
      if (costLevel && r.costLevel && r.costLevel !== costLevel) continue
      const totalTime = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0)
      if (maxTime !== undefined && totalTime > maxTime) continue
      if (!matchesFlavor(r, flavor)) continue
      if (!matchesMealType(r, mealType)) continue
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
