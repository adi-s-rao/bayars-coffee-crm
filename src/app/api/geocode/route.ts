import { type NextRequest, NextResponse } from 'next/server'

interface NominatimResponse {
  display_name: string
  error?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'bayars-coffee-crm/1.0',
          'Accept-Language': 'en',
        },
        next: { revalidate: 0 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
    }

    const data = await res.json() as NominatimResponse

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 404 })
    }

    return NextResponse.json({ address: data.display_name })
  } catch {
    return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
  }
}
