import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isStapleIngredient, normalizeFoodName } from '@/lib/recipes/enrich'

const schema = z.object({
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().optional(),
    unit: z.string().optional(),
  })).default([]),
})

type NutritionTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
  sugars: number
  matchedIngredients: number
}

const nutrientMap: Record<string, keyof Omit<NutritionTotals, 'matchedIngredients'>> = {
  'Energy': 'calories',
  'Protein': 'protein',
  'Carbohydrate, by difference': 'carbs',
  'Total lipid (fat)': 'fat',
  'Total Sugars': 'sugars',
}

function gramFactor(amount?: number, unit?: string) {
  const normalizedUnit = (unit ?? '').toLowerCase()
  if (!amount || amount <= 0) return 1
  if (/(^g$|gram)/.test(normalizedUnit)) return amount / 100
  if (/(^kg$|kilogram)/.test(normalizedUnit)) return (amount * 1000) / 100
  return 1
}

export async function POST(request: Request) {
  const apiKey = process.env.FDC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FoodData Central is not configured.' }, { status: 501 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const totals: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugars: 0, matchedIngredients: 0 }
  const ingredients = parsed.data.ingredients
    .filter((ingredient) => !isStapleIngredient(ingredient.name))
    .slice(0, 8)

  for (const ingredient of ingredients) {
    const query = normalizeFoodName(ingredient.name)
    if (!query) continue

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        query,
        pageSize: '1',
      })
      const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`)
      if (!response.ok) continue
      const data = await response.json()
      const food = Array.isArray(data.foods) ? data.foods[0] : null
      if (!food || !Array.isArray(food.foodNutrients)) continue

      const factor = gramFactor(ingredient.amount, ingredient.unit)
      let matchedAny = false
      for (const nutrient of food.foodNutrients as { nutrientName?: string; value?: number }[]) {
        const key = nutrient.nutrientName ? nutrientMap[nutrient.nutrientName] : undefined
        if (!key || typeof nutrient.value !== 'number') continue
        totals[key] += nutrient.value * factor
        matchedAny = true
      }
      if (matchedAny) totals.matchedIngredients += 1
    } catch (err) {
      console.warn('[nutrition] ingredient lookup failed', { ingredient: ingredient.name, err })
    }
  }

  return NextResponse.json({
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    sugars: Math.round(totals.sugars),
    matchedIngredients: totals.matchedIngredients,
    note: 'Estimated from FoodData Central matches. Review labels for exact values.',
  })
}
