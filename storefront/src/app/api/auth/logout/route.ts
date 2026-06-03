import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/api/auth-cookie'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, '', authCookieOptions(1))

  return NextResponse.json({ status: 'OK' })
}
