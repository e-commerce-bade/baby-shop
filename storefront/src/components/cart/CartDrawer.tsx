'use client'

import { useEffect } from 'react'
import { useCartStore, cartSubtotal } from '@/store/cartStore'
import CartItem from './CartItem'
import CartSummary from './CartSummary'

export default function CartDrawer() {
  const isOpen      = useCartStore((s) => s.isOpen)
  const closeDrawer = useCartStore((s) => s.closeDrawer)
  const items       = useCartStore((s) => s.items)
  const subtotal    = useCartStore(cartSubtotal)
  const currency    = items[0]?.currency ?? 'TRY'

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeDrawer])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={[
          'fixed inset-0 z-40 bg-brown/30 backdrop-blur-[2px]',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sepetim"
        className={[
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-white',
          'shadow-[-24px_0_60px_-16px_rgba(91,72,57,.22)]',
          'transition-transform duration-300 ease-in-out',
          'max-[480px]:max-w-full',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-[20px] font-semibold text-brown">Sepetim</span>
            {totalQty > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-rose px-1.5 text-[11px] font-bold text-white">
                {totalQty}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Sepeti kapat"
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-cream-2 hover:text-brown"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Boş durum */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-cream-2 text-rose-soft">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 7h12l-1 13H7L6 7z" />
                <path d="M9 7a3 3 0 016 0" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-[17px] font-semibold text-brown">Sepetiniz boş</p>
              <p className="mt-1 text-[13px] text-muted">
                Beğendiğiniz ürünleri sepete ekleyin.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="mt-2 rounded-[12px] border border-line px-5 py-2.5 text-sm font-semibold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk"
            >
              Alışverişe Devam Et
            </button>
          </div>
        ) : (
          <>
            {/* Ürün listesi */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6">
              <div className="divide-y divide-line">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Özet + CTA */}
            <div className="shrink-0 border-t border-line bg-cream-3 px-6 pb-6 pt-5">
              <CartSummary subtotal={subtotal} currency={currency} onCheckout={closeDrawer} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
