import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import CategoryStrip from '@/components/home/CategoryStrip'
import ProductSection from '@/components/home/ProductSection'
import TrustBand from '@/components/home/TrustBand'
import NewsletterBand from '@/components/home/NewsletterBand'
import CampaignPlacement from '@/components/campaign/CampaignPlacement'
import FilterSidebar from '@/components/product/filter/FilterSidebar'
import FilterSidebarSkeleton from '@/components/product/filter/FilterSidebarSkeleton'
import { fetchCategoryStripItems, fetchProducts } from '@/lib/api/catalog'
import { filterProductsByFacets } from '@/lib/productFilters'
import type { ProductSummary } from '@/types/product'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SearchParams {
  category?: string
  categorySlug?: string
  productTypes?: string
  colors?: string
  sizes?: string
  price?: string
}

function applyFilters(products: ProductSummary[], params: SearchParams) {
  const categorySlug = params.categorySlug ?? params.category
  const scoped = categorySlug
    ? products.filter((product) => product.categorySlug === categorySlug)
    : products

  return filterProductsByFacets(scoped, params)
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const categorySlug = params.categorySlug ?? params.category
  const [categories, products] = await Promise.all([
    fetchCategoryStripItems(),
    fetchProducts(categorySlug),
  ])

  const filteredProducts = applyFilters(products, params)
  const newItems = filteredProducts.slice(0, 4)
  const bestItems = filteredProducts.slice(4, 8).length > 0
    ? filteredProducts.slice(4, 8)
    : filteredProducts.slice(0, 4)

  return (
    <div className="px-[38px] py-5 max-[980px]:px-6 max-[680px]:px-5">
      <NewsletterBand />
      <HeroSection />

      <div className="mt-5">
        <CategoryStrip categories={categories} />
      </div>
      <div className="mt-5">
        <CampaignPlacement placement="homeBelowCategories" />
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
    </div>
  )
}
