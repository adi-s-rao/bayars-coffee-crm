import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  return NextResponse.json({
    count: allCookies.length,
    names: allCookies.map(c => c.name),
  })
}
