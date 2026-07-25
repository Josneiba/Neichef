import type { NutritionPlan, NutritionRestriction, PantryItem } from '@prisma/client'
import type { IngredientLike } from '@/lib/recipes/enrich'
import { ingredientMatchesPantry, matchIngredientsToPantry, normalizeFoodName } from '@/lib/recipes/enrich'

type NutritionPlanWithRestrictions = NutritionPlan & { restrictions?: NutritionRestriction[] }

const PROTEIN_KEYWORDS = [
  'chicken',
  'beef',
  'pork',
  'fish',
  'turkey',
  'tofu',
  'egg',
  'lentil',
  'bean',
  'shrimp',
  'tuna',
  'salmon',
  'steak',
  'cheese',
  'yogurt',
  'cottage',
  'tempeh',
  'seitan',
  'edamame',
  'chickpea',
]

const CARB_KEYWORDS = [
  'pasta',
  'rice',
  'bread',
  'tortilla',
  'oat',
  'oats',
  'quinoa',
  'corn',
  'potato',
  'rice',
  'barley',
  'noodle',
  'beans',
  'lentil',
  'sweet potato',
  'farro',
  'buckwheat',
  'couscous',
]

const FAT_KEYWORDS = [
  'avocado',
  'almond',
  'walnut',
  'cashew',
  'pecan',
  'bacon',
  'butter',
  'cream',
  'coconut',
  'olive oil',
  'mayonnaise',
  'cheese',
  'egg yolk',
  'peanut',
  'nut',
  'seed',
  'sesame',
  'chia',
]

const normalizeIngredientName = (name: string) => normalizeFoodName(name)

function countMatches(ingredients: IngredientLike[], keywords: string[]) {
  const normalizedKeywords = keywords.map(normalizeFoodName)
  return ingredients.reduce((count, ingredient) => {
    const normalized = normalizeIngredientName(ingredient.name)
    if (!normalized) return count
    return normalizedKeywords.some((keyword) => normalized.includes(keyword)) ? count + 1 : count
  }, 0)
}

function computeNutritionProfileScore(ingredients: IngredientLike[], plan: NutritionPlanWithRestrictions | null) {
  if (!plan) return 0

  const proteinTarget = plan.proteinTargetG ?? 0
  const carbsTarget = plan.carbsTargetG ?? 0
  const fatTarget = plan.fatTargetG ?? 0
  const totalTarget = proteinTarget + carbsTarget + fatTarget
  if (totalTarget <= 0) return 0

  const proteinMatches = countMatches(ingredients, PROTEIN_KEYWORDS)
  const carbMatches = countMatches(ingredients, CARB_KEYWORDS)
  const fatMatches = countMatches(ingredients, FAT_KEYWORDS)

  const totalMatches = Math.max(1, proteinMatches + carbMatches + fatMatches)
  const proteinRatio = proteinMatches / totalMatches
  const carbRatio = carbMatches / totalMatches
  const fatRatio = fatMatches / totalMatches

  const weighted =
    (proteinTarget / totalTarget) * proteinRatio +
    (carbsTarget / totalTarget) * carbRatio +
    (fatTarget / totalTarget) * fatRatio

  return Number((weighted * 100).toFixed(0))
}

function getRestrictionSummary(
  ingredients: IngredientLike[],
  restrictions: NutritionRestriction[] | null | undefined,
) {
  const normalizedIngredientNames = ingredients.map((ingredient) => normalizeIngredientName(ingredient.name))

  let avoidCount = 0
  let limitCount = 0
  let preferCount = 0
  let allergyCount = 0
  const matchedAllergies: string[] = []

  for (const restriction of restrictions ?? []) {
    const normalizedRestriction = normalizeFoodName(restriction.ingredientName)
    if (!normalizedRestriction) continue

    const matches = normalizedIngredientNames.some(
      (normalizedIngredient) =>
        normalizedIngredient.includes(normalizedRestriction) ||
        normalizedRestriction.includes(normalizedIngredient) ||
        ingredientMatchesPantry(normalizedIngredient, normalizedRestriction),
    )

    if (!matches) continue

    switch (restriction.type) {
      case 'allergy':
        allergyCount += 1
        matchedAllergies.push(restriction.ingredientName)
        break
      case 'avoid':
        avoidCount += 1
        break
      case 'limit':
        limitCount += 1
        break
      case 'prefer':
        preferCount += 1
        break
      default:
        break
    }
  }

  return { avoidCount, limitCount, preferCount, allergyCount, matchedAllergies }
}

export type NutritionRecipeScore = {
  score: number
  pantryMatchCount: number
  totalIngredients: number
  usesExpiringItems: boolean
  excludedByAllergy: boolean
  nutritionProfileScore: number
  restrictionScore: number
  reasons: string[]
}

export function scoreRecipeForNutritionPlan(
  recipe: { ingredients: IngredientLike[];
            title?: string;
            description?: string;
            tags?: string[] },
  plan: NutritionPlanWithRestrictions | null,
  pantryItems: Pick<PantryItem, 'name' | 'expirationDate'>[] = [],
): NutritionRecipeScore {
  const pantryMatch = matchIngredientsToPantry(recipe.ingredients, pantryItems)
  const nutritionProfileScore = computeNutritionProfileScore(recipe.ingredients, plan)
  const restriction = getRestrictionSummary(recipe.ingredients, plan?.restrictions)

  const pantryRatio = pantryMatch.totalIngredients > 0 ? pantryMatch.pantryMatchCount / pantryMatch.totalIngredients : 0
  const pantryScore = pantryMatch.pantryMatchCount * 5 + pantryRatio * 20
  const expiringBonus = pantryMatch.usesExpiringItems ? 16 : 0
  const preferBonus = restriction.preferCount * 14
  const avoidPenalty = restriction.avoidCount * 12
  const limitPenalty = restriction.limitCount * 5

  const rawScore = pantryScore + expiringBonus + (nutritionProfileScore * 0.25) + preferBonus - avoidPenalty - limitPenalty
  const score = restriction.allergyCount > 0 ? -Infinity : Math.max(0, Math.round(rawScore))

  const reasons: string[] = []
  if (pantryMatch.pantryMatchCount > 0) {
    reasons.push(`${pantryMatch.pantryMatchCount}/${pantryMatch.totalIngredients} main ingredients are already in your pantry`)
  }
  if (pantryMatch.usesExpiringItems) {
    reasons.push('Uses pantry items that are expiring soon')
  }
  if (nutritionProfileScore > 0) {
    reasons.push('Matches your nutrition profile')
  }
  if (restriction.preferCount > 0) {
    reasons.push('Includes preferred ingredients')
  }
  if (restriction.avoidCount > 0) {
    reasons.push('Contains ingredients you prefer to avoid')
  }
  if (restriction.limitCount > 0) {
    reasons.push('Contains ingredients you want to limit')
  }
  if (restriction.allergyCount > 0) {
    reasons.push(`Excluded because of allergy: ${restriction.matchedAllergies.join(', ')}`)
  }

  return {
    score,
    pantryMatchCount: pantryMatch.pantryMatchCount,
    totalIngredients: pantryMatch.totalIngredients,
    usesExpiringItems: pantryMatch.usesExpiringItems,
    excludedByAllergy: restriction.allergyCount > 0,
    nutritionProfileScore,
    restrictionScore: preferBonus - avoidPenalty - limitPenalty,
    reasons,
  }
}
