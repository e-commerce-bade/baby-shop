import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'
import type { ProductSummary } from '@/types/product'
import type { ComponentProps } from 'react'

type Badge = ComponentProps<typeof ProductGrid>['badge']

interface Props {
  title: string
  viewAllHref: string
  products: ProductSummary[]
  badge?: Badge
}

export default function ProductSection({
  title,
  viewAllHref,
  products,
  badge,
}: Props) {
  return (
    <div>
      <div className="mb-3.5 mt-4 flex items-end justify-between">
        <h2 className="font-serif text-[26px] font-semibold text-brown">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="group flex items-center gap-1 text-[13px] font-bold text-rose-dk transition-[gap] duration-200 hover:gap-2"
        >
          Tümünü gör
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>
      <ProductGrid products={products} badge={badge} />
    </div>
  )
}
