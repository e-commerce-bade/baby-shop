'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'
import { useFavoriteStore } from '@/store/favoriteStore'

export default function FavoritesPage() {
  const items = useFavoriteStore((state) => state.items)
  const clearFavorites = useFavoriteStore((state) => state.clearFavorites)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let active = true

    async function checkAuth() {
      try {
        const response = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })

        if (!active) return

        if (response.ok) {
          setIsAuthenticated(true)
          return
        }

        if (response.status === 401) {
          clearFavorites()
        }
        setIsAuthenticated(false)
      } catch {
        if (!active) return
        setIsAuthenticated(false)
      } finally {
        if (active) setAuthChecked(true)
      }
    }

    void checkAuth()

    return () => {
      active = false
    }
  }, [clearFavorites])

  return (
    <div className="min-h-[70vh] bg-cream-3 px-[38px] py-8 max-[680px]:px-5">
      <div className="mx-auto max-w-content">
        <nav className="mb-6 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
          <Link href="/" className="text-brown-2 transition-colors hover:text-rose-dk">
            Ana Sayfa
          </Link>
          <span className="text-muted-2">›</span>
          <span className="text-brown">Favoriler</span>
        </nav>

        <header className="mb-7 flex items-end justify-between gap-4 max-[680px]:flex-col max-[680px]:items-start">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-rose">
              Beğendiklerim
            </p>
            <h1 className="mt-2 font-serif text-[34px] font-semibold text-brown">
              Favoriler
            </h1>
            <p className="mt-1 text-sm text-muted">
              Minikler için ayırdığınız özel parçalar burada saklanır.
            </p>
          </div>

          {items.length > 0 ? (
            <button
              type="button"
              onClick={clearFavorites}
              className="rounded-[12px] border border-line bg-white px-5 py-2.5 text-[13px] font-bold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk"
            >
              Tümünü Temizle
            </button>
          ) : null}
        </header>

        {!authChecked ? (
          <div className="rounded-panel border border-line bg-white px-6 py-14 text-center shadow-card">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-rose-tint" />
            <h2 className="mt-5 font-serif text-[24px] font-semibold text-brown">
              Favoriler yükleniyor
            </h2>
            <p className="mx-auto mt-2 max-w-[420px] text-sm leading-relaxed text-muted">
              Hesap bilgileriniz ve favori listeniz kontrol ediliyor.
            </p>
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-panel border border-line bg-white px-6 py-14 text-center shadow-card">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-tint text-rose">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
              </svg>
            </div>
            <h2 className="mt-5 font-serif text-[24px] font-semibold text-brown">
              Favoriler için giriş yapın
            </h2>
            <p className="mx-auto mt-2 max-w-[420px] text-sm leading-relaxed text-muted">
              Beğendiğiniz ürünleri saklamak için hesabınıza giriş yapmanız gerekir.
            </p>
            <Link
              href="/account/login?next=/favorites"
              className="mt-6 inline-flex rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
            >
              Giriş Yap
            </Link>
          </div>
        ) : items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <div className="rounded-panel border border-line bg-white px-6 py-14 text-center shadow-card">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-tint text-rose">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
              </svg>
            </div>
            <h2 className="mt-5 font-serif text-[24px] font-semibold text-brown">
              Henüz favori ürününüz yok
            </h2>
            <p className="mx-auto mt-2 max-w-[420px] text-sm leading-relaxed text-muted">
              Ürünlerdeki kalp ikonuna tıklayarak beğendiğiniz parçaları bu listeye ekleyebilirsiniz.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
            >
              Ürünleri Keşfet
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
