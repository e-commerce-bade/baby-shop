'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    setActive(0)
  }, [images])

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
            className="absolute inset-0 h-full w-full object-contain p-7 max-[680px]:p-5"
          />
        ) : null}

        {isNew ? (
          <span className="absolute left-3.5 top-3.5 z-10 rounded-[20px] bg-rose px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.4px] text-white">
            Yeni
          </span>
        ) : null}

        <button
          type="button"
          aria-label="Yakınlaştır"
          className="absolute bottom-3.5 right-3.5 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-white/85 text-brown-2 transition-colors hover:bg-white hover:text-rose-dk"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
            <path d="M11 8v6M8 11h6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
