import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import FilterSidebar from '@/components/product/filter/FilterSidebar'
import ProductGrid from '@/components/product/ProductGrid'
import { fetchProducts } from '@/lib/api/catalog'
import type { ProductSummary } from '@/types/product'

export const metadata: Metadata = { title: 'Ürünler' }

interface SearchParams {
  category?: string
  categorySlug?: string
  colors?: string
  sizes?: string
  price?: string
  sort?: string
}

function applyFilters(
  products: ProductSummary[],
  params: SearchParams,
): ProductSummary[] {
  let result = [...products]

  if (params.colors) {
    const selected = params.colors.split(',').filter(Boolean)
    result = result.filter((product) =>
      product.variants.some((variant) => selected.includes(variant.colorName)),
    )
  }

  if (params.sizes) {
    const selected = params.sizes.split(',').filter(Boolean)
    result = result.filter((product) =>
      product.variants.some((variant) => selected.includes(variant.sizeLabel)),
    )
  }

  if (params.price) {
    result = result.filter((product) => {
      const price = parseFloat(product.lowestPrice)
      if (params.price === 'under-500') return price < 500
      if (params.price === '500-700') return price >= 500 && price <= 700
      if (params.price === 'over-700') return price > 700
      return true
    })
  }

  if (params.sort === 'price-asc') {
    result.sort((a, b) => parseFloat(a.lowestPrice) - parseFloat(b.lowestPrice))
  }

  if (params.sort === 'price-desc') {
    result.sort((a, b) => parseFloat(b.lowestPrice) - parseFloat(a.lowestPrice))
  }

  return result
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const categorySlug = params.categorySlug ?? params.category
  const products = applyFilters(await fetchProducts(categorySlug), params)

  const activeCount =
    (params.colors?.split(',').filter(Boolean).length ?? 0) +
    (params.sizes?.split(',').filter(Boolean).length ?? 0) +
    (params.price ? 1 : 0)

  return (
    <div className="px-[38px] py-5 max-[980px]:px-6 max-[680px]:px-5">
      <nav className="mb-6 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
        <Link href="/" className="text-brown-2 transition-colors hover:text-rose-dk">
          Ana Sayfa
        </Link>
        <span className="text-muted-2">›</span>
        <span className="text-brown">Ürünler</span>
      </nav>

      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-semibold text-brown">
            Tüm Ürünler
          </h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} ürün
            {activeCount > 0 && ` · ${activeCount} filtre aktif`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[248px_1fr] items-start gap-7 max-[980px]:grid-cols-1">
        <Suspense fallback={<FilterSidebarSkeleton />}>
          <FilterSidebar />
        </Suspense>

        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-serif text-xl text-brown">Ürün bulunamadı</p>
            <p className="mt-2 text-sm text-muted">
              Filtreleri değiştirerek tekrar dene.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterSidebarSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-cream-3 px-5 py-[22px]">
      <div className="mb-4 h-6 w-24 animate-pulse rounded bg-line" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border-t border-line py-4 first:border-t-0">
          <div className="h-4 w-20 animate-pulse rounded bg-line" />
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-4 w-full animate-pulse rounded bg-line" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
