import type { PantryItem, RecipeIngredient } from '@/lib/types'

const massUnits = new Set(['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds'])
const volumeUnits = new Set(['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'])

function toBaseUnit(quantity: number, unit: string) {
  const normalized = (unit ?? '').trim().toLowerCase()
  if (['g', 'gram', 'grams'].includes(normalized)) return quantity
  if (['kg', 'kilogram', 'kilograms'].includes(normalized)) return quantity * 1000
  if (['oz', 'ounce', 'ounces'].includes(normalized)) return quantity * 28.3495
  if (['lb', 'lbs', 'pound', 'pounds'].includes(normalized)) return quantity * 453.592
  if (['ml', 'milliliter', 'milliliters'].includes(normalized)) return quantity
  if (['l', 'liter', 'liters'].includes(normalized)) return quantity * 1000
  return quantity
}

function fromBaseUnit(value: number, unit: string) {
  const normalized = (unit ?? '').trim().toLowerCase()
  if (['g', 'gram', 'grams'].includes(normalized)) return value
  if (['kg', 'kilogram', 'kilograms'].includes(normalized)) return value / 1000
  if (['oz', 'ounce', 'ounces'].includes(normalized)) return value / 28.3495
  if (['lb', 'lbs', 'pound', 'pounds'].includes(normalized)) return value / 453.592
  if (['ml', 'milliliter', 'milliliters'].includes(normalized)) return value
  if (['l', 'liter', 'liters'].includes(normalized)) return value / 1000
  return value
}

export function servingsMultiplier(selectedServings: number, recipeServings: number) {
  if (!recipeServings || recipeServings <= 0) return 1
  return Math.max(0, selectedServings / recipeServings)
}

export function scaleIngredientAmount(amount: number, multiplier: number) {
  return Number((amount * multiplier).toFixed(4))
}

export function consumeRecipeFromPantry(
  pantry: PantryItem[],
  ingredients: RecipeIngredient[],
  selectedServings: number,
  recipeServings: number,
) {
  const multiplier = servingsMultiplier(selectedServings, recipeServings)

  return pantry.map((item) => {
    const ingredient = ingredients.find((ing) => ing.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    if (!ingredient) return item

    const itemUnit = (item.unit ?? '').trim().toLowerCase()
    const ingredientUnit = (ingredient.unit ?? '').trim().toLowerCase()
    const sameFamily = (massUnits.has(itemUnit) && massUnits.has(ingredientUnit)) || (volumeUnits.has(itemUnit) && volumeUnits.has(ingredientUnit))
    if (!sameFamily) return item

    const neededBase = toBaseUnit(scaleIngredientAmount(ingredient.amount || 0, multiplier), ingredientUnit)
    const pantryBase = toBaseUnit(item.quantity || 0, itemUnit)
    const remainingBase = Math.max(0, pantryBase - neededBase)
    const remainingQty = fromBaseUnit(remainingBase, itemUnit)

    return { ...item, quantity: Number((remainingQty || 0).toFixed(4)) }
  }).filter((item) => (item.quantity ?? 0) > 0)
}
