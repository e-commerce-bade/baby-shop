import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { AUTH_COOKIE_NAME } from '@/lib/api/auth-cookie'

type RouteContext = {
  params: Promise<{ productId: string }>
}

async function proxy(method: 'PUT' | 'DELETE', context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  }

  const { productId } = await context.params
  const response = await fetch(buildBackendUrl(`/api/v1/me/favorites/${encodeURIComponent(productId)}`), {
    method,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const payload = await response.text()
  return new NextResponse(payload, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}

export async function PUT(_request: Request, context: RouteContext) {
  return proxy('PUT', context)
}

export async function DELETE(_request: Request, context: RouteContext) {
  return proxy('DELETE', context)
}
