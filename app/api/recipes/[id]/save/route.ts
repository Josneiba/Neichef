import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
    await prisma.savedRecipe.create({
      data: { userId, recipeId: id },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to save recipe' }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    const { id } = await params
    await prisma.savedRecipe.deleteMany({ where: { userId, recipeId: id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to unsave recipe' }, { status: 400 })
  }
}
