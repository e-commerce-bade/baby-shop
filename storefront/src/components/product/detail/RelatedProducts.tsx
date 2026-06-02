import ProductCard from '@/components/product/ProductCard'
import type { ProductSummary } from '@/types/product'

interface Props {
  products: ProductSummary[]
}

export default function RelatedProducts({ products }: Props) {
  if (products.length === 0) return null

  return (
    <div className="mt-14">
      <h2 className="mb-5 font-serif text-[26px] font-semibold text-brown">
        Bunları da sevebilirsin
      </h2>
      <div className="grid grid-cols-5 gap-3.5 max-[980px]:grid-cols-3 max-[680px]:grid-cols-2">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
