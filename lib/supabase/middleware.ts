import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

/**
 * Builds a Supabase client bound to the incoming request/response pair so
 * middleware can read the current session and refresh auth cookies using
 * Supabase's own cookie format. Returns both the response (with refreshed
 * cookies attached) and the resolved user, so callers can make a routing
 * decision without a second round trip.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  // IMPORTANT: calling getUser() (not getSession()) revalidates the token
  // against Supabase Auth on every request, and its setAll callback above
  // keeps the session cookie fresh so server components/route handlers see
  // the same session the browser has.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response: supabaseResponse, user }
}
