import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = signInSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { email, password } = parsed.data
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Unable to sign in' }, { status: 400 })
  }

  // Return session and user info for debugging/dev flows.
  // In production you may want to remove sensitive tokens from responses.
  if (data.session) {
    const res = NextResponse.json({ success: true, session: data.session, user: data.user })
    // Set Supabase session cookies so client requests include them.
    try {
        if (data.session.access_token) {
          res.cookies.set('sb-access-token', data.session.access_token, {
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
        }
        if (data.session.refresh_token) {
          res.cookies.set('sb-refresh-token', data.session.refresh_token, {
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
        }
    } catch (e) {
      // ignore cookie set errors
    }

    return res
  }

  return NextResponse.json({ success: false, session: null, user: null })
}
