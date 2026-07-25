import { prisma } from '@/lib/prisma'
import { fetchRandomMeals } from '@/lib/recipes/external-source'
import { normalizeFoodName } from '@/lib/recipes/enrich'

export type PredictedRecipe = {
  id: string
  title: string
  ingredients: { id?: string; name: string; requiredQuantity: number; unit?: string }[]
}

export async function generateMealSuggestions(userId: string | null, daysToPredict = 7): Promise<PredictedRecipe[]> {
  const mealsNeeded = Math.max(1, Math.floor(daysToPredict))

  // Prefer user's saved recipes or personal recipes
  try {
    if (userId) {
      const saved = await prisma.savedRecipe.findMany({ where: { userId }, take: mealsNeeded, include: { recipe: { include: { ingredients: true } } } })
      if (saved && saved.length > 0) {
        return saved.slice(0, mealsNeeded).map((s) => ({
          id: s.recipe.id,
          title: s.recipe.title,
          ingredients: s.recipe.ingredients.map((ing) => ({ id: undefined, name: ing.name, requiredQuantity: Number(ing.amount ?? 1), unit: ing.unit })),
        }))
      }

      const own = await prisma.recipe.findMany({ where: { userId }, include: { ingredients: true }, take: mealsNeeded })
      if (own && own.length > 0) {
        return own.map((r) => ({
          id: r.id,
          title: r.title,
          ingredients: r.ingredients.map((ing) => ({ id: undefined, name: ing.name, requiredQuantity: Number(ing.amount ?? 1), unit: ing.unit })),
        }))
      }
    }
  } catch (err) {
    // ignore and fallback to external meals
    console.warn('[predictive] prisma lookup failed, falling back to external meals', err)
  }

  // Fallback: fetch external random meals
  const external = await fetchRandomMeals(Math.min(20, mealsNeeded))
  return external.slice(0, mealsNeeded).map((r) => ({
    id: r.id,
    title: r.title ?? 'Untitled',
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((ing: any) => ({ id: undefined, name: ing.name, requiredQuantity: Number(ing.amount ?? 1), unit: (ing.unit as string) ?? 'pcs' })) : [],
  }))
}
