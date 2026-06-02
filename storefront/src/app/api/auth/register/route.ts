import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/api/auth-cookie'

export async function POST(request: Request) {
  const body = await request.text()

  const response = await fetch(buildBackendUrl('/api/v1/auth/register'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json(payload ?? { message: 'Register failed' }, {
      status: response.status,
    })
  }

  const token = payload?.accessToken
  if (!token) {
    return NextResponse.json({ message: 'Register response did not include a token' }, { status: 502 })
  }

  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, token, authCookieOptions(payload.expiresIn))

  return NextResponse.json({
    email: payload.email,
    role: payload.role,
    expiresAt: payload.expiresAt,
  })
}
