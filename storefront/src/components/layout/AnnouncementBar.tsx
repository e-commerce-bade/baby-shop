'use client'

import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping'

export default function AnnouncementBar() {
  // Eşik backend'den (cart özeti) gelir; henüz yoksa yerel varsayılana düş.
  const summary = useCartStore((s) => s.checkoutSummary)
  const threshold = summary?.freeShippingThreshold != null
    ? Number(summary.freeShippingThreshold)
    : FREE_SHIPPING_THRESHOLD
  const currency = summary?.currency ?? 'TRY'

  return (
    <div
      className="relative flex items-center justify-center gap-[18px] py-2.5 text-[13px] font-semibold tracking-[0.2px]"
      style={{ background: 'linear-gradient(90deg,#EDE6DC,#E5DDD0)', color: '#6B5A48' }}
    >
      <span style={{ color: '#BF8060' }}>♥</span>
      <span>{formatPrice(threshold, currency)} üzeri siparişlerde ücretsiz kargo</span>
    </div>
  )
}
