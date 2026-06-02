'use client'

import { useCartStore, cartSubtotal } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : parseFloat(v)
}

interface Props {
  /** 'bar' — yalnızca progress bar (drawer üstü). 'card' — açıklama metniyle birlikte kutu (full page). */
  variant?: 'bar' | 'card'
}

export default function CartFreeShippingBar({ variant = 'bar' }: Props) {
  const summary   = useCartStore((s) => s.checkoutSummary)
  const localSub  = useCartStore(cartSubtotal)

  // Backend verisi hazırsa ondan, değilse yerel subtotal'dan hesapla (geçici fallback)
  const LOCAL_THRESHOLD = 1500
  const isFree      = summary ? summary.eligibleForFreeShipping : localSub >= LOCAL_THRESHOLD
  const threshold   = summary ? toNum(summary.freeShippingThreshold)           : LOCAL_THRESHOLD
  const remaining   = summary ? toNum(summary.remainingAmountForFreeShipping)  : Math.max(0, LOCAL_THRESHOLD - localSub)
  const currency    = summary?.currency ?? 'TRY'
  const progress    = threshold > 0 ? Math.min(100, ((threshold - remaining) / threshold) * 100) : 0

  // Backend ücretsiz kargo devre dışı bıraktıysa (threshold null) bar'ı gizle
  if (summary && summary.freeShippingThreshold == null) return null

  if (variant === 'card') {
    return (
      <div className="rounded-panel border border-line bg-cream-2 px-5 py-4">
        {isFree ? (
          <p className="text-[13px] font-semibold text-sage">
            🎉 Ücretsiz kargo kazandın!
          </p>
        ) : (
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-brown-2">
              Neredeyse var! Ücretsiz kargo için{' '}
              <span className="font-bold text-brown">
                {formatPrice(remaining, currency)}
              </span>{' '}
              daha ekle.
            </p>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-rose transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-muted">
              <span>{formatPrice(threshold - remaining, currency)}</span>
              <span>{formatPrice(threshold, currency)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* variant === 'bar' */
  return (
    <div className="border-b border-line bg-cream-3 px-6 py-3">
      {isFree ? (
        <p className="text-center text-[12px] font-semibold text-sage">
          🎉 Ücretsiz kargo kazandın!
        </p>
      ) : (
        <div>
          <p className="mb-1.5 text-center text-[11.5px] font-semibold text-brown-2">
            Ücretsiz kargo için{' '}
            <span className="font-bold text-brown">{formatPrice(remaining, currency)}</span>{' '}
            daha ekle
          </p>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-rose transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
