import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/auth/profile'

// Supabase's default "Confirm signup" / "Magic link" email templates point
// at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}`.
// This must be a server Route Handler (not a client page) so it can call
// verifyOtp() with access to httpOnly cookies and persist the resulting
// session via the same cookie adapter every other route uses. The previous
// implementation was a client component that called
// `supabase.auth.detectSessionInUrl(...)`, a method that does not exist on
// the Supabase JS client — every confirmation click threw immediately and
// the account was never usable.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/app'

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      if (data.user) {
        try {
          await ensureUserProfile(data.user)
        } catch (err) {
          console.error('[auth:confirm] profile repair failed after confirmation', err)
        }
      }
      return NextResponse.redirect(new URL(`/auth/confirmed?next=${encodeURIComponent(next)}`, request.url))
    }

    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, request.url),
    )
  }

  return NextResponse.redirect(
    new URL('/auth/sign-in?error=' + encodeURIComponent('Invalid or expired confirmation link.'), request.url),
  )
}
