'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface OrderItem {
  id: number
  productName: string
  variantLabel: string | null
  quantity: number
  unitPrice: number | string
  lineTotal: number | string
  currency: string
}

interface OrderAddress {
  line1: string | null
  line2: string | null
  district: string | null
  city: string | null
  postalCode: string | null
  country: string | null
}

interface TrackedOrder {
  orderNumber: string
  status: string
  customerFirstName: string | null
  customerLastName: string | null
  subtotalAmount: number | string
  shippingAmount: number | string
  discountAmount: number | string
  totalAmount: number | string
  currency: string
  createdAt: string | null
  shippingAddress: OrderAddress | null
  notes: string | null
  items: OrderItem[]
}

const STATUS_STEPS = ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'] as const

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Ödeme Bekleniyor',
  PAID: 'Ödendi',
  PREPARING: 'Hazırlanıyor',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal Edildi',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function StatusTimeline({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-[12px] border border-[#F0D2D2] bg-[#FEEAEA] px-4 py-3 text-[13px] font-semibold text-[#8A1A1A]">
        Bu sipariş iptal edildi.
      </div>
    )
  }

  const currentIndex = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number])

  return (
    <div className="flex items-center">
      {STATUS_STEPS.map((step, index) => {
        const done = currentIndex >= 0 && index <= currentIndex
        const isLast = index === STATUS_STEPS.length - 1
        return (
          <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${
                  done ? 'bg-rose text-white' : 'bg-cream-2 text-muted'
                }`}
              >
                {done ? '✓' : index + 1}
              </div>
              <span className={`text-center text-[10.5px] font-semibold ${done ? 'text-brown' : 'text-muted'}`}>
                {STATUS_LABELS[step]}
              </span>
            </div>
            {!isLast && (
              <div className={`mx-1 h-0.5 flex-1 ${index < currentIndex ? 'bg-rose' : 'bg-line'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrackContent() {
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  useEffect(() => {
    const fromQuery = searchParams.get('orderNumber')
    if (fromQuery) setOrderNumber(fromQuery)
  }, [searchParams])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!orderNumber.trim() || !email.trim()) {
      setError('Sipariş numarası ve e-posta zorunludur.')
      return
    }
    setLoading(true)
    setError(null)
    setOrder(null)
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      })
      if (res.status === 404) {
        throw new Error('Sipariş bulunamadı. Sipariş numarası ve e-postayı kontrol edin.')
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Sipariş sorgulanamadı. Lütfen tekrar deneyin.')
      }
      setOrder((await res.json()) as TrackedOrder)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sipariş sorgulanamadı.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'mt-1.5 w-full rounded-[12px] border border-line bg-cream-3 px-4 py-3 text-[14px] text-brown outline-none transition-colors focus:border-rose-soft focus:bg-white placeholder:text-muted'

  return (
    <div className="mx-auto max-w-[640px] px-5 py-10 max-[680px]:py-6">
      <h1 className="font-serif text-[28px] font-semibold text-brown max-[680px]:text-[24px]">
        Sipariş Takibi
      </h1>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Sipariş numaranız ve sipariş sırasında girdiğiniz e-posta ile siparişinizi sorgulayın.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-panel border border-line bg-white p-5">
        <div className="grid grid-cols-2 gap-4 max-[680px]:grid-cols-1">
          <label className="flex flex-col">
            <span className="text-[13px] font-bold text-brown-2">Sipariş Numarası</span>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ORD-XXXXXXXXXXXX"
              className={`${inputCls} font-mono`}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-[13px] font-bold text-brown-2">E-posta</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              className={inputCls}
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-[12px] border border-rose-soft bg-rose-tint px-4 py-3 text-[13px] font-semibold text-rose-dk">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-[14px] bg-rose py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-rose-dk disabled:opacity-60"
        >
          {loading ? 'Sorgulanıyor...' : 'Siparişi Sorgula'}
        </button>
      </form>

      {order && (
        <div className="mt-6 space-y-5">
          <div className="rounded-panel border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold text-muted">Sipariş No</p>
                <p className="font-mono text-[15px] font-bold text-brown">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold text-muted">Tarih</p>
                <p className="text-[14px] font-semibold text-brown">{formatDate(order.createdAt)}</p>
              </div>
            </div>
            <div className="mt-3 inline-flex rounded-full bg-cream-2 px-3 py-1 text-[12px] font-bold text-brown">
              {STATUS_LABELS[order.status] ?? order.status}
            </div>

            <div className="mt-6">
              <StatusTimeline status={order.status} />
            </div>
          </div>

          <div className="rounded-panel border border-line bg-white p-5">
            <h2 className="mb-3 font-serif text-[16px] font-semibold text-brown">Ürünler</h2>
            <div className="divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-brown">{item.productName}</p>
                    <p className="text-[12px] text-muted">
                      {[item.variantLabel, `${item.quantity} adet`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13.5px] font-bold text-brown">
                    {formatPrice(item.lineTotal, item.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-[13.5px]">
              <div className="flex justify-between text-brown-2">
                <span>Ara toplam</span>
                <span className="font-semibold text-brown">{formatPrice(order.subtotalAmount, order.currency)}</span>
              </div>
              <div className="flex justify-between text-brown-2">
                <span>Kargo</span>
                <span className="font-semibold text-brown">
                  {Number(order.shippingAmount) === 0 ? 'Ücretsiz' : formatPrice(order.shippingAmount, order.currency)}
                </span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-brown-2">
                  <span>İndirim</span>
                  <span className="font-semibold text-sage">−{formatPrice(order.discountAmount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 font-bold text-brown">
                <span>Toplam</span>
                <span className="font-serif text-[16px]">{formatPrice(order.totalAmount, order.currency)}</span>
              </div>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="rounded-panel border border-line bg-white p-5">
              <h2 className="mb-2 font-serif text-[16px] font-semibold text-brown">Teslimat Adresi</h2>
              <p className="text-[13.5px] leading-relaxed text-brown-2">
                {[order.customerFirstName, order.customerLastName].filter(Boolean).join(' ')}
                <br />
                {[order.shippingAddress.line1, order.shippingAddress.line2].filter(Boolean).join(', ')}
                <br />
                {[order.shippingAddress.district, order.shippingAddress.city, order.shippingAddress.postalCode]
                  .filter(Boolean)
                  .join(', ')}
                {order.shippingAddress.country ? ` · ${order.shippingAddress.country}` : ''}
              </p>
            </div>
          )}

          {order.notes && order.notes.trim() && (
            <div className="rounded-panel border border-line bg-white p-5">
              <h2 className="mb-2 font-serif text-[16px] font-semibold text-brown">Sipariş Notu</h2>
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-brown-2">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function OrderTrackPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <TrackContent />
    </Suspense>
  )
}
