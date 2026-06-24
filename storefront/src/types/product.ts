export interface ProductImage {
  id: number
  imageUrl: string
  altText: string | null
  colorName: string | null
  sortOrder: number
  isPrimary: boolean
}

export interface ProductVariant {
  id: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  price: string
  compareAtPrice: string | null
  currency: string
  isActive: boolean
}

export interface ProductSummary {
  id: number
  name: string
  slug: string
  description: string | null
  brand: string | null
  productType: string | null
  isActive: boolean
  categoryName: string
  categorySlug: string
  primaryImage: ProductImage | null
  lowestPrice: string
  currency: string
  colorLabel?: string
  variants: ProductVariant[]
}

export interface ProductDetail extends ProductSummary {
  images: ProductImage[]
}
