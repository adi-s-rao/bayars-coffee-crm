import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'
  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}
