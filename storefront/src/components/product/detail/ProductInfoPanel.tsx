'use client'

import { useMemo, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import ColorSelector from './ColorSelector'
import SizeSelector from './SizeSelector'
import QuantityControl from './QuantityControl'
import { useCartStore } from '@/store/cartStore'
import type { ProductDetail } from '@/types/product'

const DISCOUNT_RATE = 0.2

interface Props {
  product: ProductDetail
}

export default function ProductInfoPanel({ product }: Props) {
  const uniqueColors = useMemo(
    () => [...new Set(product.variants.map((variant) => variant.colorName))],
    [product.variants],
  )

  const [selectedColor, setSelectedColor] = useState(uniqueColors[0] ?? '')
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const addItem = useCartStore((state) => state.addItem)

  const sizesForColor = useMemo(() => {
    const seen = new Set<string>()
    return product.variants
      .filter((variant) => variant.colorName === selectedColor)
      .filter((variant) => {
        if (seen.has(variant.sizeLabel)) return false
        seen.add(variant.sizeLabel)
        return true
      })
      .map((variant) => ({
        label: variant.sizeLabel,
        inStock: variant.stockQuantity > 0,
      }))
  }, [product.variants, selectedColor])

  const currentVariant = product.variants.find(
    (variant) =>
      variant.colorName === selectedColor && variant.sizeLabel === selectedSize,
  )

  const inStock = currentVariant ? currentVariant.stockQuantity > 0 : true
  const currentPrice = parseFloat(currentVariant?.price ?? product.lowestPrice)
  const originalPrice = Math.round(currentPrice / (1 - DISCOUNT_RATE))
  const canAddToCart = selectedSize !== null && inStock

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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-[30px] font-semibold leading-[1.15] text-brown">
          {product.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Günlük dönüşler için yumuşak ve nefes alabilir.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[14px] tracking-[1px] text-rose">★★★★★</span>
        <span className="text-sm font-extrabold text-brown">4.9</span>
        <span className="cursor-pointer text-[13px] text-muted underline underline-offset-2 hover:text-rose-dk">
          (128 değerlendirme)
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-serif text-[36px] font-semibold leading-none text-brown">
          {formatPrice(currentPrice, product.currency)}
        </span>
        <span className="text-lg font-semibold text-muted line-through">
          {formatPrice(originalPrice, product.currency)}
        </span>
        <span className="rounded-[20px] bg-rose px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.3px] text-white">
          %{Math.round(DISCOUNT_RATE * 100)} İNDİRİM
        </span>
      </div>

      <div className="h-px bg-line" />

      <div className="space-y-2.5">
        <p className="text-[13.5px] font-bold text-brown">
          Renk:{' '}
          <span className="font-normal text-brown-2">{selectedColor}</span>
        </p>
        <ColorSelector
          colors={uniqueColors}
          selected={selectedColor}
          onSelect={(color) => {
            setSelectedColor(color)
            setSelectedSize(null)
          }}
        />
      </div>

      <div className="space-y-2.5">
        <p className="text-[13.5px] font-bold text-brown">
          Beden:{' '}
          <span className="font-normal text-brown-2">
            {selectedSize ?? 'Seç'}
          </span>
        </p>
        <SizeSelector
          sizes={sizesForColor}
          selected={selectedSize}
          onSelect={setSelectedSize}
        />
      </div>

      <div className="flex items-center gap-2 text-[13px] font-semibold text-brown-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${inStock ? 'bg-[#6DB584]' : 'bg-rose-dk'}`}
        />
        {inStock
          ? 'Stokta var - 1-2 iş günü içinde kargoya verilir'
          : 'Bu beden stokta yok'}
      </div>

      <div className="space-y-2.5">
        <p className="text-[13.5px] font-bold text-brown">Adet</p>
        <QuantityControl
          value={quantity}
          onChange={setQuantity}
          max={currentVariant?.stockQuantity ?? 10}
        />
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={!canAddToCart || isAdding}
          onClick={() => void handleAddToCart()}
          className="flex flex-1 items-center justify-center rounded-[14px] bg-rose py-4 text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(197,127,123,.8)] transition-[background-color,transform] duration-[220ms] hover:-translate-y-0.5 hover:bg-rose-dk disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdding ? 'Ekleniyor...' : !selectedSize ? 'Beden Seç' : 'Sepete Ekle'}
        </button>
        <button
          type="button"
          onClick={() => setWishlisted((current) => !current)}
          aria-label="Favorilere ekle"
          className={`grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[12px] border transition-colors duration-200 ${wishlisted ? 'border-rose-soft bg-rose-tint text-rose' : 'border-line bg-white text-muted hover:border-rose-soft hover:bg-rose-tint hover:text-rose'}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={wishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 border-t border-line pt-4">
        {[
          { label: 'Güvenli Ödeme', sub: '%100 korumalı', icon: <LockIcon /> },
          { label: 'Kolay İade', sub: '30 gün içinde', icon: <ReturnIcon /> },
          { label: 'Hızlı Teslimat', sub: '2-4 iş günü', icon: <TruckIcon /> },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-cream-2 text-rose-dk">
              {item.icon}
            </div>
            <div>
              <div className="text-[12px] font-bold text-brown">{item.label}</div>
              <div className="text-[11px] font-medium text-muted">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}

function ReturnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12a8 8 0 0114-5" />
      <path d="M20 12a8 8 0 01-14 5" />
      <path d="M18 3v4h-4" />
      <path d="M6 21v-4h4" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="12" height="9" rx="1" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="6" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </svg>
  )
}
