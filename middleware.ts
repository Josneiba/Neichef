import { type NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseMiddlewareClient } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await createSupabaseMiddlewareClient(request)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/app')) {
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/app/:path*'],
}
