'use client'

import { useMemo, useState } from 'react'
import ProductGallery from './ProductGallery'
import ProductInfoPanel from './ProductInfoPanel'
import type { ProductDetail, ProductImage } from '@/types/product'

interface Props {
  product: ProductDetail
  gradientFrom: string
  gradientTo: string
}

function imagesForColor(images: ProductImage[], selectedColor: string) {
  const matching = images.filter((image) => image.colorName === selectedColor)
  const generic = images.filter((image) => !image.colorName)

  return matching.length > 0 ? matching : generic.length > 0 ? generic : images
}

export default function ProductDetailExperience({
  product,
  gradientFrom,
  gradientTo,
}: Props) {
  const colors = useMemo(
    () => [...new Set(product.variants.map((variant) => variant.colorName))],
    [product.variants],
  )
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? '')
  const selectedImages = useMemo(
    () => imagesForColor(product.images, selectedColor),
    [product.images, selectedColor],
  )

  return (
    <>
      <ProductGallery
        images={selectedImages}
        productName={product.name}
        gradientFrom={gradientFrom}
        gradientTo={gradientTo}
        isNew
      />
      <div id="product-options">
        <ProductInfoPanel
          product={product}
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
      </div>
    </>
  )
}
