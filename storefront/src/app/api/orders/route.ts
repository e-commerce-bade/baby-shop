import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'

export async function POST(request: Request) {
  const body = await request.text()

  const response = await fetch(buildBackendUrl('/api/v1/orders'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
  })

  const payload = await response.text()

  return new NextResponse(payload, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}
