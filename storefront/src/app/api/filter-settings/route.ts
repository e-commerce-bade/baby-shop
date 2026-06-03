import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'

export async function GET() {
  const response = await fetch(buildBackendUrl('/api/v1/filter-settings'), {
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
