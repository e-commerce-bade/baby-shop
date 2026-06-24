'use client'

import Link from 'next/link'
import { useCartStore, cartSubtotal } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from '@/lib/shipping'

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : parseFloat(v)
}

// Checkout'u engelleme nedeni → kullanıcıya gösterilecek mesaj
const BLOCKED_MESSAGES: Record<string, string> = {
  CART_EMPTY:    '', // Boş sepet zaten ayrı görünüm ile yönetiliyor
  OUT_OF_STOCK:  'Sepetinizdeki bazı ürünler stokta yok. Lütfen kontrol edin.',
  INVALID_ITEMS: 'Sepetinizdeki bazı ürünler artık mevcut değil.',
}

interface Props {
  /** Drawer modunda onCheckout verilirse button, verilmezse /checkout'a Link olur. */
  onCheckout?: () => void
}

export default function CartSummary({ onCheckout }: Props) {
  const summary   = useCartStore((s) => s.checkoutSummary)
  const localSub  = useCartStore(cartSubtotal)
  const currency  = useCartStore((s) => s.items[0]?.currency ?? 'TRY')

  // Backend verisi hazırsa öncelikli, yoksa yerel hesap (yükleniyor sırasında fallback)
  const sub      = summary ? toNum(summary.subtotal)      : localSub
  const cur      = summary?.currency ?? currency
  const shipping = summary
    ? toNum(summary.shippingAmount)
    : (localSub === 0 || localSub >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE)
  const discount = summary ? toNum(summary.discountAmount) : 0
  const total    = summary ? toNum(summary.totalAmount)   : sub + shipping - discount
  const isFree   = shipping === 0

  const blockedReason  = summary?.checkoutBlockedReason ?? null
  const blockedMessage = blockedReason && blockedReason !== 'CART_EMPTY'
    ? (BLOCKED_MESSAGES[blockedReason] ?? 'Siparişiniz tamamlanmadan önce bir sorun giderilmeli.')
    : null

  const address = summary?.defaultShippingAddress ?? null

  return (
    <div className="space-y-4">
      {/* Fiyat dökümü */}
      <div className="space-y-2.5 text-[13.5px]">
        <div className="flex justify-between text-brown-2">
          <span>Ara toplam</span>
          <span className="font-semibold text-brown">{formatPrice(sub, cur)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-brown-2">
            <span>İndirim</span>
            <span className="font-semibold text-sage">−{formatPrice(discount, cur)}</span>
          </div>
        )}

        <div className="flex justify-between text-brown-2">
          <span>Kargo</span>
          <span className={isFree ? 'font-semibold text-sage' : 'font-semibold text-brown'}>
            {isFree ? 'Ücretsiz' : formatPrice(shipping, cur)}
          </span>
        </div>

        <div className="flex justify-between border-t border-line pt-2.5 font-bold text-brown">
          <span>Toplam</span>
          <span className="font-serif text-[17px]">{formatPrice(total, cur)}</span>
        </div>
      </div>

      {/* Kayıtlı teslimat adresi — varsa ince ipucu */}
      {address && (
        <div className="flex items-center gap-2 rounded-[10px] border border-line bg-cream-3 px-3.5 py-2.5 text-[12px] text-brown-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-muted">
            <path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
            <circle cx="12" cy="11" r="2" />
          </svg>
          <span>
            Teslimat:{' '}
            <strong className="text-brown">
              {[address.district, address.city].filter(Boolean).join(', ')}
            </strong>
            {address.label && (
              <span className="ml-1 text-muted">({address.label})</span>
            )}
          </span>
        </div>
      )}

      {/* Checkout engeli uyarısı (boş sepet hariç) */}
      {blockedMessage && (
        <p className="rounded-[10px] border border-rose-soft bg-rose-tint px-3.5 py-2.5 text-[12px] font-semibold text-rose-dk">
          {blockedMessage}
        </p>
      )}

      {/* CTA */}
      {onCheckout ? (
        <Link
          href="/checkout"
          onClick={onCheckout}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-rose py-4 text-center text-[15px] font-bold text-white transition-colors hover:bg-rose-dk"
        >
          <LockIcon />
          Siparişi Tamamla
        </Link>
      ) : (
        <Link
          href="/checkout"
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-rose py-4 text-center text-[15px] font-bold text-white transition-colors hover:bg-rose-dk"
        >
          <LockIcon />
          Siparişi Tamamla
        </Link>
      )}

      <p className="text-center text-[11px] text-muted">Güvenli ödeme · SSL şifreli</p>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}
