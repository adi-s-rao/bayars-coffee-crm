import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public routes and static assets through
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')

  if (isPublic) {
    return NextResponse.next()
  }

  // Refresh session and check auth for protected routes
  const { response, user } = await updateSession(request)

  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
