export const AUTH_COOKIE_NAME = 'badebebe_access_token'

export function authCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  }
}
