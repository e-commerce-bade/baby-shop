import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import CategoryStrip from '@/components/home/CategoryStrip'
import ProductSection from '@/components/home/ProductSection'
import TrustBand from '@/components/home/TrustBand'
import NewsletterBand from '@/components/home/NewsletterBand'
import FilterSidebar from '@/components/product/filter/FilterSidebar'
import { fetchCategoryStripItems, fetchProducts } from '@/lib/api/catalog'
import type { ProductSummary } from '@/types/product'

interface SearchParams {
  colors?: string
  sizes?: string
  price?: string
}

function applyFilters(products: ProductSummary[], params: SearchParams) {
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

  return result
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const [categories, products] = await Promise.all([
    fetchCategoryStripItems(),
    fetchProducts(),
  ])

  const filteredProducts = applyFilters(products, params)
  const newItems = filteredProducts.slice(0, 4)
  const bestItems = filteredProducts.slice(4, 8).length > 0
    ? filteredProducts.slice(4, 8)
    : filteredProducts.slice(0, 4)

  return (
    <div className="px-[38px] py-5 max-[980px]:px-6 max-[680px]:px-5">
      <HeroSection />

      <div className="mt-5">
        <CategoryStrip categories={categories} />
      </div>

      <div className="mt-5 grid grid-cols-[248px_1fr] items-start gap-7 max-[980px]:grid-cols-1">
        <Suspense fallback={<FilterSidebarSkeleton />}>
          <FilterSidebar />
        </Suspense>

        <div>
          <ProductSection
            title="Yeni Gelenler"
            viewAllHref="/products?sort=new-arrivals"
            products={newItems}
            badge="new"
          />
          <div className="mt-2">
            <ProductSection
              title="Çok Satanlar"
              viewAllHref="/products?sort=best-sellers"
              products={bestItems}
              badge="best"
            />
          </div>
        </div>
      </div>

      <TrustBand />
      <NewsletterBand />
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
