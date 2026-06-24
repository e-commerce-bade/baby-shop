import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import CampaignPlacement from '@/components/campaign/CampaignPlacement'
import FilterSidebar from '@/components/product/filter/FilterSidebar'
import FilterSidebarSkeleton from '@/components/product/filter/FilterSidebarSkeleton'
import ProductGrid from '@/components/product/ProductGrid'
import Pagination from '@/components/product/Pagination'
import { fetchProductsPage } from '@/lib/api/catalog'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'Ürünler' }

interface SearchParams {
  q?: string
  category?: string
  categorySlug?: string
  productTypes?: string
  colors?: string
  sizes?: string
  price?: string
  sort?: string
  page?: string
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const categorySlug = params.categorySlug ?? params.category
  const pageIndex = Math.max(0, (parseInt(params.page ?? '1', 10) || 1) - 1)

  // Filtre + siralama + sayfalama sunucuda yapilir (bkz. /api/v1/products/search).
  const result = await fetchProductsPage({
    categorySlug,
    q: params.q,
    productTypes: params.productTypes,
    colors: params.colors,
    sizes: params.sizes,
    price: params.price,
    sort: params.sort,
    page: pageIndex,
  })
  const products = result.items

  // Sayfalama link'lerinde korunacak filtre/siralama parametreleri (page haric).
  const baseParams: Record<string, string | undefined> = {
    q: params.q,
    categorySlug,
    productTypes: params.productTypes,
    colors: params.colors,
    sizes: params.sizes,
    price: params.price,
    sort: params.sort,
  }

  const activeCount =
    (categorySlug ? 1 : 0) +
    (params.productTypes?.split(',').filter(Boolean).length ?? 0) +
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
            {params.q ? `"${params.q}" için sonuçlar` : 'Tüm Ürünler'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {result.totalElements} ürün
            {activeCount > 0 && ` · ${activeCount} filtre aktif`}
          </p>
        </div>
      </div>
      <div className="mb-5">
        <CampaignPlacement placement="productListTop" />
      </div>

      <div className="grid grid-cols-[248px_1fr] items-start gap-7 max-[980px]:grid-cols-1">
        <Suspense fallback={<FilterSidebarSkeleton />}>
          <FilterSidebar />
        </Suspense>

        {products.length > 0 ? (
          <div>
            <ProductGrid products={products} />
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              baseParams={baseParams}
            />
          </div>
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
