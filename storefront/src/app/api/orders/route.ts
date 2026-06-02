import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { buildBackendUrl } from '@/lib/api/backend'
import { AUTH_COOKIE_NAME } from '@/lib/api/auth-cookie'

export async function POST(request: Request) {
  const body = await request.text()
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value

  const response = await fetch(buildBackendUrl('/api/v1/orders'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
