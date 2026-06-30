import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

// Misafir siparis takibi: kimlik dogrulama gerektirmez; numara + e-posta backend'de birlikte
// dogrulanir. Numara/e-posta tahminini yavaslatmak icin rate-limit uygulanir.
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'track', RATE_LIMITS.track)
  if (limited) return limited

  const body = await request.text()

  let response: Response
  try {
    response = await fetch(buildBackendUrl('/api/v1/orders/lookup'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch {
    return NextResponse.json(
      { message: 'Sipariş servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.' },
      { status: 503 },
    )
  }

  const payload = await response.text()

  return new NextResponse(payload, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}
