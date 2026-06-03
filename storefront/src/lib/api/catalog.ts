import type { Category, CategoryDisplayItem } from '@/types/category'
import type { ProductDetail, ProductImage, ProductSummary, ProductVariant } from '@/types/product'
import { backendFetch } from './backend'

interface BackendCategoryResponse {
  id: number
  parentId: number | null
  name: string
  slug: string
  description: string | null
  active: boolean
  sortOrder: number
}

interface BackendProductVariantResponse {
  id: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  price: number | string
  currency: string
  active: boolean
}

interface BackendProductDetailResponse {
  id: number
  name: string
  slug: string
  description: string | null
  brand: string | null
  productType: string | null
  active: boolean
  categoryName: string
  categorySlug: string
  minPrice: number | string
  currency: string
  images: BackendProductImageResponse[]
  variants: BackendProductVariantResponse[]
}

interface BackendProductImageResponse {
  id: number
  imageUrl: string
  altText: string | null
  colorName: string | null
  sortOrder: number
  primary: boolean
}

interface BackendProductSummaryResponse {
  id: number
  name: string
  slug: string
  description: string | null
  brand: string | null
  productType: string | null
  active: boolean
  categoryName: string
  categorySlug: string
  minPrice: number | string
  currency: string
  primaryImageUrl: string | null
  variants: BackendProductVariantResponse[]
}

const categoryDecorators: Record<
  string,
  Pick<CategoryDisplayItem, 'emoji' | 'ageRange' | 'backgroundColor' | 'imageUrl'>
> = {
  yenidogan: {
    emoji: '🍼',
    ageRange: '0-3 Ay',
    backgroundColor: '#EFE6D9',
    imageUrl: '/images/category_newborn.png',
  },
  'kiz-bebek': {
    emoji: '🎀',
    ageRange: '0-24 Ay',
    backgroundColor: '#F4DEDB',
    imageUrl: '/images/category_girl.png',
  },
  'erkek-bebek': {
    emoji: '🧸',
    ageRange: '0-24 Ay',
    backgroundColor: '#D9E4EC',
    imageUrl: '/images/category_boy.png',
  },
  'kiz-cocuk': {
    emoji: '👗',
    ageRange: '2-14 Yaş',
    backgroundColor: '#F0E1DD',
    imageUrl: '/images/category_girl.png',
  },
  'erkek-cocuk': {
    emoji: '🌿',
    ageRange: '2-14 Yaş',
    backgroundColor: '#E4EBD9',
    imageUrl: '/images/category_boy.png',
  },
  // Eski slug'lar icin fallback
  newborn: {
    emoji: '🍼',
    ageRange: '0-3 Ay',
    backgroundColor: '#EFE6D9',
    imageUrl: '/images/category_newborn.png',
  },
  'baby-girl': {
    emoji: '🎀',
    ageRange: '0-24 Ay',
    backgroundColor: '#F4DEDB',
    imageUrl: '/images/category_girl.png',
  },
  'baby-boy': {
    emoji: '🧸',
    ageRange: '0-24 Ay',
    backgroundColor: '#D9E4EC',
    imageUrl: '/images/category_boy.png',
  },
  'kids-girl': {
    emoji: '👗',
    ageRange: '2-14 Yaş',
    backgroundColor: '#F0E1DD',
    imageUrl: '/images/category_girl.png',
  },
  'kids-boy': {
    emoji: '🌿',
    ageRange: '2-14 Yaş',
    backgroundColor: '#E4EBD9',
    imageUrl: '/images/category_boy.png',
  },
  'yeni-dogan': {
    emoji: '🍼',
    ageRange: '0-3 Ay',
    backgroundColor: '#EFE6D9',
    imageUrl: '/images/category_newborn.png',
  },
}

function normalizeMoney(value: number | string) {
  return typeof value === 'string' ? value : value.toFixed(2)
}

function mapVariant(
  variant: BackendProductVariantResponse,
): ProductVariant {
  return {
    id: variant.id,
    sku: variant.sku,
    sizeLabel: variant.sizeLabel,
    colorName: variant.colorName,
    stockQuantity: variant.stockQuantity,
    price: normalizeMoney(variant.price),
    currency: variant.currency,
    isActive: variant.active,
  }
}

function mapImage(
  image: BackendProductImageResponse,
): ProductImage {
  return {
    id: image.id,
    imageUrl: image.imageUrl,
    altText: image.altText,
    colorName: image.colorName,
    sortOrder: image.sortOrder,
    isPrimary: image.primary,
  }
}

function mapPrimaryImage(
  product: BackendProductSummaryResponse,
): ProductImage | null {
  if (!product.primaryImageUrl) {
    return null
  }

  return {
    id: product.id * 1000,
    imageUrl: product.primaryImageUrl,
    altText: product.name,
    colorName: null,
    sortOrder: 0,
    isPrimary: true,
  }
}

function mapSummary(
  product: BackendProductSummaryResponse,
): ProductSummary {
  const variants = product.variants.map(mapVariant)

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    productType: product.productType,
    isActive: product.active,
    categoryName: product.categoryName,
    categorySlug: product.categorySlug,
    primaryImage: mapPrimaryImage(product),
    lowestPrice: normalizeMoney(product.minPrice),
    currency: product.currency,
    colorLabel: variants[0]?.colorName,
    variants,
  }
}

function mapDetail(
  product: BackendProductDetailResponse,
): ProductDetail {
  const variants = product.variants.map(mapVariant)

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    productType: product.productType,
    isActive: product.active,
    categoryName: product.categoryName,
    categorySlug: product.categorySlug,
    primaryImage: product.images.length > 0 ? mapImage(product.images[0]) : null,
    lowestPrice: normalizeMoney(product.minPrice),
    currency: product.currency,
    colorLabel: variants[0]?.colorName,
    variants,
    images: product.images.map(mapImage),
  }
}

function mapCategory(
  category: BackendCategoryResponse,
): Category {
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    description: category.description,
    isActive: category.active,
    sortOrder: category.sortOrder,
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const categories = await backendFetch<BackendCategoryResponse[]>('/api/v1/categories')
    return categories.map(mapCategory)
  } catch (error) {
    console.error('Failed to fetch categories', error)
    return []
  }
}

export async function fetchCategoryStripItems(): Promise<CategoryDisplayItem[]> {
  const categories = await fetchCategories()

  // Backend erişilemezse mock'a düş
  if (categories.length === 0) {
    const { mockCategoryStrip } = await import('@/lib/mock/categories')
    return mockCategoryStrip
  }

  return categories.slice(0, 5).map((category, index) => {
    const decorator =
      categoryDecorators[category.slug] ??
      Object.values(categoryDecorators)[index % Object.values(categoryDecorators).length]

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      ...decorator,
    }
  })
}

export async function fetchProducts(categorySlug?: string): Promise<ProductSummary[]> {
  try {
    const query = categorySlug
      ? `?categorySlug=${encodeURIComponent(categorySlug)}`
      : ''
    const products = await backendFetch<BackendProductSummaryResponse[]>(
      `/api/v1/products${query}`,
      { cache: 'no-store' },
    )
    return products.map(mapSummary)
  } catch (error) {
    console.error('Failed to fetch products', error)
    return []
  }
}

export async function fetchProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const product = await backendFetch<BackendProductDetailResponse>(
      `/api/v1/products/${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    )
    return mapDetail(product)
  } catch (error) {
    console.error(`Failed to fetch product by slug: ${slug}`, error)
    return null
  }
}
