import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchRandomMeals, searchRecipesByIngredients } from '@/lib/recipes/external-source'
import { isStapleIngredient, normalizeFoodName, parseIngredientList } from '@/lib/recipes/enrich'
import { filterAndScoreRecipes, type PantryItem, type Recipe } from '@/lib/recipes/engine'
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

function parseIngredientQuery(value: string | undefined) {
  return parseIngredientList(value ?? '')
    .filter((item) => item && !isStapleIngredient(item))
    .slice(0, 8)
}

type RecipeTextLike = {
  title?: string
  description?: string
  tags?: string[]
  ingredients?: { name: string }[]
}

function recipeText(recipe: RecipeTextLike) {
  const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ') : ''
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ingredient) => ingredient.name).join(' ') : ''
  return `${recipe.title ?? ''} ${recipe.description ?? ''} ${tags} ${ingredients}`.toLowerCase()
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

function matchesFlavor(recipe: RecipeTextLike, flavor: 'any' | 'sweet' | 'savory') {
  if (flavor === 'any') return true
  const text = recipeText(recipe)
  const sweetWords = /(dessert|cake|cookie|brownie|pudding|sweet|chocolate|sugar|honey|cream|pie|tart|custard|ice cream)/
  if (flavor === 'sweet') return sweetWords.test(text)
  return !sweetWords.test(text)
}

function matchesMealType(recipe: RecipeTextLike, mealType: 'any' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert') {
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
    let pantry: PantryItem[] = []
    let savedIds = new Set<string>()

    if (userId && requestedIngredients.length === 0) {
      if (isDbAvailable()) {
        try {
          const [pantryItems, savedRows] = await Promise.all([
            prisma.pantryItem.findMany({
              where: { userId },
              select: { id: true, name: true, quantity: true, unit: true, expirationDate: true },
            }),
            prisma.savedRecipe.findMany({ where: { userId }, select: { recipeId: true } }),
          ])
          pantry = pantryItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity ?? 1,
            unit: item.unit ?? 'pcs',
            expiresAt: item.expirationDate,
          }))
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
    const pantryForMatching: PantryItem[] = requestedIngredients.length > 0
      ? requestedIngredients.map((name) => ({ id: name, name, quantity: 1, unit: 'pcs', expiresAt: new Date('2999-12-31') }))
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

    const recipes: Recipe[] = []

    if (isDbAvailable()) {
      try {
        const dbWhere = { OR: [{ isPublic: true }, { userId }] }
        const searchFilter = buildSearchFilter(queryTerms, matchMode)
        const dbRecipes = await prisma.recipe.findMany({
          where: searchFilter ? { AND: [dbWhere, searchFilter] } : dbWhere,
          include: { ingredients: true },
        })

        recipes.push(...dbRecipes.map((r) => ({
          id: r.id,
          title: r.title,
          ingredients: r.ingredients.map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
          })),
          prepTimeMinutes: r.prepTimeMinutes,
          cookTimeMinutes: r.cookTimeMinutes,
          difficulty: r.difficulty,
          costLevel: r.costLevel,
        })))

        markDbSuccess()
      } catch (err: unknown) {
        console.warn('[recipes:suggestions] database query failed, will use external recipes only', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
      }
    } else {
      console.warn('[recipes:suggestions] DB unavailable; skipping local recipes')
    }

    try {
      const searchQuery = queryTerms.length > 0 ? queryTerms : pantryNames.filter(Boolean)
      const externalRecipes = searchQuery.length > 0
        ? await searchRecipesByIngredients(searchQuery)
        : await fetchRandomMeals(20)

      recipes.push(...externalRecipes.map((recipe) => {
        const ingredients = Array.isArray(recipe.ingredients)
          ? recipe.ingredients
              .map((ingredient) => {
                const rawIngredient = ingredient as Record<string, unknown>
                const name = String(rawIngredient.name ?? '').trim()
                if (!name) return null
                return {
                  id: String(rawIngredient.id ?? name),
                  name,
                  amount: Number(rawIngredient.amount ?? 1),
                  unit: String(rawIngredient.unit ?? 'pcs'),
                }
              })
              .filter((ingredient): ingredient is { id: string; name: string; amount: number; unit: string } => ingredient !== null)
          : []

        return {
          id: recipe.id,
          title: recipe.title ?? 'Untitled recipe',
          ingredients,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          difficulty: recipe.difficulty,
          costLevel: recipe.costLevel,
        }
      }))
    } catch (err) {
      console.error('[recipes:suggestions] external search failed', err)
    }

    const scoredSuggestions = filterAndScoreRecipes(pantryForMatching, recipes, {
      minMatchPercentage: 0.35,
      maxMissingRequired: 4,
      boostExpiringDays: 3,
    })

    const result = scoredSuggestions
      .filter((candidate) => {
        if (difficulty && candidate.recipe.difficulty && candidate.recipe.difficulty !== difficulty) return false
        if (costLevel && candidate.recipe.costLevel && candidate.recipe.costLevel !== costLevel) return false
        const totalTime = candidate.recipe.prepTimeMinutes != null && candidate.recipe.cookTimeMinutes != null
          ? candidate.recipe.prepTimeMinutes + candidate.recipe.cookTimeMinutes
          : undefined
        if (maxTime !== undefined && totalTime !== undefined && totalTime > maxTime) return false
        return matchesFlavor(candidate.recipe, flavor) && matchesMealType(candidate.recipe, mealType)
      })
      .slice(0, queryTerms.length > 0 ? 50 : 10)
      .map((candidate) => ({
        id: candidate.recipe.id,
        title: candidate.recipe.title,
        ingredients: candidate.recipe.ingredients,
        prepTimeMinutes: candidate.recipe.prepTimeMinutes,
        cookTimeMinutes: candidate.recipe.cookTimeMinutes,
        difficulty: candidate.recipe.difficulty,
        costLevel: candidate.recipe.costLevel,
        pantryMatchCount: candidate.matchedIngredients.length,
        totalIngredients: candidate.recipe.ingredients.length,
        usesExpiringItems: candidate.expiringItemsUsedCount > 0,
        isSaved: savedIds.has(candidate.recipe.id),
      }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('Failed to build recipe suggestions:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
