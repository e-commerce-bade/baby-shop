import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/api/auth-cookie'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'auth', RATE_LIMITS.auth)
  if (limited) return limited

  const body = await request.text()

  let response: Response
  try {
    response = await fetch(buildBackendUrl('/api/v1/auth/register'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch {
    return NextResponse.json(
      { message: 'Backend servisine ulaşılamıyor. Lütfen backend uygulamasını başlatın.' },
      { status: 503 },
    )
  }

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
