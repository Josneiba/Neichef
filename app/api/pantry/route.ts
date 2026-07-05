import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'

const pantryItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  expirationDate: z.string(),
  location: z.string().min(1),
  imageUrl: z.string().url().optional(),
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
    const items = await prisma.pantryItem.findMany({
      where: { userId },
      orderBy: { addedDate: 'desc' },
    })
    return apiSuccess(items)
  } catch {
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const body = await request.json()
    const parsed = pantryItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const item = await prisma.pantryItem.create({
      data: {
        userId,
        name: parsed.data.name,
        category: parsed.data.category,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        expirationDate: new Date(parsed.data.expirationDate),
        location: parsed.data.location,
        imageUrl: parsed.data.imageUrl,
      },
    })

    return apiSuccess(item, 201)
  } catch {
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
