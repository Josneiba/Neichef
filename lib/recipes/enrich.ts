import type { PantryItem } from '@prisma/client'

type IngredientLike = { name: string; unit?: string; amount?: number }

const STAPLE_INGREDIENTS = [
  'salt',
  'kosher salt',
  'sea salt',
  'table salt',
  'black pepper',
  'pepper',
  'water',
  'ice',
  'olive oil',
  'vegetable oil',
  'canola oil',
  'cooking oil',
  'oil',
  'cooking spray',
]

const DESCRIPTOR_WORDS = new Set([
  'fresh',
  'dried',
  'dry',
  'ground',
  'chopped',
  'minced',
  'sliced',
  'diced',
  'crushed',
  'grated',
  'shredded',
  'small',
  'medium',
  'large',
  'extra',
  'virgin',
  'fine',
  'coarse',
  'optional',
  'to',
  'taste',
])

export function normalizeFoodName(name: string) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !DESCRIPTOR_WORDS.has(word))
    .join(' ')
    .trim()
}

export function isStapleIngredient(name: string) {
  const normalized = normalizeFoodName(name)
  return STAPLE_INGREDIENTS.some((staple) => normalized === staple || normalized.endsWith(` ${staple}`))
}

export function ingredientMatchesPantry(ingredientName: string, pantryName: string) {
  const ingredient = normalizeFoodName(ingredientName)
  const pantry = normalizeFoodName(pantryName)
  if (!ingredient || !pantry) return false
  return pantry.includes(ingredient) || ingredient.includes(pantry)
}

/**
 * Compares a recipe's ingredient list against a user's pantry to compute
 * the fields the frontend Recipe type expects (pantryMatchCount,
 * totalIngredients, usesExpiringItems) plus a per-ingredient `inPantry`
 * flag. Salt, water, pepper, and cooking oils are treated as pantry staples:
 * they do not count against the main-ingredient score and are not shown as
 * missing just because the person did not explicitly add them.
 */
export function matchIngredientsToPantry<T extends IngredientLike>(
  ingredients: T[],
  pantryItems: Pick<PantryItem, 'name' | 'expirationDate'>[],
) {
  const now = new Date()
  const soonThreshold = new Date()
  soonThreshold.setDate(now.getDate() + 3)

  let pantryMatchCount = 0
  let totalIngredients = 0
  let usesExpiringItems = false

  const enrichedIngredients = ingredients.map((ingredient) => {
    const isStaple = isStapleIngredient(ingredient.name)
    const matchedPantryItem = pantryItems.find((p) => ingredientMatchesPantry(ingredient.name, p.name))
    const inPantry = isStaple || Boolean(matchedPantryItem)

    if (!isStaple) {
      totalIngredients += 1
      if (inPantry) pantryMatchCount += 1
    }
    if (matchedPantryItem && matchedPantryItem.expirationDate <= soonThreshold) {
      usesExpiringItems = true
    }

    return { ...ingredient, inPantry, isStaple }
  })

  return {
    ingredients: enrichedIngredients,
    pantryMatchCount,
    totalIngredients,
    usesExpiringItems,
  }
}
