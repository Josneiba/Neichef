import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure, markDbSuccess } from '@/lib/dbCircuit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'

const pantryItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  purchaseDate: z.string().optional(),
  openedDate: z.string().optional(),
  expirationDate: z.string().min(1),
  location: z.string().min(1),
  barcode: z.string().optional(),
  estimatedPrice: z.number().nonnegative().optional(),
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
    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')
    const items = await prisma.pantryItem.findMany({ where: { userId }, orderBy: { addedDate: 'desc' } })
    markDbSuccess()
    return apiSuccess(items)
  } catch (err: any) {
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
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

    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')

    const item = await prisma.pantryItem.create({
      data: {
        userId,
        name: parsed.data.name,
        category: parsed.data.category,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
        openedDate: parsed.data.openedDate ? new Date(parsed.data.openedDate) : undefined,
        expirationDate: new Date(parsed.data.expirationDate),
        location: parsed.data.location,
        barcode: parsed.data.barcode,
        estimatedPrice: parsed.data.estimatedPrice,
        imageUrl: parsed.data.imageUrl,
      } as Prisma.PantryItemUncheckedCreateInput,
    })

    markDbSuccess()
    return apiSuccess(item, 201)
  } catch (err: any) {
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
