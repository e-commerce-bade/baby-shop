'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import CheckoutHelpCard from './CheckoutHelpCard'

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

  const [promoCode, setPromoCode] = useState('')

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

        {/* Promo code — UI placeholder */}
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Promosyon kodu"
            className="flex-1 rounded-[10px] border border-line bg-cream-3 px-3.5 py-2.5 text-[13px] text-brown placeholder:text-muted focus:border-rose-soft focus:outline-none"
          />
          <button
            type="button"
            disabled={!promoCode.trim()}
            className="shrink-0 rounded-[10px] border border-line px-4 py-2.5 text-[13px] font-semibold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk disabled:opacity-40"
          >
            Uygula
          </button>
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

      {/* ── Güven satırı ─────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-line rounded-[14px] border border-line bg-white text-center">
        {[
          { icon: <LockIcon />, label: 'Güvenli Ödeme', sub: 'Verileriniz korunur' },
          { icon: <ReturnIcon />, label: 'Kolay İade', sub: '30 gün içinde' },
          { icon: <TruckIcon />, label: 'Hızlı Teslimat', sub: '2-4 iş günü' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1 px-2 py-3.5">
            <span className="text-muted">{item.icon}</span>
            <span className="text-[10.5px] font-bold leading-tight text-brown">{item.label}</span>
            <span className="text-[9.5px] leading-tight text-muted">{item.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Yardım kartı ─────────────────────────────── */}
      <CheckoutHelpCard />
    </aside>
  )
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}
function ReturnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12a8 8 0 0114-5" /><path d="M20 12a8 8 0 01-14 5" />
      <path d="M18 3v4h-4" /><path d="M6 21v-4h4" />
    </svg>
  )
}
function TruckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 4v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}
