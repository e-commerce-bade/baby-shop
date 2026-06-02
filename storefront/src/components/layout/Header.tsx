'use client'

import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import CartBadge from '@/components/cart/CartBadge'
import CartDrawer from '@/components/cart/CartDrawer'

export default function Header() {
  const openDrawer = useCartStore((state) => state.openDrawer)

  return (
    <>
      <div className="flex items-center gap-[30px] border-b border-line px-[38px] py-5 max-[680px]:flex-wrap max-[680px]:gap-3.5 max-[680px]:px-5 max-[680px]:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-[7px]">
          <span className="font-serif text-[27px] font-semibold tracking-[0.3px] text-brown">
            MiniMori
          </span>
          <svg
            className="text-sage"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 21V9" />
            <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5z" />
            <path d="M12 11c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4z" />
          </svg>
        </Link>

        <div className="flex max-w-[560px] flex-1 items-center gap-2.5 rounded-pill border border-line bg-cream-3 px-[18px] py-[11px] text-muted max-[680px]:order-3 max-[680px]:max-w-none max-[680px]:basis-full">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            type="search"
            className="flex-1 bg-transparent text-sm text-brown-text outline-none placeholder:text-muted"
            placeholder="Kıyafet, temel parça ve daha fazlasını ara..."
          />
          <span className="-mr-2 grid h-[30px] w-[30px] place-items-center rounded-full bg-rose text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-[26px] max-[680px]:gap-4">
          <Link
            href="#"
            className="flex items-center gap-2 text-sm font-semibold text-brown-2 transition-colors hover:text-rose-dk"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
            </svg>
            <span>Favoriler</span>
          </Link>

          <Link
            href="#"
            className="flex items-center gap-2 text-sm font-semibold text-brown-2 transition-colors hover:text-rose-dk"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
            </svg>
            <span>Hesap</span>
          </Link>

          <button
            type="button"
            onClick={openDrawer}
            className="relative flex items-center gap-2 text-sm font-semibold text-brown-2 transition-colors hover:text-rose-dk"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 7h12l-1 13H7L6 7z" />
              <path d="M9 7a3 3 0 016 0" />
            </svg>
            <span>Sepet</span>
            <CartBadge />
          </button>
        </div>
      </div>

      <CartDrawer />
    </>
  )
}
