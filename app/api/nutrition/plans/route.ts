import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { nutritionPlanSchema } from '@/lib/nutrition/schemas'
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

    const plan = await prisma.nutritionPlan.findFirst({
      where: { userId, status: 'active' },
      include: { restrictions: true },
      orderBy: { updatedAt: 'desc' },
    })

    markDbSuccess()
    return apiSuccess(plan ?? null)
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
    const parsed = nutritionPlanSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid payload', 'BAD_REQUEST')
    }

    if (!isDbAvailable()) return apiError('Service unavailable', 'UNAVAILABLE')

    const plan = await prisma.nutritionPlan.create({
      data: {
        userId,
        title: parsed.data.title,
        notes: parsed.data.notes,
        source: parsed.data.source,
        status: 'active',
        caloriesTarget: parsed.data.caloriesTarget,
        proteinTargetG: parsed.data.proteinTargetG,
        carbsTargetG: parsed.data.carbsTargetG,
        fatTargetG: parsed.data.fatTargetG,
        mealsPerDay: parsed.data.mealsPerDay,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        rawFileUrl: parsed.data.rawFileUrl,
        rawExtractedText: parsed.data.rawExtractedText,
        extractionStatus: parsed.data.extractionStatus,
        restrictions: {
          create: parsed.data.restrictions ?? [],
        },
      },
      include: {
        restrictions: true,
      },
    })

    markDbSuccess()
    return apiSuccess(plan, 201)
  } catch (err: any) {
    const msg = String(err?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return apiError('Unauthorized', 'UNAUTHORIZED')
  }
}
