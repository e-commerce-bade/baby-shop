import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params
  const response = await fetch(
    buildBackendUrl(`/api/v1/carts/${sessionId}/checkout`),
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const body = await response.text()

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}
