import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure } from '@/lib/dbCircuit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRecipeDetail } from '@/lib/recipes/external-source'
import { matchIngredientsToPantry } from '@/lib/recipes/enrich'

type RecipeForResponse = {
  id: string
  userId?: string | null
  ingredients?: { name: string }[]
  [key: string]: unknown
}

async function getOptionalUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Public recipe browsing should not require auth — the previous version
  // of this route rejected every request with 401 unless logged in, which
  // is why recipe detail pages appeared broken/empty even for public
  // recipes.
  let userId: string | null = null
  try {
    userId = await getOptionalUserId()
  } catch {
    userId = null
  }

  let recipe: RecipeForResponse | null = null
  try {
    if (id.startsWith('external-')) {
      recipe = await getRecipeDetail(id.replace('external-', ''))
    } else {
      if (!isDbAvailable()) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
      recipe = await prisma.recipe.findFirst({ where: userId ? { id, OR: [{ isPublic: true }, { userId }] } : { id, isPublic: true }, include: { ingredients: true, steps: true } })
    }
  } catch (err) {
    console.error('Failed to load recipe:', err)
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return NextResponse.json({ error: 'Unable to load recipe right now' }, { status: 500 })
  }

  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  let pantryItems: { name: string; expirationDate: Date }[] = []
  let isSaved = false
  if (userId) {
    try {
      if (isDbAvailable()) {
        const [pantry, saved] = await Promise.all([
          prisma.pantryItem.findMany({ where: { userId }, select: { name: true, expirationDate: true } }),
          prisma.savedRecipe.findFirst({ where: { userId, recipeId: recipe.id } }),
        ])
        pantryItems = pantry
        isSaved = Boolean(saved)
      }
    } catch (err: any) {
      const msg = String((err as any)?.message ?? err)
      if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
      // Non-fatal — the recipe itself still renders without pantry enrichment.
    }
  }

  const match = matchIngredientsToPantry(recipe.ingredients ?? [], pantryItems)

  return NextResponse.json({ ...recipe, ...match, isSaved, isOwner: Boolean(userId && recipe.userId === userId) })
}
