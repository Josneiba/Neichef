import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  householdSize: z.number().int().min(1).max(6),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = signUpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { name, email, password, householdSize } = parsed.data
  const supabase = await createSupabaseServerClient()
  const emailRedirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/confirm`
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { name, household_size: householdSize },
    },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Unable to create account' }, { status: 400 })
  }

  await prisma.user.create({
    data: {
      id: authData.user.id,
      email,
      name,
      householdSize,
      dietaryPreferences: [],
      notificationDaysAhead: 3,
    },
  })

  return NextResponse.json({ success: true })
}
