import { NextResponse } from 'next/server'

/**
 * Basit, bagimliliksiz, bellek-ici sabit pencere (fixed-window) rate limiter.
 * BFF kalici bir Node sureci olarak calistigi icin sayaclar istekler arasinda korunur.
 * Gercek istemci IP'si bu katmanda (Railway x-forwarded-for) guvenilir bicimde bilinir;
 * bu yuzden auth/odeme gibi suistimale acik uclar burada sinirlanir.
 *
 * Not: Tek surec belleginde tutulur (yatay olceklemede surec basina ayridir) ve surec
 * yeniden baslayinca sifirlanir; credential-stuffing / kart-testi gibi kaba-kuvvet
 * saldirilarini yavaslatmak icin yeterlidir, dagitik bir kota sistemi degildir.
 */

type WindowEntry = { count: number; windowStart: number }

const store = new Map<string, WindowEntry>()
// Bellegi sinirla: cok fazla benzersiz anahtar birikirse sifirdan basla (kaba ama bounded).
const MAX_ENTRIES = 10_000

export const RATE_LIMITS = {
  // Kimlik dogrulama uclari: kaba-kuvvet / credential-stuffing'e karsi.
  auth: { limit: 10, windowMs: 60_000 },
  // Odeme baslatma: kart-testi / dolandiricilik denemelerine karsi.
  payment: { limit: 20, windowMs: 60_000 },
  // Misafir siparis takibi: numara + e-posta tahminine karsi.
  track: { limit: 15, windowMs: 60_000 },
} as const

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= windowMs) {
    // Bellegi sinirla: yalnizca suresi dolmus girdileri buda. Onceden store.clear() ile TUM
    // sayaclar sifirlaniyordu; bu, cok sayida benzersiz anahtar ureterek mesru kullanicilarin
    // sayaclarinin da sifirlanmasina (limit bypass) yol aciyordu.
    if (store.size > MAX_ENTRIES) {
      for (const [existingKey, existingEntry] of store) {
        if (now - existingEntry.windowStart >= windowMs) {
          store.delete(existingKey)
        }
      }
    }
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.max(Math.ceil((entry.windowStart + windowMs - now) / 1000), 1)
    return { allowed: false, retryAfterSeconds }
  }

  entry.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * Istek limiti asildiysa hazir bir 429 yaniti doner, asilmadiysa null doner.
 * scope: ayni IP icin farkli ucları ayri kovalarda tutmak icin (orn. "auth", "payment").
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  rule: { limit: number; windowMs: number },
): NextResponse | null {
  const { allowed, retryAfterSeconds } = checkRateLimit(
    `${scope}:${clientIp(request)}`,
    rule.limit,
    rule.windowMs,
  )

  if (allowed) {
    return null
  }

  return NextResponse.json(
    { message: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}
