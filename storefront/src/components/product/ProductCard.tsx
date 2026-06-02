'use client'

import Link from 'next/link'
import { cn, formatPrice } from '@/lib/utils'
import type { ProductSummary } from '@/types/product'

const PALETTES = [
  ['#EFE6D7', '#DDCBB340'],
  ['#F4E0DD', '#E6BFBA40'],
  ['#DCE7EE', '#BFD3E040'],
  ['#E2EAD8', '#C2D2AE40'],
  ['#E9DECF', '#D2BCA240'],
  ['#F3DEDB', '#E3B9B440'],
] as const

type Badge = 'new' | 'best'

interface Props {
  product: ProductSummary
  badge?: Badge
}

const badgeStyles: Record<Badge, string> = {
  new: 'bg-rose text-white',
  best: 'bg-brown text-white',
}

const badgeLabels: Record<Badge, string> = {
  new: 'Yeni',
  best: 'Çok Satan',
}

export default function ProductCard({ product, badge }: Props) {
  const [gradFrom, gradTo] = PALETTES[product.id % PALETTES.length]

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block transition-transform duration-[220ms] hover:-translate-y-[5px]"
    >
      <div
        className="relative aspect-[1/1.06] overflow-hidden rounded-card border border-line-2 transition-shadow duration-[220ms] group-hover:shadow-card"
        style={{
          background: `linear-gradient(160deg, ${gradFrom}, ${gradTo})`,
        }}
      >
        {product.primaryImage ? (
          <img
            src={product.primaryImage.imageUrl}
            alt={product.primaryImage.altText ?? product.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" />
        )}

        {badge && (
          <span
            className={cn(
              'absolute left-2 top-2 z-10 rounded-[20px] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.4px]',
              badgeStyles[badge],
            )}
          >
            {badgeLabels[badge]}
          </span>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
          }}
          aria-label="Favorilere ekle"
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-muted transition-colors hover:bg-white hover:text-rose"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
          </svg>
        </button>
      </div>

      <div className="mt-[9px] font-serif text-[13.5px] font-semibold leading-[1.25] text-brown">
        {product.name}
      </div>
      {product.colorLabel && (
        <div className="text-[11.5px] font-semibold text-muted">
          {product.colorLabel}
        </div>
      )}
      <div className="mt-0.5 text-sm font-extrabold text-brown">
        {formatPrice(product.lowestPrice, product.currency)}
      </div>
    </Link>
  )
}
