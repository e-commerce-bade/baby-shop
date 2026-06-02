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
}

export default function CartItem({ item }: Props) {
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)

  const [gradFrom, gradTo] = PALETTES[item.productId % PALETTES.length]
  const lineTotal = parseFloat(item.price) * item.quantity

  return (
    <div className="flex gap-3 py-4">
      <Link
        href={`/products/${item.slug}`}
        className="h-[88px] w-[74px] shrink-0 overflow-hidden rounded-card border border-line-2"
        style={{
          background: item.primaryImageUrl
            ? undefined
            : `linear-gradient(160deg, ${gradFrom}, ${gradTo})`,
        }}
      >
        {item.primaryImageUrl ? (
          <img
            src={item.primaryImageUrl}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/products/${item.slug}`}
              className="font-serif text-[13.5px] font-semibold leading-[1.25] text-brown transition-colors hover:text-rose-dk"
            >
              {item.productName}
            </Link>
            <p className="mt-0.5 text-[11.5px] font-semibold text-muted">
              {item.variantLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void removeItem(item.id)}
            aria-label="Sepetten kaldır"
            className="shrink-0 p-0.5 text-muted transition-colors hover:text-rose-dk"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="inline-flex overflow-hidden rounded-[8px] border border-line">
            <button
              type="button"
              aria-label="Azalt"
              disabled={item.quantity <= 1}
              onClick={() => void updateQuantity(item.id, item.quantity - 1)}
              className="grid h-8 w-8 place-items-center text-base text-brown-2 transition-colors hover:bg-cream-2 disabled:opacity-40"
            >
              −
            </button>
            <span className="grid min-w-[32px] place-items-center border-x border-line text-[13px] font-bold text-brown">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="Artır"
              onClick={() => void updateQuantity(item.id, item.quantity + 1)}
              className="grid h-8 w-8 place-items-center text-base text-brown-2 transition-colors hover:bg-cream-2"
            >
              +
            </button>
          </div>

          <span className="text-sm font-extrabold text-brown">
            {formatPrice(lineTotal, item.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}
