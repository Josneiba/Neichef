import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const profileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  householdSize: z.number().int().min(1).max(6).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  notificationDaysAhead: z.number().int().min(1).max(14).optional(),
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
    const profile = await prisma.user.findUnique({ where: { id: userId } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserId()
    const body = await request.json()
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const profile = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
    })

    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
