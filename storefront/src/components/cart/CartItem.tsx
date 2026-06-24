'use client'

import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import type { CartLineItem } from '@/types/cart'

const PALETTES = [
  ['#EFE6D7', '#DDCBB340'],
  ['#F4E0DD', '#E6BFBA40'],
  ['#DCE7EE', '#BFD3E040'],
  ['#E2EAD8', '#C2D2AE40'],
  ['#E9DECF', '#D2BCA240'],
  ['#F3DEDB', '#E3B9B440'],
] as const

interface Props {
  item: CartLineItem
  /**
   * compact — drawer içi (varsayılan)
   * full    — /cart tam sayfa, masaüstünde tablo satırı, mobilde kart
   */
  size?: 'compact' | 'full'
}

/* ─── Thumbnail ─────────────────────────────────────────────── */
function Thumb({
  item,
  gradFrom,
  gradTo,
  className,
}: {
  item: CartLineItem
  gradFrom: string
  gradTo: string
  className: string
}) {
  return (
    <Link
      href={`/products/${item.slug}`}
      tabIndex={-1}
      className={`shrink-0 overflow-hidden rounded-card border border-line-2 ${className}`}
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
    </Link>
  )
}

/* ─── Quantity stepper ───────────────────────────────────────── */
function QtyControl({
  item,
  updateQuantity,
  isSyncing,
  compact = false,
}: {
  item: CartLineItem
  updateQuantity: (id: string, quantity: number) => void
  isSyncing: boolean
  compact?: boolean
}) {
  const h = compact ? 'h-8 w-8' : 'h-9 w-9'
  const mid = compact ? 'min-w-[30px] text-[12.5px]' : 'min-w-[38px] text-[13px]'
  return (
    <div className="inline-flex overflow-hidden rounded-[8px] border border-line">
      <button
        type="button"
        aria-label="Adedi azalt"
        disabled={item.quantity <= 1}
        onClick={() => updateQuantity(item.id, item.quantity - 1)}
        className={`grid ${h} place-items-center text-base text-brown-2 transition-colors hover:bg-cream-2 disabled:opacity-40`}
      >
        −
      </button>
      <span
        className={`grid ${mid} place-items-center border-x border-line font-bold text-brown`}
      >
        {item.quantity}
      </span>
      <button
        type="button"
        aria-label="Adedi artır"
        disabled={isSyncing}
        onClick={() => updateQuantity(item.id, item.quantity + 1)}
        className={`grid ${h} place-items-center text-base text-brown-2 transition-colors hover:bg-cream-2 disabled:opacity-40`}
      >
        +
      </button>
    </div>
  )
}

export default function CartItem({ item, size = 'compact' }: Props) {
  const removeItem     = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const isSyncing      = useCartStore((s) => s.isSyncing)

  const [gradFrom, gradTo] = PALETTES[item.productId % PALETTES.length]
  const unitPrice = parseFloat(item.price)
  const lineTotal = unitPrice * item.quantity

  /* ─── COMPACT (drawer) ───────────────────────────────────────── */
  if (size === 'compact') {
    return (
      <div className={`flex gap-3.5 py-4 ${isSyncing ? 'opacity-60' : ''}`}>
        <Thumb item={item} gradFrom={gradFrom} gradTo={gradTo} className="h-[90px] w-[76px]" />

        <div className="flex flex-1 flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/products/${item.slug}`}
                className="font-serif text-[13.5px] font-semibold leading-snug text-brown transition-colors hover:text-rose-dk"
              >
                {item.productName}
              </Link>
              <p className="mt-0.5 text-[11.5px] font-semibold text-muted">
                {item.variantLabel}
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-brown-2">
                {formatPrice(unitPrice, item.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void removeItem(item.id)}
              disabled={isSyncing}
              aria-label="Sepetten kaldır"
              className="shrink-0 p-0.5 text-muted transition-colors hover:text-rose-dk disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <QtyControl item={item} updateQuantity={updateQuantity} isSyncing={isSyncing} compact />
            <span className="text-[13.5px] font-extrabold text-brown">
              {formatPrice(lineTotal, item.currency)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ─── FULL (cart page) ───────────────────────────────────────── */
  return (
    <div className={`border-b border-line last:border-0 ${isSyncing ? 'opacity-60' : ''}`}>
      {/* Desktop: tablo satırı */}
      <div className="hidden items-center gap-4 px-5 py-4 md:grid md:grid-cols-[1fr_88px_136px_88px_36px]">
        {/* Ürün */}
        <div className="flex items-center gap-3.5">
          <Thumb item={item} gradFrom={gradFrom} gradTo={gradTo} className="h-[76px] w-[64px]" />
          <div>
            <Link
              href={`/products/${item.slug}`}
              className="font-serif text-[14px] font-semibold leading-snug text-brown transition-colors hover:text-rose-dk"
            >
              {item.productName}
            </Link>
            <p className="mt-0.5 text-[12px] font-semibold text-muted">{item.variantLabel}</p>
          </div>
        </div>

        {/* Birim fiyat */}
        <span className="text-center text-[13.5px] font-semibold text-brown-2">
          {formatPrice(unitPrice, item.currency)}
        </span>

        {/* Adet */}
        <div className="flex justify-center">
          <QtyControl item={item} updateQuantity={updateQuantity} isSyncing={isSyncing} />
        </div>

        {/* Satır toplamı */}
        <span className="text-right text-[14px] font-extrabold text-brown">
          {formatPrice(lineTotal, item.currency)}
        </span>

        {/* Kaldır */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void removeItem(item.id)}
            disabled={isSyncing}
            aria-label="Sepetten kaldır"
            className="p-1 text-muted transition-colors hover:text-rose-dk disabled:opacity-40"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile: kart */}
      <div className="flex gap-3.5 px-5 py-4 md:hidden">
        <Thumb item={item} gradFrom={gradFrom} gradTo={gradTo} className="h-[88px] w-[74px]" />

        <div className="flex flex-1 flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/products/${item.slug}`}
                className="font-serif text-[13.5px] font-semibold leading-snug text-brown transition-colors hover:text-rose-dk"
              >
                {item.productName}
              </Link>
              <p className="mt-0.5 text-[11.5px] font-semibold text-muted">{item.variantLabel}</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-brown-2">
                {formatPrice(unitPrice, item.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void removeItem(item.id)}
              disabled={isSyncing}
              aria-label="Sepetten kaldır"
              className="shrink-0 p-0.5 text-muted hover:text-rose-dk disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <QtyControl item={item} updateQuantity={updateQuantity} isSyncing={isSyncing} compact />
            <span className="text-[13.5px] font-extrabold text-brown">
              {formatPrice(lineTotal, item.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
