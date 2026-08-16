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

export function dedupeRecipes<T extends { id?: string; title?: string; ingredients?: Array<{ name?: string }> }>(recipes: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  for (const recipe of recipes) {
    const rawId = String(recipe?.id ?? '').trim().replace(/^external-/, '')
    const title = String(recipe?.title ?? '').trim()
    const normalizedTitle = normalize(title)
    const ingredientKey = Array.isArray(recipe?.ingredients)
      ? recipe.ingredients
          .map((ingredient) => ingredient?.name ?? '')
          .filter(Boolean)
          .map((name) => normalize(name))
          .sort()
          .join('|')
      : ''

    const signatures = [
      rawId ? `id:${rawId}` : '',
      normalizedTitle ? `title:${normalizedTitle}` : '',
      normalizedTitle && ingredientKey ? `title-ingredients:${normalizedTitle}|${ingredientKey}` : '',
    ].filter(Boolean)

    if (signatures.some((signature) => seen.has(signature))) {
      continue
    }

    unique.push(recipe)
    for (const signature of signatures) seen.add(signature)
  }

  return unique
}

export function prioritizeForHome(pantry: PantryItem[], recipes: Recipe[], limit = 3) {
  const scored = filterAndScoreRecipes(pantry, recipes, { minMatchPercentage: 0.2, maxMissingRequired: 6, boostExpiringDays: 3 })
  const expiringFirst = scored.filter((s) => s.expiringItemsUsedCount > 0)
  const others = scored.filter((s) => s.expiringItemsUsedCount === 0)
  return [...expiringFirst, ...others].slice(0, limit).map((s) => ({ id: s.recipe.id, title: s.recipe.title, pantryMatchCount: s.matchedIngredients.length, usesExpiringItems: s.expiringItemsUsedCount > 0 }))
}
