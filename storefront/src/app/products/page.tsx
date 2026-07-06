import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import FilterSidebar from '@/components/product/filter/FilterSidebar'
import FilterSidebarSkeleton from '@/components/product/filter/FilterSidebarSkeleton'
import ProductGrid from '@/components/product/ProductGrid'
import Pagination from '@/components/product/Pagination'
import BackButton from '@/components/common/BackButton'
import { fetchProductsPage, fetchCategories } from '@/lib/api/catalog'

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

  // Kategori seçiliyse başlıkta ve breadcrumb'da kategori adını göster.
  const categoryName = categorySlug
    ? (await fetchCategories()).find((category) => category.slug === categorySlug)?.name ?? null
    : null

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

  return (
    <div className="px-[38px] py-5 max-[980px]:px-6 max-[680px]:px-5">
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallbackHref="/" />
        <nav className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
          <Link href="/" className="text-brown-2 transition-colors hover:text-rose-dk">
            Ana Sayfa
          </Link>
          <span className="text-muted-2">›</span>
          {categoryName ? (
            <>
              <Link href="/products" className="text-brown-2 transition-colors hover:text-rose-dk">
                Ürünler
              </Link>
              <span className="text-muted-2">›</span>
              <span className="text-brown">{categoryName}</span>
            </>
          ) : (
            <span className="text-brown">Ürünler</span>
          )}
        </nav>
      </div>

      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-semibold text-brown">
            {params.q ? `"${params.q}" için sonuçlar` : categoryName ?? 'Tüm Ürünler'}
          </h1>
        </div>
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
