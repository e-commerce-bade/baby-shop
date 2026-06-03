import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { AUTH_COOKIE_NAME } from '@/lib/api/auth-cookie'

async function proxyAddressRequest(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  }

  const body = request.method === 'POST' ? await request.text() : undefined

  const response = await fetch(buildBackendUrl('/api/v1/me/addresses'), {
    method: request.method,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': request.headers.get('content-type') ?? 'application/json' } : {}),
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

export async function GET(request: Request) {
  return proxyAddressRequest(request)
}

export async function POST(request: Request) {
  return proxyAddressRequest(request)
}
