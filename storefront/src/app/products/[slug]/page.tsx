import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import ProductGallery from '@/components/product/detail/ProductGallery'
import ProductInfoPanel from '@/components/product/detail/ProductInfoPanel'
import ProductAccordion from '@/components/product/detail/ProductAccordion'
import FeaturesPanel from '@/components/product/detail/FeaturesPanel'
import RelatedProducts from '@/components/product/detail/RelatedProducts'
import MobileStickyBar from '@/components/product/detail/MobileStickyBar'
import { fetchProductBySlug, fetchProducts } from '@/lib/api/catalog'

const PALETTES = [
  ['#EFE6D7', '#DDCBB340'],
  ['#F4E0DD', '#E6BFBA40'],
  ['#DCE7EE', '#BFD3E040'],
  ['#E2EAD8', '#C2D2AE40'],
  ['#E9DECF', '#D2BCA240'],
  ['#F3DEDB', '#E3B9B440'],
] as const

const DISCOUNT_RATE = 0.2

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await fetchProductBySlug(slug)
  if (!product) return { title: 'Ürün Bulunamadı' }
  return { title: product.name }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await fetchProductBySlug(slug)
  if (!product) notFound()

  const [gradFrom, gradTo] = PALETTES[product.id % PALETTES.length]
  const currentPrice = parseFloat(product.lowestPrice)
  const originalPrice = Math.round(currentPrice / (1 - DISCOUNT_RATE))

  const related = (await fetchProducts(product.categorySlug))
    .filter((candidate) => candidate.id !== product.id)
    .slice(0, 5)

  const accordionSections = [
    {
      id: 'description',
      title: 'Açıklama',
      content: product.description ?? 'Ürün açıklaması yakında eklenecek.',
    },
    {
      id: 'material',
      title: 'Materyal ve Bakım',
      content:
        '%100 organik pamuk · OEKO-TEX® sertifikalı · 30°C’de nazik yıkama · Düşük ısıda kurutma · Ütü gerektirmez',
    },
    {
      id: 'details',
      title: 'Detaylar',
      content:
        'Fırfırlı kol detayı · Arka fermuarlı kapanma · Çiçek desenli kumaş · Astarlı etek · Hipoalerjenik boyalar',
    },
    {
      id: 'size',
      title: 'Beden ve Uyum',
      content:
        'Normal kalıp · Beden rehberimize göre seçim yapmanızı öneririz · Yükseklik ve kilo tablosunu ürün sayfası altında bulabilirsiniz',
    },
    {
      id: 'shipping',
      title: 'Kargo ve İade',
      content:
        '75 USD üzeri siparişlerde ücretsiz kargo · 1-2 iş günü içinde kargoya verilir · 30 gün içinde ücretsiz iade · Orijinal etiketleri sökülmemiş olmalıdır',
    },
  ]

  return (
    <div className="px-[38px] py-5 max-[980px]:px-6 max-[680px]:px-5 max-[680px]:pb-24">
      <nav className="mb-7 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-muted">
        <Link href="/" className="text-brown-2 transition-colors hover:text-rose-dk">
          Ana Sayfa
        </Link>
        <span className="text-muted-2">›</span>
        <Link href="/products" className="text-brown-2 transition-colors hover:text-rose-dk">
          Ürünler
        </Link>
        <span className="text-muted-2">›</span>
        <span className="text-brown">{product.name}</span>
      </nav>

      <div className="grid grid-cols-2 gap-14 max-[980px]:grid-cols-1 max-[980px]:gap-8">
        <ProductGallery
          images={product.images}
          productName={product.name}
          gradientFrom={gradFrom}
          gradientTo={gradTo}
          isNew
        />
        <div id="product-options">
          <ProductInfoPanel product={product} />
        </div>
      </div>

      <div className="mt-14 grid grid-cols-[5fr_6fr] gap-7 max-[980px]:grid-cols-1 max-[980px]:mt-10">
        <ProductAccordion sections={accordionSections} />
        <FeaturesPanel />
      </div>

      <RelatedProducts products={related} />

      <MobileStickyBar
        price={product.lowestPrice}
        currency={product.currency}
        originalPrice={originalPrice}
      />
    </div>
  )
}
