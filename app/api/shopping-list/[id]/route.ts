import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure } from '@/lib/dbCircuit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().trim().nullable().optional(),
  checked: z.boolean().optional(),
})

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    const { id } = await params
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid payload')
    }

    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')
    const updateData: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name.trim()
      updateData.normalizedName = normalizeName(parsed.data.name)
    }
    if (parsed.data.quantity !== undefined) updateData.quantity = parsed.data.quantity
    if (parsed.data.unit !== undefined) updateData.unit = parsed.data.unit
    if (parsed.data.checked !== undefined) updateData.checked = parsed.data.checked

    const result = await prisma.shoppingListItem.updateMany({
      where: { id, userId },
      data: updateData,
    })

    if (result.count === 0) return apiError('Item not found', 'NOT_FOUND')
    return apiSuccess({ success: true })
  } catch (err: any) {
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    const { id } = await params
    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')
    const result = await prisma.shoppingListItem.deleteMany({ where: { id, userId } })

    if (result.count === 0) return apiError('Item not found', 'NOT_FOUND')
    return apiSuccess({ success: true })
  } catch (err: any) {
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
