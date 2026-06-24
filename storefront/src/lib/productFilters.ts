import type { ProductSummary } from '@/types/product'

/** Ana sayfa ve urunler sayfasinin ortak kullandigi facet filtreleri (renk/beden/tur/fiyat). */
export interface ProductFacetParams {
  productTypes?: string
  colors?: string
  sizes?: string
  price?: string
}

function splitCsv(value?: string): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function filterProductsByFacets(
  products: ProductSummary[],
  params: ProductFacetParams,
): ProductSummary[] {
  let result = products

  const productTypes = splitCsv(params.productTypes)
  if (productTypes.length > 0) {
    result = result.filter(
      (product) => product.productType !== null && productTypes.includes(product.productType),
    )
  }

  const colors = splitCsv(params.colors)
  if (colors.length > 0) {
    result = result.filter((product) =>
      product.variants.some((variant) => colors.includes(variant.colorName)),
    )
  }

  const sizes = splitCsv(params.sizes)
  if (sizes.length > 0) {
    result = result.filter((product) =>
      product.variants.some((variant) => sizes.includes(variant.sizeLabel)),
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
