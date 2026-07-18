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

  // createSupabaseServerClient() is wired to Next's cookies() store with a
  // setAll() callback, so calling signInWithPassword() through it persists
  // the session using Supabase's own cookie format automatically. We must
  // NOT set our own 'sb-access-token' cookies here — the rest of the app
  // (middleware, every API route's getUser() call) reads the session back
  // through the same @supabase/ssr client, which only recognizes cookies it
  // wrote itself. Two different cookie schemes were the reason a
  // "successful" sign-in still left every other request unauthenticated.
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Unable to sign in' }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: data.user })
}
