'use client'

import { formatPrice } from '@/lib/utils'

interface Props {
  price: string
  currency: string
  originalPrice: number | null
  hasSize: boolean
  canAddToCart: boolean
  isAdding: boolean
  onAddToCart: () => void
}

export default function MobileStickyBar({
  price,
  currency,
  originalPrice,
  hasSize,
  canAddToCart,
  isAdding,
  onAddToCart,
}: Props) {
  function handleClick() {
    // Beden seçilmemişse seçenek alanına kaydır; seçilmişse doğrudan sepete ekle.
    if (!hasSize) {
      document
        .getElementById('product-options')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onAddToCart()
  }

  const label = isAdding
    ? 'Ekleniyor...'
    : !hasSize
      ? 'Beden Seç & Ekle'
      : canAddToCart
        ? 'Sepete Ekle'
        : 'Stokta Yok'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-4 border-t border-line bg-white px-5 py-3.5 shadow-[0_-8px_28px_-8px_rgba(91,72,57,.18)] md:hidden">
      <div className="flex flex-col">
        <span className="font-serif text-[22px] font-semibold leading-none text-brown">
          {formatPrice(price, currency)}
        </span>
        {originalPrice != null ? (
          <span className="mt-0.5 text-xs text-muted line-through">
            {formatPrice(originalPrice, currency)}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isAdding || (hasSize && !canAddToCart)}
        className="flex-1 rounded-[12px] bg-rose py-3.5 text-sm font-bold text-white transition-colors hover:bg-rose-dk disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  )
}
