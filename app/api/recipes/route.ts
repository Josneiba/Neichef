import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'
import { fetchRandomMeals } from '@/lib/recipes/external-source'

const recipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  prepTimeMinutes: z.number().int().min(1),
  cookTimeMinutes: z.number().int().min(1),
  servings: z.number().int().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()).default([]),
  costLevel: z.enum(['low', 'medium', 'high']),
  ingredients: z.array(z.object({ name: z.string().min(1), amount: z.number(), unit: z.string().min(1) })).default([]),
  steps: z.array(z.object({ step: z.number().int().min(1), instruction: z.string().min(1), durationMinutes: z.number().int().optional() })).default([]),
})

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

async function getOptionalUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function GET() {
  // allow unauthenticated access: return public recipes or external recipes
  let userId: string | null = null
  try {
    userId = await getOptionalUserId()
  } catch {
    userId = null
  }

  // Try DB first; if it fails, fall back to HTTP-only TheMealDB fetches
  let recipes: any[] | null = null
  try {
    recipes = await prisma.recipe.findMany({
      where: userId ? { OR: [{ isPublic: true }, { userId }] } : { isPublic: true },
      include: { ingredients: true },
      orderBy: { createdAt: 'desc' },
    })
  } catch (dbErr) {
    recipes = null
  }

  if (recipes && recipes.length > 0) {
    return apiSuccess(recipes)
  }

  // No DB recipes or DB unavailable — fetch random meals via TheMealDB
  const externalNoDb = await fetchRandomMeals(8)
  if (externalNoDb.length > 0) {
    return apiSuccess(externalNoDb)
  }

  // Last fallback: return safe static mock recipes to avoid empty list
  return apiSuccess([
    {
      id: 'fallback-1',
      title: 'Quick Tomato Pasta',
      description: 'A simple pasta recipe that works with pantry staples and pantry-friendly tomatoes.',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      servings: 2,
      difficulty: 'easy',
      tags: ['quick', 'vegetarian'],
      costLevel: 'low',
      ingredients: [
        { name: 'Pasta', amount: 200, unit: 'g' },
        { name: 'Tomato sauce', amount: 180, unit: 'g' },
        { name: 'Garlic', amount: 2, unit: 'cloves' },
      ],
      steps: [
        { step: 1, instruction: 'Boil pasta until al dente.' },
        { step: 2, instruction: 'Sauté garlic and add tomato sauce.' },
        { step: 3, instruction: 'Toss pasta with sauce and serve.' },
      ],
      imageUrl: undefined,
      pantryMatchCount: 0,
      totalIngredients: 3,
      usesExpiringItems: false,
      isSaved: false,
    },
  ])
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const body = await request.json()
    const parsed = recipeSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid payload')
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId,
        title: parsed.data.title,
        description: parsed.data.description,
        prepTimeMinutes: parsed.data.prepTimeMinutes,
        cookTimeMinutes: parsed.data.cookTimeMinutes,
        servings: parsed.data.servings,
        difficulty: parsed.data.difficulty,
        tags: parsed.data.tags,
        costLevel: parsed.data.costLevel,
        ingredients: { create: parsed.data.ingredients.map((ingredient) => ({ name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit })) },
        steps: { create: parsed.data.steps.map((step) => ({ step: step.step, instruction: step.instruction, durationMinutes: step.durationMinutes })) },
      },
      include: { ingredients: true, steps: true },
    })

    return apiSuccess(recipe, 201)
  } catch {
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
