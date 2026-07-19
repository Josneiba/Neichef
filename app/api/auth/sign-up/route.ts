import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { ensureUserProfile } from '@/lib/auth/profile'

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

  // Create (or repair) the matching application-database row. If a previous
  // attempt created a Supabase Auth user but failed before creating the app
  // profile, ensureUserProfile() makes this retry safe and recoverable.
  try {
    await ensureUserProfile(authData.user, { name, email, householdSize })
    console.info('[auth:sign-up] application profile ready', { userId: authData.user.id, confirmed: Boolean(authData.session) })
  } catch (err) {
    console.error('Failed to create application user row during sign-up:', err)
    return NextResponse.json(
      {
        success: true,
        confirmed: false,
        message:
          'Tu cuenta fue creada. Confirma el correo que te enviamos; cuando inicies sesión, NeiChef terminará de preparar tu perfil automáticamente.',
      },
      { status: 200 },
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
