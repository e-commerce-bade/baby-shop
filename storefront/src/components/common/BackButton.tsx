'use client'

import { useRouter } from 'next/navigation'

interface Props {
  /** Geçmiş yoksa (doğrudan girildiyse) yönlendirilecek adres. */
  fallbackHref?: string
  label?: string
  className?: string
}

/**
 * Geri butonu: uygulama içi (client-side) geri navigasyon yapar. Tarayıcı/OS geri tuşunun
 * force-dynamic sayfalarda tam sayfa yeniden yüklemesi (mobilde "sayfa görüntülenemiyor")
 * sorununu atlatır. Geçmiş yoksa fallbackHref'e gider.
 */
export default function BackButton({ fallbackHref = '/', label = 'Geri', className }: Props) {
  const router = useRouter()

  function handleClick() {
    // Aynı site içinde bir önceki sayfa varsa client-side geri git; yoksa fallback'e yönlendir.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[12.5px] font-semibold text-brown-2 transition-colors hover:border-rose-soft hover:text-rose-dk'
      }
      aria-label={label}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  )
}
