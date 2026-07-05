import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

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
  // Development bypass: create a local dummy session without email confirmation.
  // Set `DEV_BYPASS_EMAIL_CONFIRMATION=true` in .env.local to enable.
  if (process.env.DEV_BYPASS_EMAIL_CONFIRMATION === 'true') {
    const id = randomUUID()
    try {
      await prisma.user.create({
        data: {
          id,
          email,
          name,
          householdSize,
          dietaryPreferences: [],
          notificationDaysAhead: 3,
        },
      })
    } catch (err) {
      // Ignore DB errors in bypass mode — proceed to set cookie so UI can be tested
      console.warn('prisma.user.create failed in DEV_BYPASS mode:', err)
    }

    const res = NextResponse.json({ success: true })
    // Set dummy Supabase access tokens so middleware allows /app access for UI testing
    // These tokens are NOT real and only meant for local development bypass.
    res.cookies.set('sb-access-token', `dev-token-${id}`, { httpOnly: true, path: '/' })
    res.cookies.set('sb-refresh-token', `dev-refresh-${id}`, { httpOnly: true, path: '/' })
    return res
  }

  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, household_size: householdSize } },
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
