'use client'

import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : parseFloat(v)
}

const PALETTES = [
  ['#EFE6D7', '#DDCBB340'],
  ['#F4E0DD', '#E6BFBA40'],
  ['#DCE7EE', '#BFD3E040'],
  ['#E2EAD8', '#C2D2AE40'],
  ['#E9DECF', '#D2BCA240'],
  ['#F3DEDB', '#E3B9B440'],
] as const

interface Props {
  isSubmitting: boolean
}

export default function CheckoutOrderSummary({ isSubmitting }: Props) {
  const items   = useCartStore((s) => s.items)
  const summary = useCartStore((s) => s.checkoutSummary)
  const currency = summary?.currency ?? items[0]?.currency ?? 'TRY'

  const subtotal = toNum(summary?.subtotal)
  const shipping = toNum(summary?.shippingAmount)
  const discount = toNum(summary?.discountAmount)
  const total    = toNum(summary?.totalAmount)

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
      {/* ── Ürün listesi ─────────────────────────────── */}
      <div className="rounded-[18px] border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[16px] font-semibold text-brown">
            Sipariş Özeti{' '}
            <span className="font-normal text-muted text-[14px]">
              ({items.reduce((s, i) => s + i.quantity, 0)} ürün)
            </span>
          </h2>
          <Link
            href="/cart"
            className="text-[12px] font-bold text-rose underline underline-offset-2 transition-colors hover:text-rose-dk"
          >
            Sepeti Düzenle
          </Link>
        </div>

        {/* Items */}
        <div className="divide-y divide-line">
          {items.map((item) => {
            const [gradFrom, gradTo] = PALETTES[item.productId % PALETTES.length]
            return (
              <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                {/* Thumbnail */}
                <div
                  className="h-[68px] w-[58px] shrink-0 overflow-hidden rounded-[10px] border border-line-2"
                  style={{
                    background: item.primaryImageUrl
                      ? undefined
                      : `linear-gradient(160deg, ${gradFrom}, ${gradTo})`,
                  }}
                >
                  {item.primaryImageUrl && (
                    <img
                      src={item.primaryImageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[13px] font-semibold leading-snug text-brown">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{item.variantLabel}</p>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-brown-2">
                    Adet: {item.quantity}
                  </p>
                </div>
                {/* Price */}
                <span className="shrink-0 text-[13px] font-bold text-brown">
                  {formatPrice(parseFloat(item.price) * item.quantity, item.currency)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Fiyat özeti + CTA ────────────────────────── */}
      <div className="rounded-[18px] border border-line bg-white p-5">
        <div className="space-y-2.5 text-[13.5px]">
          <div className="flex justify-between text-brown-2">
            <span>Ara toplam</span>
            <span className="font-semibold text-brown">{formatPrice(subtotal, currency)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-brown-2">
              <span>İndirim</span>
              <span className="font-semibold text-sage">−{formatPrice(discount, currency)}</span>
            </div>
          )}

          <div className="flex justify-between text-brown-2">
            <span>Kargo</span>
            <span className="font-semibold text-brown">
              {shipping === 0 ? 'Ücretsiz' : formatPrice(shipping, currency)}
            </span>
          </div>

          <div className="flex justify-between border-t border-line pt-3 font-bold text-brown">
            <span className="text-[14.5px]">Sipariş Toplamı</span>
            <span className="font-serif text-[19px] text-rose-dk">{formatPrice(total, currency)}</span>
          </div>
        </div>

        {/* CTA — form="checkout-form" ile sol formu tetikler */}
        <button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-rose py-4 text-[15px] font-bold text-white transition-colors hover:bg-rose-dk disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          {isSubmitting ? 'Hazırlanıyor...' : 'Ödemeye Geç'}
        </button>

        <p className="mt-3 text-center text-[11px] text-muted">
          Güvenli ödeme · SSL şifreli · Kişisel veriler korunur
        </p>
      </div>
    </aside>
  )
}
