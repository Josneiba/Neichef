import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    const { id } = await params
    const recipe = await prisma.recipe.findFirst({
      where: { id, OR: [{ isPublic: true }, { userId }] },
      include: { ingredients: true, steps: true },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
