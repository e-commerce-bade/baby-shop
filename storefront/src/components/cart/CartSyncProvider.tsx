'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

export default function CartSyncProvider() {
  const hasHydrated = useCartStore((state) => state.hasHydrated)
  const hydrateCart = useCartStore((state) => state.hydrateCart)

  useEffect(() => {
    if (!hasHydrated) {
      useCartStore.setState({ hasHydrated: true })
      return
    }

    void hydrateCart()
  }, [hasHydrated, hydrateCart])

  return <CartErrorToast />
}

// Sepet islemi (ekle/cikar/adet) basarisiz olursa kullaniciya gorunur bir uyari gosterir;
// aksi halde hatalar sessizce yutulur ve kullanici islemin basarisiz oldugunu anlamaz.
function CartErrorToast() {
  const cartError = useCartStore((state) => state.cartError)
  const clearCartError = useCartStore((state) => state.clearCartError)

  useEffect(() => {
    if (!cartError) return
    const timer = setTimeout(() => clearCartError(), 5000)
    return () => clearTimeout(timer)
  }, [cartError, clearCartError])

  if (!cartError) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[9999] flex justify-center px-4">
      <div
        role="alert"
        className="pointer-events-auto flex max-w-md items-start gap-3 rounded-[14px] border border-rose-soft bg-white px-4 py-3 shadow-[0_12px_40px_rgba(61,43,31,0.18)]"
      >
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-rose-dk"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
        <p className="flex-1 text-[13px] font-semibold leading-snug text-brown">{cartError}</p>
        <button
          type="button"
          onClick={clearCartError}
          aria-label="Kapat"
          className="-mr-1 -mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-cream-3 hover:text-brown"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
