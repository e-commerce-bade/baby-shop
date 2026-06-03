'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import CartItem from '@/components/cart/CartItem'
import CartSummary from '@/components/cart/CartSummary'
import CartFreeShippingBar from '@/components/cart/CartFreeShippingBar'
import CartTrustStrip from '@/components/cart/CartTrustStrip'
import CheckoutForm from '@/components/cart/CheckoutForm'

export default function CartPage() {
  const [mounted, setMounted] = useState(false)
  const hasHydrated = useCartStore((s) => s.hasHydrated)
  const isSyncing = useCartStore((s) => s.isSyncing)
  const items = useCartStore((s) => s.items)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="min-h-[60vh]" />
  if (!hasHydrated || isSyncing) return <div className="min-h-[60vh]" />
  if (items.length === 0) return <EmptyCart />

  return (
    <div className="min-h-[60vh] px-[38px] py-10 max-[980px]:px-6 max-[680px]:px-4 max-[680px]:py-7">
      <div className="mb-6">
        <h1 className="font-serif text-[28px] font-semibold leading-none text-brown max-[680px]:text-[24px]">
          Sepetim{' '}
          <span className="text-[20px] font-normal text-muted max-[680px]:text-[16px]">
            ({totalQty})
          </span>
        </h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Kucugun icin ozenle secildi.
        </p>
      </div>

      <div className="mb-7">
        <CartTrustStrip variant="strip" />
      </div>

      <div className="grid grid-cols-[1fr_340px] items-start gap-8 max-[980px]:grid-cols-1">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-panel border border-line bg-white">
            <div className="hidden border-b border-line bg-cream-3 px-5 py-3 md:grid md:grid-cols-[1fr_88px_136px_88px_36px] md:gap-4">
              {['Urun', 'Fiyat', 'Adet', 'Toplam', ''].map((col) => (
                <span
                  key={col}
                  className="text-[10.5px] font-bold uppercase tracking-wide text-muted last:text-right"
                  style={{
                    textAlign:
                      col === 'Toplam' ? 'right' : col === 'Adet' || col === 'Fiyat' ? 'center' : 'left',
                  }}
                >
                  {col}
                </span>
              ))}
            </div>

            {items.map((item) => (
              <CartItem key={item.id} item={item} size="full" />
            ))}
          </div>

          <CartFreeShippingBar variant="card" />

          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brown-2 transition-colors hover:text-rose-dk"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Alisverise Devam Et
          </Link>
        </div>

        <div className="rounded-panel border border-line bg-white p-6 max-[980px]:order-first">
          <h2 className="mb-5 font-serif text-[17px] font-semibold text-brown">
            Siparis Ozeti
          </h2>

          <CartSummary showPromo />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['VISA', 'MC', 'AMEX', 'PayPal', 'ApplePay'].map((brand) => (
              <span
                key={brand}
                className="rounded-[4px] border border-line px-2 py-1 text-[9px] font-bold tracking-wide text-muted"
              >
                {brand}
              </span>
            ))}
          </div>

          <CheckoutForm />
        </div>
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-5 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-cream-2 text-rose-soft">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M6 7h12l-1 13H7L6 7z" />
          <path d="M9 7a3 3 0 016 0" />
        </svg>
      </div>
      <div>
        <p className="font-serif text-[22px] font-semibold text-brown">Sepetiniz bos</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Kucukler icin ozenle secilmis parcalari kesfetmeye baslayin.
        </p>
      </div>
      <Link
        href="/products"
        className="mt-1 rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
      >
        Urunleri Kesfet
      </Link>
    </div>
  )
}
