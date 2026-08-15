import { calculateSimilarity } from '@/lib/pantry/fuzzy-match'
import { ingredientMatchesPantry } from '@/lib/recipes/enrich'

export interface PantryItem {
  id: string
  name: string
  quantity: number
  unit: string
  expiresAt?: Date | null
}

export interface RecipeIngredient {
  id: string
  name: string
  amount: number
  unit: string
  isOptional?: boolean
}

export interface Recipe {
  id: string
  title: string
  description?: string
  imageUrl?: string
  ingredients: RecipeIngredient[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  difficulty?: string
  costLevel?: string
}

export interface MatchResult {
  recipe: Recipe
  matchPercentage: number
  score: number
  matchedIngredients: { required: RecipeIngredient; pantryItem: PantryItem }[]
  missingIngredients: RecipeIngredient[]
  expiringItemsUsedCount: number
}

export interface FilterOptions {
  minMatchPercentage?: number
  maxMissingRequired?: number
  boostExpiringDays?: number
}

export function filterAndScoreRecipes(
  pantry: PantryItem[],
  recipes: Recipe[],
  options: FilterOptions = {},
): MatchResult[] {
  const {
    minMatchPercentage = 0.4,
    maxMissingRequired = 3,
    boostExpiringDays = 3,
  } = options

  const now = new Date()
  const expiringThreshold = new Date(now)
  expiringThreshold.setDate(now.getDate() + boostExpiringDays)

  const results: MatchResult[] = []

  for (const recipe of recipes) {
    const requiredIngredients = recipe.ingredients.filter((i) => !i.isOptional)
    const totalRequired = requiredIngredients.length

    if (totalRequired === 0) continue

    const matchedIngredients: { required: RecipeIngredient; pantryItem: PantryItem }[] = []
    const missingIngredients: RecipeIngredient[] = []
    let expiringItemsUsedCount = 0

    for (const req of recipe.ingredients) {
      const matchedPantry = pantry.find((p) => {
        const genericMatch = calculateSimilarity(req.name, p.name) >= 0.72
        const pantryAliasMatch = ingredientMatchesPantry(req.name, p.name)
        return genericMatch || pantryAliasMatch
      })

      if (matchedPantry) {
        matchedIngredients.push({ required: req, pantryItem: matchedPantry })

        if (matchedPantry.expiresAt && matchedPantry.expiresAt <= expiringThreshold) {
          expiringItemsUsedCount += 1
        }
      } else if (!req.isOptional) {
        missingIngredients.push(req)
      }
    }

    const matchedRequiredCount = matchedIngredients.filter((m) => !m.required.isOptional).length
    const matchPercentage = matchedRequiredCount / totalRequired

    if (matchPercentage < minMatchPercentage) continue
    if (missingIngredients.length > maxMissingRequired) continue

    let score = matchPercentage * 100
    // Strongly prefer recipes that use expiring items
    score += expiringItemsUsedCount * 30
    // Penalize missing ingredients lightly
    score -= missingIngredients.length * 3

    results.push({
      recipe,
      matchPercentage: Math.round(matchPercentage * 100) / 100,
      score: Math.max(0, Math.round(score * 100) / 100),
      matchedIngredients,
      missingIngredients,
      expiringItemsUsedCount,
    })
  }

  return results.sort((a, b) => b.score - a.score)
}

export function dedupeRecipes<T extends { id?: string; title?: string }>(recipes: T[]): T[] {
  const seen = new Map<string, T>()

  for (const recipe of recipes) {
    const id = String(recipe?.id ?? '').trim()
    const title = String(recipe?.title ?? '').trim().toLowerCase()
    const key = id || title || `${Math.random()}`

    if (!seen.has(key)) {
      seen.set(key, recipe)
      continue
    }

    const existing = seen.get(key)
    if (!existing) continue

    const existingTitle = String(existing?.title ?? '').trim().toLowerCase()
    const existingId = String(existing?.id ?? '').trim()

    if (!existingId && existingTitle && title && existingTitle === title) {
      continue
    }

    if (!existingId && id && existingTitle && title && existingTitle === title) {
      continue
    }

    if (id && existingId && existingId === id) {
      continue
    }

    const fallbackKey = `${title || 'untitled'}:${String(recipe?.description ?? '')}`
    if (!seen.has(fallbackKey)) seen.set(fallbackKey, recipe)
  }

  return Array.from(seen.values())
}

export function prioritizeForHome(pantry: PantryItem[], recipes: Recipe[], limit = 3) {
  const scored = filterAndScoreRecipes(pantry, recipes, { minMatchPercentage: 0.2, maxMissingRequired: 6, boostExpiringDays: 3 })
  const expiringFirst = scored.filter((s) => s.expiringItemsUsedCount > 0)
  const others = scored.filter((s) => s.expiringItemsUsedCount === 0)
  return [...expiringFirst, ...others].slice(0, limit).map((s) => ({ id: s.recipe.id, title: s.recipe.title, pantryMatchCount: s.matchedIngredients.length, usesExpiringItems: s.expiringItemsUsedCount > 0 }))
}
