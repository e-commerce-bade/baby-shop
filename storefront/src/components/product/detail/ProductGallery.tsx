'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types/product'

const THUMB_OPACITIES = ['1', '0.75', '0.88', '0.65', '0.5']

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
  const count = Math.max(images.length, 5)

  return (
    <div className="flex gap-3.5 max-[680px]:flex-col-reverse">
      <div className="flex flex-col gap-2 max-[680px]:flex-row max-[680px]:overflow-x-auto">
        {Array.from({ length: count }).map((_, index) => {
          const image = images[index]
          return (
            <button
              key={index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Görsel ${index + 1}`}
              className={cn(
                'h-[96px] w-[82px] shrink-0 overflow-hidden rounded-thumb border-[1.5px] transition-colors duration-[180ms]',
                active === index
                  ? 'border-rose'
                  : 'border-line-2 hover:border-rose-soft',
                'max-[680px]:h-[76px] max-[680px]:w-16',
              )}
              style={{
                background: image
                  ? undefined
                  : `linear-gradient(160deg, ${gradientFrom}${Math.round(parseFloat(THUMB_OPACITIES[index % 5]) * 255).toString(16).padStart(2, '0')}, ${gradientTo})`,
              }}
            >
              {image ? (
                <img
                  src={image.imageUrl}
                  alt={image.altText ?? productName}
                  className="h-full w-full object-cover"
                />
              ) : null}
              {!image && index === count - 1 ? (
                <div className="flex h-full w-full items-center justify-center opacity-60">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--tw-bg-opacity, #5B4839)" className="text-brown">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-panel border border-line-2"
        style={{
          aspectRatio: '3/4',
          background:
            images[active]
              ? undefined
              : `linear-gradient(160deg, ${gradientFrom}, ${gradientTo})`,
        }}
      >
        {images[active] ? (
          <img
            src={images[active].imageUrl}
            alt={images[active].altText ?? productName}
            className="absolute inset-0 h-full w-full object-cover"
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
