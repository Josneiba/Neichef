import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/app')) {
    const token = request.cookies.get('sb-access-token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*'],
}
