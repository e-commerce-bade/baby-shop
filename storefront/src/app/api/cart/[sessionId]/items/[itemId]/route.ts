import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string; itemId: string }> },
) {
  const { sessionId, itemId } = await context.params
  const body = await request.text()

  const response = await fetch(
    buildBackendUrl(`/api/v1/carts/${sessionId}/items/${itemId}`),
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
    },
  )

  const payload = await response.text()

  return new NextResponse(payload, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string; itemId: string }> },
) {
  const { sessionId, itemId } = await context.params

  const response = await fetch(
    buildBackendUrl(`/api/v1/carts/${sessionId}/items/${itemId}`),
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const payload = await response.text()

  return new NextResponse(payload, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}
