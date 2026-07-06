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

  return NextResponse.json({ success: true, message: 'Registrado. Revisa tu correo y confirma tu cuenta con el enlace que te enviamos.' })
}
