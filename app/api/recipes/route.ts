import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'

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

export async function GET() {
  try {
    const userId = await getUserId()
    const recipes = await prisma.recipe.findMany({
      where: { OR: [{ isPublic: true }, { userId }] },
      include: { ingredients: true },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(recipes)
  } catch {
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
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
