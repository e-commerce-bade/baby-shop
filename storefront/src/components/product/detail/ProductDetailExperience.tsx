'use client'

import { useMemo, useState } from 'react'
import ProductGallery from './ProductGallery'
import ProductInfoPanel from './ProductInfoPanel'
import MobileStickyBar from './MobileStickyBar'
import { useCartStore } from '@/store/cartStore'
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
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const selectedImages = useMemo(
    () => imagesForColor(product.images, selectedColor),
    [product.images, selectedColor],
  )

  const currentVariant = useMemo(
    () =>
      product.variants.find(
        (variant) => variant.colorName === selectedColor && variant.sizeLabel === selectedSize,
      ),
    [product.variants, selectedColor, selectedSize],
  )

  const inStock = currentVariant ? currentVariant.stockQuantity > 0 : true
  const canAddToCart = selectedSize !== null && inStock

  function handleColorSelect(color: string) {
    setSelectedColor(color)
    setSelectedSize(null)
  }

  async function handleAddToCart() {
    if (!canAddToCart || !currentVariant) return

    setIsAdding(true)
    try {
      await addItem({
        productId: product.id,
        variantId: currentVariant.id,
        slug: product.slug,
        productName: product.name,
        variantLabel: `${selectedSize} / ${selectedColor}`,
        primaryImageUrl: product.primaryImage?.imageUrl ?? null,
        price: currentVariant.price,
        currency: currentVariant.currency,
        quantity,
      })
    } finally {
      setIsAdding(false)
    }
  }

  const mobilePrice = currentVariant?.price ?? product.lowestPrice
  const currentPrice = parseFloat(mobilePrice)
  const compareAt = currentVariant?.compareAtPrice != null
    ? parseFloat(currentVariant.compareAtPrice)
    : null
  const mobileOriginalPrice = compareAt != null && compareAt > currentPrice ? compareAt : null

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
          onColorSelect={handleColorSelect}
          selectedSize={selectedSize}
          onSizeSelect={setSelectedSize}
          quantity={quantity}
          onQuantityChange={setQuantity}
          currentVariant={currentVariant}
          inStock={inStock}
          canAddToCart={canAddToCart}
          isAdding={isAdding}
          onAddToCart={() => void handleAddToCart()}
        />
      </div>

      <MobileStickyBar
        price={mobilePrice}
        currency={product.currency}
        originalPrice={mobileOriginalPrice}
        hasSize={selectedSize !== null}
        canAddToCart={canAddToCart}
        isAdding={isAdding}
        onAddToCart={() => void handleAddToCart()}
      />
    </>
  )
}
