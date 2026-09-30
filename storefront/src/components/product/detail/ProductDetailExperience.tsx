'use client'

import { useMemo, useRef, useState } from 'react'
import ProductGallery, { type GallerySlide } from './ProductGallery'
import ProductInfoPanel from './ProductInfoPanel'
import MobileStickyBar from './MobileStickyBar'
import { useCartStore } from '@/store/cartStore'
import { foldForSearch } from '@/lib/utils'
import type { ProductDetail, ProductImage, ProductVariant } from '@/types/product'

interface Props {
  product: ProductDetail
  gradientFrom: string
  gradientTo: string
}

// Galeri seridi: tum renklerin gorselleri, ayni rengin gorselleri yan yana. Ana gorsel (urun
// kartinda gorunen) en basa alinir ki sayfa kartta gorulen fotografla acilsin.
//
// Gorseldeki renk adi varyanttaki yazimla birebir ayni olmayabilir ("mavi" / "Mavi"): eslestirme
// buyuk-kucuk harf ve Turkce karakter farki gozetmeden yapilir ve varyantin yazimi kullanilir.
// Satista olmayan bir rengin gorseli gosterilmez. Gorseller renk etiketliyse fotografi olmayan
// renkler icin serit sonuna yer tutucu eklenir; boylece her rengin seritte bir yeri olur ve ekranda
// gorunen renk ile secili renk hic ayrismaz.
function buildGallery(images: ProductImage[], variantColors: string[]): GallerySlide[] {
  const colorByKey = new Map(variantColors.map((color) => [foldForSearch(color.trim()), color]))
  const tagged = images.map((image) => {
    const color = image.colorName ? colorByKey.get(foldForSearch(image.colorName.trim())) ?? null : null
    return { image, color, orphan: Boolean(image.colorName) && color === null }
  })
  const usable = tagged.filter((item) => !item.orphan)
  const source = (usable.length > 0 ? usable : tagged.map((item) => ({ ...item, color: null })))
    .sort((a, b) => Number(b.image.isPrimary) - Number(a.image.isPrimary))

  const groups: Array<string | null> = []
  for (const item of source) {
    if (!groups.includes(item.color)) groups.push(item.color)
  }
  const slides: GallerySlide[] = groups.flatMap((color) => source
    .filter((item) => item.color === color)
    .map((item) => ({
      key: `image-${item.image.id}`,
      imageUrl: item.image.imageUrl,
      altText: item.image.altText,
      colorName: item.color,
    })))

  if (slides.some((slide) => slide.colorName !== null)) {
    for (const color of variantColors) {
      if (!slides.some((slide) => slide.colorName === color)) {
        slides.push({ key: `color-${color}`, imageUrl: null, altText: null, colorName: color })
      }
    }
  }
  return slides
}

function sellable(variants: ProductVariant[], color: string, size: string) {
  return variants.some((variant) => variant.colorName === color && variant.sizeLabel === size && variant.stockQuantity > 0)
}

export default function ProductDetailExperience({
  product,
  gradientFrom,
  gradientTo,
}: Props) {
  const variantColors = useMemo(
    () => [...new Set(product.variants.map((variant) => variant.colorName))],
    [product.variants],
  )
  const slides = useMemo(() => buildGallery(product.images, variantColors), [product.images, variantColors])

  // Renk secenekleri galerideki sirayla (her rengin seritte bir karesi varsa); kalanlar sonda.
  const colors = useMemo(() => {
    const pictured = slides
      .map((slide) => slide.colorName)
      .filter((colorName): colorName is string => colorName !== null)
    return [...new Set([...pictured, ...variantColors])]
  }, [slides, variantColors])

  const [selectedColor, setSelectedColor] = useState(slides[0]?.colorName ?? colors[0] ?? '')
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  // Musterinin en son kendisi sectigi beden: bu bedeni olmayan bir renge bakip donunce geri gelir.
  const [preferredSize, setPreferredSize] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const visibleImageRef = useRef<number | null>(0)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  // Ayni renk + beden birden fazla varyantta cikabilir (eski "3-4 Yas" ile yeni "3-4 Yaş" gibi,
  // ikisi de "3-4 Yaş" gorunur): stokta olan tercih edilir.
  const findVariant = (color: string, size: string | null) => {
    if (size === null) return undefined
    const matches = product.variants.filter((variant) => variant.colorName === color && variant.sizeLabel === size)
    return matches.find((variant) => variant.stockQuantity > 0) ?? matches[0]
  }

  const currentVariant = findVariant(selectedColor, selectedSize)
  const inStock = currentVariant ? currentVariant.stockQuantity > 0 : true
  const canAddToCart = selectedSize !== null && inStock

  function selectColor(color: string) {
    setSelectedColor(color)
    // Musterinin sectigi beden yeni renkte de satiliyorsa secili kalir; yoksa yeniden secilmesi istenir.
    setSelectedSize(preferredSize !== null && sellable(product.variants, color, preferredSize) ? preferredSize : null)
  }

  function handleSizeSelect(size: string | null) {
    setSelectedSize(size)
    setPreferredSize(size)
  }

  // Renk kutucugundan secim: galeri o rengin ilk karesine gider.
  function handleColorSelect(color: string) {
    selectColor(color)
    const index = slides.findIndex((slide) => slide.colorName === color)
    if (index >= 0) setActiveImage(index)
  }

  // Galeride baska kareye gecildi (kaydirma, ok, kucuk gorsel): karenin rengi secili renk olur ki
  // ekranda gorunen renk ile sepete eklenecek renk ayni kalsin.
  function handleActiveImageChange(index: number) {
    setActiveImage(index)
    const color = slides[index]?.colorName
    if (color && color !== selectedColor && colors.includes(color)) selectColor(color)
  }

  async function handleAddToCart() {
    let color = selectedColor
    let size = selectedSize
    // Kaydirma henuz yerine oturmadan (secim birkac yuz ms geriden gelir) basildiysa ekranda
    // gorunen karenin rengi esas alinir.
    const visible = visibleImageRef.current
    const visibleColor = visible !== null ? slides[visible]?.colorName ?? null : null
    if (visibleColor && visibleColor !== selectedColor && colors.includes(visibleColor)) {
      handleActiveImageChange(visible as number)
      color = visibleColor
      size = preferredSize !== null && sellable(product.variants, color, preferredSize) ? preferredSize : null
    }

    const variant = findVariant(color, size)
    if (!variant || variant.stockQuantity <= 0) return

    setIsAdding(true)
    try {
      await addItem({
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        productName: product.name,
        variantLabel: `${size} / ${color}`,
        primaryImageUrl: product.primaryImage?.imageUrl ?? null,
        price: variant.price,
        currency: variant.currency,
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
        slides={slides}
        activeIndex={activeImage}
        onActiveIndexChange={handleActiveImageChange}
        visibleIndexRef={visibleImageRef}
        productName={product.name}
        gradientFrom={gradientFrom}
        gradientTo={gradientTo}
        isNew
      />
      <div id="product-options">
        <ProductInfoPanel
          product={product}
          colors={colors}
          selectedColor={selectedColor}
          onColorSelect={handleColorSelect}
          selectedSize={selectedSize}
          onSizeSelect={handleSizeSelect}
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
