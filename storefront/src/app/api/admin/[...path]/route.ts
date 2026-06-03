import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { AUTH_COOKIE_NAME } from '@/lib/api/auth-cookie'

type RouteContext = {
  params: Promise<{ path: string[] }>
}

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH'])

async function proxyAdminRequest(request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  }

  const { path } = await context.params
  const { search } = new URL(request.url)
  const backendPath = `/api/v1/admin/${path.join('/')}${search}`
  const body = METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined

  const response = await fetch(buildBackendUrl(backendPath), {
    method: request.method,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': request.headers.get('content-type') ?? 'application/json' } : {}),
    },
    body,
  })

  if (response.status === 204 || response.status === 304) {
    return new NextResponse(null, { status: response.status })
  }

  const payload = await response.text()

  return new NextResponse(payload, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}

export async function GET(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context)
}

export async function POST(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context)
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context)
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context)
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context)
}
