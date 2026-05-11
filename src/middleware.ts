import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  console.log('MIDDLEWARE RUNNING:', request.nextUrl.pathname)

  const { pathname } = request.nextUrl

  const { response, user } = await updateSession(request)

  console.log('MIDDLEWARE USER:', user?.id ?? 'null')
  console.log('MIDDLEWARE PATH:', pathname)

  if (pathname.startsWith('/dashboard') && !user) {
    console.log('MIDDLEWARE REDIRECTING TO LOGIN')
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  console.log('MIDDLEWARE PASSING THROUGH')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
