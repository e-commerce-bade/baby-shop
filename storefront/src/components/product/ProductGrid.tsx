import ProductCard from './ProductCard'
import type { ProductSummary } from '@/types/product'
import type { ComponentProps } from 'react'

type Badge = ComponentProps<typeof ProductCard>['badge']

interface Props {
  products: ProductSummary[]
  badge?: Badge
}

export default function ProductGrid({ products, badge }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3.5 max-[980px]:grid-cols-3 max-[680px]:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} badge={badge} />
      ))}
    </div>
  )
}
