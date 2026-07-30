import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateMealSuggestions } from '@/lib/recipes/predictive'
import { normalizeFoodName } from '@/lib/recipes/enrich'
import { enrichItems } from '@/lib/pantry/enrich-items'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = data.user.id

    const body = await request.json().catch(() => ({}))
    const daysToPredict = Number(body.daysToPredict ?? 7)

    const suggestedRecipes = await generateMealSuggestions(userId, daysToPredict)

    // Load pantry items
    const pantry = await prisma.pantryItem.findMany({ where: { userId } })

    const shoppingList: { name: string; amountNeeded: number; unit?: string; expectedCost: number }[] = []
    let totalEstimatedBudget = 0

    for (const recipe of suggestedRecipes) {
      for (const ingredient of recipe.ingredients) {
        const normalized = normalizeFoodName(ingredient.name)
        const pantryItem = pantry.find((p) => normalizeFoodName(p.name) === normalized)
        const inPantryQty = pantryItem ? Number(pantryItem.quantity ?? 0) : 0
        const needed = Math.max(0, ingredient.requiredQuantity - inPantryQty)
        if (needed <= 0) continue

        // Try to resolve ingredient by name to get estimated price
        // `Ingredient` model may be new; cast to any to avoid needing regenerated Prisma client types here
        const dbIngredient = await (prisma as any).ingredient.findUnique({ where: { name: ingredient.name } })
        const expectedCost = dbIngredient && dbIngredient.estimatedPrice ? Number(dbIngredient.estimatedPrice) * needed : 0
        shoppingList.push({ name: ingredient.name, amountNeeded: needed, unit: ingredient.unit, expectedCost })
        totalEstimatedBudget += expectedCost
      }
    }

    const enriched = await enrichItems(shoppingList.map((item) => ({ name: item.name })))
    const enrichedShoppingList = shoppingList.map((item, index) => {
      const match = enriched[index]
      return match ? { ...item, name: match.name, category: match.category, aisle: match.aisle } : item
    })

    return NextResponse.json({ suggestedRecipes, shoppingList: enrichedShoppingList, totalEstimatedBudget })
  } catch (err: any) {
    console.error('[predictive] failed', err)
    return NextResponse.json({ error: 'Failed to generate predictive list' }, { status: 500 })
  }
}
