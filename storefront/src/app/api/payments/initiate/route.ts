import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'payment', RATE_LIMITS.payment)
  if (limited) return limited

  const body = await request.text()

  let response: Response
  try {
    response = await fetch(buildBackendUrl('/api/v1/payments/initiate'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch {
    return NextResponse.json(
      { message: 'Ödeme servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.' },
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
