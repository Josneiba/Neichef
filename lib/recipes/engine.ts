import { calculateSimilarity } from '@/lib/pantry/fuzzy-match'

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
      const matchedPantry = pantry.find((p) => calculateSimilarity(req.name, p.name) >= 0.7)

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
    score += expiringItemsUsedCount * 15
    score -= missingIngredients.length * 5

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
