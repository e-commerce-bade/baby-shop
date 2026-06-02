'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCartStore, cartSubtotal } from '@/store/cartStore'
import CartItem from '@/components/cart/CartItem'
import CartSummary from '@/components/cart/CartSummary'

export default function CartPage() {
  const [mounted, setMounted] = useState(false)
  const items    = useCartStore((s) => s.items)
  const subtotal = useCartStore(cartSubtotal)
  const currency = items[0]?.currency ?? 'TRY'

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="min-h-[60vh]" />
  }

  if (items.length === 0) {
    return <EmptyCartView />
  }

  return (
    <div className="min-h-[60vh] px-[38px] py-10 max-[980px]:px-6 max-[680px]:px-5">
      <h1 className="mb-8 font-serif text-[28px] font-semibold text-brown">Sepetim</h1>

      <div className="grid grid-cols-[1fr_360px] items-start gap-10 max-[980px]:grid-cols-1">

        {/* Ürün listesi */}
        <div className="space-y-4">
          <div className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-white px-6">
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brown-2 transition-colors hover:text-rose-dk"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Alışverişe Devam Et
          </Link>
        </div>

        {/* Özet kartı */}
        <div className="rounded-panel border border-line bg-white p-6 max-[980px]:order-first">
          <h2 className="mb-5 font-serif text-[18px] font-semibold text-brown">
            Sipariş Özeti
          </h2>
          <CartSummary subtotal={subtotal} currency={currency} />
        </div>

      </div>
    </div>
  )
}

function EmptyCartView() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-5 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-cream-2 text-rose-soft">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M6 7h12l-1 13H7L6 7z" />
          <path d="M9 7a3 3 0 016 0" />
        </svg>
      </div>
      <div>
        <p className="font-serif text-[22px] font-semibold text-brown">Sepetiniz boş</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Küçükler için özenle seçilmiş parçaları keşfetmeye başlayın.
        </p>
      </div>
      <Link
        href="/products"
        className="mt-1 rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
      >
        Ürünleri Keşfet
      </Link>
    </div>
  )
}
