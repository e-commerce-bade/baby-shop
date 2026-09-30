'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface LightboxImage {
  src: string
  alt: string
  caption?: string | null
}

// Acilinca odak pencereye tasinir, Tab pencerenin icinde doner, kapaninca odak onceki yerine
// (orn. tiklanan kucuk gorsele) geri verilir; boylece klavyeyle arkadaki sayfaya dusulmez.
function useDialogFocus(dialogRef: React.RefObject<HTMLDivElement | null>, initialFocusRef: React.RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    initialFocusRef.current?.focus()

    function trapTab(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', trapTab)
    return () => {
      document.removeEventListener('keydown', trapTab)
      previouslyFocused?.focus?.()
    }
  }, [dialogRef, initialFocusRef])
}

/**
 * Admin panelinde kucuk gorsellere tiklaninca acilan buyuk onizleme. Birden fazla gorsel
 * verilirse oklarla (veya klavyede sag/sol) gezilir; Esc ya da bos alana tiklamak kapatir.
 */
export default function ImageLightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: LightboxImage[]
  startIndex?: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const current = images[Math.min(index, images.length - 1)]
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialogFocus(dialogRef, closeRef)

  const showPrevious = useCallback(() => {
    setIndex((value) => (value - 1 + images.length) % images.length)
  }, [images.length])

  const showNext = useCallback(() => {
    setIndex((value) => (value + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') showPrevious()
      else if (event.key === 'ArrowRight') showNext()
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, showPrevious, showNext])

  if (!current) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${current.alt} — büyük görsel`}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-4"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
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
          onClick={(event) => { event.stopPropagation(); showPrevious() }}
          aria-label="Önceki görsel"
          className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.src}
        alt={current.alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[84vh] max-w-[92vw] rounded-[6px] object-contain"
      />

      {current.caption || images.length > 1 ? (
        <p onClick={(event) => event.stopPropagation()} className="mt-3 text-center text-[13px] font-semibold text-white/90">
          {current.caption}
          {images.length > 1 ? (
            <span className="ml-2 font-normal text-white/60">{Math.min(index, images.length - 1) + 1} / {images.length}</span>
          ) : null}
        </p>
      ) : null}

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
  )
}
