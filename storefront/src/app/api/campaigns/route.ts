import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'

// Herkese acik: yalnizca aktif kampanyalar (storefront yayin alanlari icin).
export async function GET() {
  try {
    const response = await fetch(buildBackendUrl('/api/v1/campaigns'), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    const payload = await response.text()
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch {
    // Backend erisilemezse storefront'u bozma; bos liste don.
    return NextResponse.json([], { status: 200 })
  }
}
