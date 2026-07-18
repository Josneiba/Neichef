import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveRecipeId } from '@/lib/recipes/external-source'

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    const { id } = await params
    // `id` may be a placeholder `external-<mealId>` id from a list that has
    // never been individually viewed/cached yet. Resolve it to a real DB
    // row first so the SavedRecipe foreign key has something to point at —
    // otherwise this insert fails silently and the UI shows a "saved" state
    // that was never actually persisted.
    const recipeId = await resolveRecipeId(id)
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    await prisma.savedRecipe.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: {},
      create: { userId, recipeId },
    })
    return NextResponse.json({ success: true, recipeId })
  } catch (err) {
    console.error('Failed to save recipe:', err)
    return NextResponse.json({ error: 'Unable to save recipe' }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    const { id } = await params
    const recipeId = (await resolveRecipeId(id)) ?? id
    await prisma.savedRecipe.deleteMany({ where: { userId, recipeId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to unsave recipe:', err)
    return NextResponse.json({ error: 'Unable to unsave recipe' }, { status: 400 })
  }
}
