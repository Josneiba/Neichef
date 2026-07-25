import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { mealRoutineSchema } from '@/lib/nutrition/schemas'
import { apiError, apiSuccess } from '@/lib/api'
import { isDbAvailable, reportDbFailure, markDbSuccess } from '@/lib/dbCircuit'

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

    const routines = await prisma.mealRoutine.findMany({
      where: { userId },
      include: { slots: true },
      orderBy: { updatedAt: 'desc' },
    })

    markDbSuccess()
    return apiSuccess(routines)
  } catch (err: any) {
    const msg = String(err?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const body = await request.json().catch(() => ({}))
    const parsed = mealRoutineSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid payload', 'BAD_REQUEST')
    }

    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')

    const routine = await prisma.mealRoutine.create({
      data: {
        userId,
        name: parsed.data.name,
        daysOfWeek: parsed.data.daysOfWeek,
        planId: parsed.data.planId ?? undefined,
        slots: parsed.data.slots ? { create: parsed.data.slots } : undefined,
      },
      include: { slots: true },
    })

    markDbSuccess()
    return apiSuccess(routine, 201)
  } catch (err: any) {
    const msg = String(err?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
