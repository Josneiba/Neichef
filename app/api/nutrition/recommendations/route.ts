import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'
import { isDbAvailable, reportDbFailure, markDbSuccess } from '@/lib/dbCircuit'
import { scoreRecipeForNutritionPlan } from '@/lib/nutrition/score-recipe'

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function GET() {
  try {
    const userId = await getUserId()
    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')

    const [plan, pantryItems, recipes] = await Promise.all([
      prisma.nutritionPlan.findFirst({
        where: { userId, status: 'active' },
        include: { restrictions: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.pantryItem.findMany({
        where: { userId },
        select: { name: true, expirationDate: true },
      }),
      prisma.recipe.findMany({
        where: { OR: [{ isPublic: true }, { userId }] },
        include: { ingredients: true, steps: true },
      }),
    ])

    const recommendations = recipes
      .map((recipe) => {
        const score = scoreRecipeForNutritionPlan(recipe, plan, pantryItems)
        return { ...recipe, ...score }
      })
      .filter((item) => item.score !== -Infinity && item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (b.usesExpiringItems !== a.usesExpiringItems) return b.usesExpiringItems ? 1 : -1
        const aRatio = a.totalIngredients > 0 ? a.pantryMatchCount / a.totalIngredients : 0
        const bRatio = b.totalIngredients > 0 ? b.pantryMatchCount / b.totalIngredients : 0
        return bRatio - aRatio
      })

    markDbSuccess()
    return apiSuccess(recommendations.slice(0, 10))
  } catch (err: any) {
    const msg = String(err?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
