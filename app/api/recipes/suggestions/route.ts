import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchRandomMeals, searchRecipesByIngredients, type RecipeSearchResult } from '@/lib/recipes/external-source'
import { ingredientMatchesPantry, isStapleIngredient, matchIngredientsToPantry, normalizeFoodName, parseIngredientList } from '@/lib/recipes/enrich'
import { isDbAvailable, reportDbFailure, markDbSuccess } from '@/lib/dbCircuit'

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
  return parseIngredientList(value ?? '')
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
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ingredient) => ingredient.name).join(' ') : ''
  return `${recipe.title ?? ''} ${recipe.description ?? ''} ${tags} ${ingredients}`.toLowerCase()
}

function matchesSearchTerms(recipe: Ranked, searchTerms: string[], matchMode: 'flexible' | 'exact') {
  if (searchTerms.length === 0) return true
  const text = recipeText(recipe)
  const matches = searchTerms.map((term) => term.toLowerCase().trim()).filter(Boolean).map((term) => {
    const normalizedTerm = term.replace(/[^a-z0-9\s]/gi, '')
    return text.includes(normalizedTerm)
  })

  if (matchMode === 'exact') {
    return matches.every(Boolean)
  }
  return matches.some(Boolean)
}

function buildSearchFilter(searchTerms: string[], matchMode: 'flexible' | 'exact') {
  const terms = searchTerms
    .map((term) => normalizeFoodName(term))
    .filter(Boolean)
    .slice(0, 8)

  if (terms.length === 0) return undefined

  const termClauses = terms.map((term) => ({
    OR: [
      { title: { contains: term, mode: 'insensitive' as const } },
      { description: { contains: term, mode: 'insensitive' as const } },
      { ingredients: { some: { name: { contains: term, mode: 'insensitive' as const } } } },
      { tags: { has: term } },
    ],
  }))

  return matchMode === 'exact' ? { AND: termClauses } : { OR: termClauses }
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
    const freeText = parsed.success && parsed.data.ingredients ? normalizeFoodName(parsed.data.ingredients) : ''
    const queryTerms = requestedIngredients.length > 0
      ? requestedIngredients
      : freeText.split(/\s+/).filter(Boolean).slice(0, 8)

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
      if (isDbAvailable()) {
        try {
          const [pantryItems, savedRows] = await Promise.all([
            prisma.pantryItem.findMany({ where: { userId } }),
            prisma.savedRecipe.findMany({ where: { userId }, select: { recipeId: true } }),
          ])
          pantry = pantryItems
          savedIds = new Set(savedRows.map((s) => s.recipeId))
        } catch (err: unknown) {
          console.warn('[recipes:suggestions] pantry/saved lookup failed; falling back to external-only', err)
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
          pantry = []
          savedIds = new Set()
        }
      } else {
        // DB not available — proceed with external-only suggestions
        pantry = []
        savedIds = new Set()
      }
    }

    const pantryNames = requestedIngredients.length > 0 ? requestedIngredients : pantry.map((p) => p.name)
    const pantryForMatching = requestedIngredients.length > 0
      ? requestedIngredients.map((name) => ({ name, expirationDate: new Date('2999-12-31') }))
      : pantry

    console.info('[recipes:suggestions] building suggestions', {
      userId,
      source: requestedIngredients.length > 0 ? 'manual-ingredients' : 'pantry',
      ingredientCount: pantryNames.length,
      queryTerms,
      matchMode,
      flavor,
      mealType,
    })

    // Get matching recipes already in DB
    let normalizedDb: Ranked[] = []
    try {
      if (isDbAvailable()) {
        const dbWhere = { OR: [{ isPublic: true }, { userId }] }
        const searchFilter = buildSearchFilter(queryTerms, matchMode)
        const dbRecipes = await prisma.recipe.findMany({
          where: searchFilter ? { AND: [dbWhere, searchFilter] } : dbWhere,
          include: { ingredients: true, steps: true },
        })
        normalizedDb = dbRecipes.map((r) => {
          const match = matchIngredientsToPantry(r.ingredients, pantryForMatching)
          return { ...r, ...match, isSaved: savedIds.has(r.id), isOwner: r.userId === userId }
        })
        // success — reset circuit
        markDbSuccess()
      } else {
        console.warn('[recipes:suggestions] DB unavailable; skipping local recipes')
      }
    } catch (err: unknown) {
      console.warn('[recipes:suggestions] database query failed, will use external recipes only', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    }

    // External results
    let external: Ranked[] = []
    try {
      const searchQuery = queryTerms.length > 0 ? queryTerms : pantryNames.filter(Boolean)
      if (searchQuery.length > 0) {
        external = (await searchRecipesByIngredients(searchQuery)).map((recipe) => {
          const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
          const match = matchIngredientsToPantry(ingredients, pantryForMatching)
          return { ...recipe, ...match, isSaved: savedIds.has(recipe.id), isOwner: false }
        })
      } else {
        external = (await fetchRandomMeals(20)).map((recipe) => {
          const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
          const match = matchIngredientsToPantry(ingredients, pantryForMatching)
          return { ...recipe, ...match, isSaved: savedIds.has(recipe.id), isOwner: false }
        })
      }
    } catch (err) {
      console.error('[recipes:suggestions] external search failed', err)
    }

    // Merge and dedupe by title
    const combinedMap = new Map<string, Ranked>()
    for (const r of [...normalizedDb, ...external]) {
      if (difficulty && r.difficulty && r.difficulty !== difficulty) continue
      if (costLevel && r.costLevel && r.costLevel !== costLevel) continue
      const totalTime = r.prepTimeMinutes != null && r.cookTimeMinutes != null ? r.prepTimeMinutes + r.cookTimeMinutes : undefined
      if (maxTime !== undefined && totalTime !== undefined && totalTime > maxTime) continue
      if (!matchesFlavor(r, flavor)) continue
      if (!matchesMealType(r, mealType)) continue
      if (!matchesSearchTerms(r, queryTerms, matchMode)) continue
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

    const maxResults = queryTerms.length > 0 ? 50 : 10
    return NextResponse.json(results.slice(0, maxResults))
  } catch (err) {
    console.error('Failed to build recipe suggestions:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
