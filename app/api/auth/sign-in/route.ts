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

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message ?? 'Unable to sign in' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
