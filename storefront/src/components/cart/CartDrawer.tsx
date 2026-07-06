'use client'

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import CartItem from './CartItem'
import CartSummary from './CartSummary'
import CartFreeShippingBar from './CartFreeShippingBar'
import CartTrustStrip from './CartTrustStrip'

export default function CartDrawer() {
  const isOpen      = useCartStore((s) => s.isOpen)
  const closeDrawer = useCartStore((s) => s.closeDrawer)
  const hasHydrated = useCartStore((s) => s.hasHydrated)
  const isSyncing   = useCartStore((s) => s.isSyncing)
  const items    = useCartStore((s) => s.items)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  // Sepet açıkken geri tuşu (telefon/tarayıcı) önce sepeti kapatsın, sayfada geri gitmesin.
  // Açılışta geçmişe bir kayıt ekleriz; geri basınca popstate ile sepeti kapatırız.
  useEffect(() => {
    if (!isOpen) return
    // Next.js router verisini koru, üzerine kendi bayrağımızı ekle (aynı URL, yeni geçmiş kaydı).
    window.history.pushState({ ...window.history.state, badebebeCart: true }, '')
    const onPopState = () => closeDrawer()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isOpen, closeDrawer])

  // UI'dan kapatma (Geri butonu / arka plan / Escape): eklediğimiz geçmiş kaydını da temizlemek
  // için history.back() ile kapatırız (bu da popstate → closeDrawer tetikler). Kayıt yoksa direkt kapat.
  const requestClose = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.badebebeCart) {
      window.history.back()
    } else {
      closeDrawer()
    }
  }, [closeDrawer])

  /* Klavye ve scroll kilidi */
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, requestClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={requestClose}
        className={[
          'fixed inset-0 z-40 bg-brown/25 backdrop-blur-[2px]',
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
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col bg-white',
          'shadow-[-20px_0_60px_-12px_rgba(91,72,57,.2)]',
          'transition-transform duration-300 ease-in-out',
          'max-[480px]:max-w-full',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* ── Başlık: solda Geri, ortada Sepetim ──────────── */}
        <div className="relative flex shrink-0 items-center px-4 py-4">
          <button
            type="button"
            onClick={requestClose}
            aria-label="Geri"
            className="z-10 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] font-semibold text-brown-2 transition-colors hover:bg-cream-2 hover:text-brown"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Geri
          </button>
          <div className="pointer-events-none absolute inset-x-0 flex items-baseline justify-center gap-2">
            <span className="font-serif text-[19px] font-semibold text-brown">Sepetim</span>
            {totalQty > 0 && (
              <span className="text-[12px] font-bold text-muted">({totalQty})</span>
            )}
          </div>
        </div>

        {/* ── İçerik ──────────────────────────────────────── */}
        {!hasHydrated || isSyncing ? (
          <DrawerLoading />
        ) : items.length === 0 ? (
          <EmptyDrawer onClose={requestClose} />
        ) : (
          <>
            {/* Ücretsiz kargo barı */}
            <CartFreeShippingBar variant="bar" />

            {/* Ürün listesi */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="divide-y divide-line px-6">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} size="compact" />
                ))}
              </div>
            </div>

            {/* Alt panel */}
            <div className="shrink-0 border-t border-line px-6 pb-5 pt-4">
              {/* Özet + CTA */}
              <CartSummary onCheckout={closeDrawer} />

              {/* Sepeti görüntüle (ikincil) */}
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="mt-2 block w-full rounded-[14px] border border-line py-3 text-center text-[13.5px] font-semibold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk"
              >
                Tüm Sepeti Görüntüle
              </Link>

              {/* Güven satırı */}
              <div className="mt-4">
                <CartTrustStrip variant="row" />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function DrawerLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-rose" />
      <p className="text-[13px] font-semibold text-brown-2">Sepet hazırlanıyor...</p>
    </div>
  )
}

function EmptyDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-cream-2 text-rose-soft">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M6 7h12l-1 13H7L6 7z" />
          <path d="M9 7a3 3 0 016 0" />
        </svg>
      </div>
      <div>
        <p className="font-serif text-[17px] font-semibold text-brown">Sepetiniz boş</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Beğendiğiniz ürünleri sepete ekleyin.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-[12px] border border-line px-6 py-2.5 text-sm font-semibold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk"
      >
        Alışverişe Devam Et
      </button>
    </div>
  )
}
