'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types/product'

interface Props {
  images: ProductImage[]
  productName: string
  gradientFrom: string
  gradientTo: string
  isNew?: boolean
}

export default function ProductGallery({
  images,
  productName,
  gradientFrom,
  gradientTo,
  isNew,
}: Props) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    setActive(0)
  }, [images])

  const hasActiveImage = Boolean(images[active])

  const showPrev = useCallback(() => {
    setActive((current) => (current - 1 + images.length) % images.length)
  }, [images.length])

  const showNext = useCallback(() => {
    setActive((current) => (current + 1) % images.length)
  }, [images.length])

  // Lightbox açıkken: sayfa kaydırmasını kilitle ve klavye ile gezinmeyi/kapatmayı bağla.
  useEffect(() => {
    if (!zoomed) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setZoomed(false)
      else if (event.key === 'ArrowLeft') showPrev()
      else if (event.key === 'ArrowRight') showNext()
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [zoomed, showPrev, showNext])

  return (
    <div className="flex w-full max-w-[560px] gap-3 max-[980px]:mx-auto max-[680px]:flex-col-reverse">
      {images.length > 1 ? (
        <div className="flex flex-col gap-2 max-[680px]:flex-row max-[680px]:overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id ?? index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Görsel ${index + 1}`}
              className={cn(
                'h-[82px] w-[70px] shrink-0 overflow-hidden rounded-thumb border-[1.5px] bg-cream-2 transition-colors duration-[180ms]',
                active === index
                  ? 'border-rose'
                  : 'border-line-2 hover:border-rose-soft',
                'max-[680px]:h-[68px] max-[680px]:w-[58px]',
              )}
            >
              <img
                src={image.imageUrl}
                alt={image.altText ?? productName}
                className="h-full w-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="relative flex min-h-[430px] flex-1 items-center justify-center overflow-hidden rounded-panel border border-line-2 max-[680px]:min-h-[360px]"
        style={{
          aspectRatio: '4/5',
          background:
            images[active]
              ? `linear-gradient(160deg, ${gradientFrom}55, ${gradientTo})`
              : `linear-gradient(160deg, ${gradientFrom}, ${gradientTo})`,
        }}
      >
        {images[active] ? (
          <img
            src={images[active].imageUrl}
            alt={images[active].altText ?? productName}
            onClick={() => setZoomed(true)}
            className="absolute inset-0 h-full w-full cursor-zoom-in object-contain p-7 max-[680px]:p-5"
          />
        ) : null}

        {isNew ? (
          <span className="absolute left-3.5 top-3.5 z-10 rounded-[20px] bg-rose px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.4px] text-white">
            Yeni
          </span>
        ) : null}

        {hasActiveImage ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Yakınlaştır"
            className="absolute bottom-3.5 right-3.5 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-white/85 text-brown-2 transition-colors hover:bg-white hover:text-rose-dk"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </button>
        ) : null}
      </div>

      {zoomed && images[active] ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} — büyütülmüş görsel`}
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Kapat"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {images.length > 1 ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); showPrev() }}
              aria-label="Önceki görsel"
              className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : null}

          <img
            src={images[active].imageUrl}
            alt={images[active].altText ?? productName}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] cursor-zoom-out object-contain"
          />

          {images.length > 1 ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); showNext() }}
              aria-label="Sonraki görsel"
              className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
