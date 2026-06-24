// JWT'yi imza dogrulamadan yalnizca cozumler (payload'i okur). Asil yetki dogrulamasi
// her zaman backend'de yapilir (Spring Security `hasRole('ADMIN')`); buradaki kontrol
// BFF katmaninda derinlemesine savunma amacli hizli bir kapidir: yetkisiz istekleri
// backend'e hic iletmeden eler.

type JwtClaims = {
  roles?: unknown
  exp?: unknown
}

function decodeClaims(token: string): JwtClaims | null {
  const segments = token.split('.')
  if (segments.length < 2) {
    return null
  }

  try {
    const json = Buffer.from(segments[1], 'base64url').toString('utf8')
    const parsed = JSON.parse(json)
    return typeof parsed === 'object' && parsed !== null ? (parsed as JwtClaims) : null
  } catch {
    return null
  }
}

export function getRolesFromToken(token: string): string[] {
  const claims = decodeClaims(token)
  if (!claims || !Array.isArray(claims.roles)) {
    return []
  }

  return claims.roles.filter((role): role is string => typeof role === 'string')
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeClaims(token)
  if (!claims || typeof claims.exp !== 'number') {
    // exp okunamiyorsa suresiz varsaymak yerine "gecerli" kabul edip backend'e birakiyoruz.
    return false
  }

  return claims.exp * 1000 <= Date.now()
}

export function isAdminToken(token: string): boolean {
  if (isTokenExpired(token)) {
    return false
  }

  return getRolesFromToken(token).some((role) => {
    const normalized = role.startsWith('ROLE_') ? role.slice(5) : role
    return normalized.toUpperCase() === 'ADMIN'
  })
}
