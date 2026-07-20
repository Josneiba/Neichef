import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure, markDbSuccess } from '@/lib/dbCircuit'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/auth/profile'

const profileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  householdSize: z.number().int().min(1).max(6).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  notificationDaysAhead: z.number().int().min(1).max(14).optional(),
})

async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user
}

export async function GET() {
  try {
    const user = await getAuthUser()
    const profile = await ensureUserProfile(user)
    const userId = user.id
    console.info('[profile:get] loaded profile', { userId })
    return NextResponse.json(profile)
  } catch (err) {
    console.error('[profile:get] failed', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser()
    await ensureUserProfile(user)
    const userId = user.id
    const body = await request.json()
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      console.warn('[profile:patch] invalid payload', parsed.error.flatten())
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    if (!isDbAvailable()) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    try {
      const profile = await prisma.user.update({ where: { id: userId }, data: parsed.data })
      markDbSuccess()
      console.info('[profile:patch] updated profile', { userId })
      return NextResponse.json(profile)
    } catch (err: any) {
      const msg = String((err as any)?.message ?? err)
      if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
      throw err
    }
  } catch (err) {
    console.error('[profile:patch] failed', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
