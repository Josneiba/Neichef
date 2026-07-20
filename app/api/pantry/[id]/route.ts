import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure } from '@/lib/dbCircuit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiSuccess } from '@/lib/api'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  expirationDate: z.string().optional(),
  location: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
})

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
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
    const item = await prisma.pantryItem.updateMany({
      where: { id, userId },
      data: {
        ...parsed.data,
        expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : undefined,
      },
    })

    if (item.count === 0) {
      return apiError('Item not found', 'NOT_FOUND')
    }

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
    const result = await prisma.pantryItem.deleteMany({ where: { id, userId } })

    if (result.count === 0) {
      return apiError('Item not found', 'NOT_FOUND')
    }

    return apiSuccess({ success: true })
  } catch (err: any) {
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
