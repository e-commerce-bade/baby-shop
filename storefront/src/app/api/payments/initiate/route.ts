import { NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/api/backend'
import { clientIp, enforceRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'payment', RATE_LIMITS.payment)
  if (limited) return limited

  const body = await request.text()

  // Gercek alici IP'sini backend'e ilet (iyzico fraud/3DS skorlamasi icin). Backend
  // X-Forwarded-For'un ilk girdisini okur; aksi halde BFF'in IP'sini gorurdu.
  const ip = clientIp(request)
  const forwardHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (ip && ip !== 'unknown') {
    forwardHeaders['X-Forwarded-For'] = ip
  }

  let response: Response
  try {
    response = await fetch(buildBackendUrl('/api/v1/payments/initiate'), {
      method: 'POST',
      headers: forwardHeaders,
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
