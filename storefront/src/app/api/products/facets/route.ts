import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'

// Filtre kenar cubugu secenekleri (kategori/urun tipi/renk/beden) gercek kataloqdan gelir.
export async function GET() {
  const response = await fetch(buildBackendUrl('/api/v1/products/facets'), {
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
}
