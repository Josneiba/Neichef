import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  householdSize: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        return Number(value)
      }
      return value
    },
    z.number().int().min(1).max(6),
  ),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = signUpSchema.safeParse(body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join(', ')
    return NextResponse.json({ error: `Invalid payload: ${errors}` }, { status: 400 })
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
    const rawMessage = authError?.message ?? 'Unable to create account'
    const message = rawMessage.toLowerCase().includes('rate limit')
      ? 'Email rate limit exceeded. Wait a few minutes and try again, or check your inbox for the previous confirmation link.'
      : rawMessage
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Create (or repair) the matching application-database row. This is
  // best-effort and must not fail the whole signup: the Supabase Auth user
  // already exists at this point, so a DB hiccup here should not strand the
  // person with an auth account but no way to log in. `upsert` also makes
  // this safe to call again if a previous signup attempt partially failed.
  try {
    await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {},
      create: {
        id: authData.user.id,
        email,
        name,
        householdSize,
        dietaryPreferences: [],
        notificationDaysAhead: 3,
      },
    })
    console.info('[auth:sign-up] application profile ready', { userId: authData.user.id, confirmed: Boolean(authData.session) })
  } catch (err) {
    console.error('Failed to create application user row during sign-up:', err)
    return NextResponse.json(
      {
        error:
          'Your account was created but we could not finish setting up your profile. Please try signing in — if this keeps happening, contact support.',
      },
      { status: 500 },
    )
  }

  // If the Supabase project has "Confirm email" turned off, signUp() already
  // returns an active session — the person is logged in immediately and the
  // session cookie was persisted by createSupabaseServerClient()'s cookie
  // adapter. Tell the client so it can skip the "check your email" screen.
  if (authData.session) {
    return NextResponse.json({ success: true, confirmed: true, message: 'Account created.' })
  }

  return NextResponse.json({
    success: true,
    confirmed: false,
    message: 'Registrado. Revisa tu correo y confirma tu cuenta con el enlace que te enviamos.',
  })
}
