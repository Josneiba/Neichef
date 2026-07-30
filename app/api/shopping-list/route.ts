import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure, markDbSuccess } from '@/lib/dbCircuit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'
import { enrichItems } from '@/lib/pantry/enrich-items'

const shoppingListEntrySchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive().optional(),
  unit: z.string().trim().nullable().optional(),
})

const shoppingListPayloadSchema = z.array(shoppingListEntrySchema)

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export async function GET() {
  try {
    const userId = await getUserId()
    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')
    const items = await prisma.shoppingListItem.findMany({ where: { userId }, orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }] })
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
    const parsed = shoppingListPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')

    const enriched = await enrichItems(parsed.data.map((entry) => ({ name: entry.name })))

    const createdItems = [] as Array<{
      id: string
      userId: string
      name: string
      normalizedName: string
      quantity: number
      unit: string | null
      checked: boolean
      createdAt: Date
      updatedAt: Date
      category: string | null
      aisle: string | null
    }>
    for (const [index, entry] of parsed.data.entries()) {
      const cleanEntry = enriched[index]
      const displayName = cleanEntry?.name ?? entry.name.trim()
      const normalizedName = normalizeName(displayName)
      const existingItem = await prisma.shoppingListItem.findFirst({
        where: { userId, normalizedName, checked: false },
      })
      if (existingItem) continue

      const created = await prisma.shoppingListItem.create({
        data: {
          userId,
          name: displayName,
          normalizedName,
          quantity: entry.quantity ?? 1,
          unit: entry.unit ?? null,
          checked: false,
          category: cleanEntry?.category ?? null,
          aisle: cleanEntry?.aisle ?? null,
        },
      })
      createdItems.push(created)
    }

    markDbSuccess()
    return apiSuccess({ items: createdItems }, 201)
  } catch (err: any) {
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
