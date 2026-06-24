'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { favoriteCount, useFavoriteStore } from '@/store/favoriteStore'
import CartBadge from '@/components/cart/CartBadge'
import CartDrawer from '@/components/cart/CartDrawer'

interface CustomerProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles?: string[]
}

export default function Header() {
  const openDrawer = useCartStore((state) => state.openDrawer)
  const favoritesCount = useFavoriteStore(favoriteCount)
  const clearFavorites = useFavoriteStore((state) => state.clearFavorites)
  const router     = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const response = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })

        if (!active) return

        if (response.ok) {
          setProfile(await response.json())
          // Badge icin favorileri yukle (oturum basina bir kez).
          if (!useFavoriteStore.getState().hasLoaded) {
            void useFavoriteStore.getState().loadFavorites()
          }
          return
        }

        setProfile(null)
        if (response.status === 401) {
          clearFavorites()
        }
      } catch {
        if (active) setProfile(null)
      } finally {
        if (active) setAuthChecked(true)
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [clearFavorites, pathname])

  useEffect(() => {
    if (!accountMenuOpen) return

    function closeAccountMenu() {
      setAccountMenuOpen(false)
    }

    window.addEventListener('click', closeAccountMenu)
    return () => window.removeEventListener('click', closeAccountMenu)
  }, [accountMenuOpen])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/products?q=${encodeURIComponent(q)}`)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setProfile(null)
    clearFavorites()
    setAccountMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : null
  const isAdmin = profile?.roles?.includes('ADMIN') ?? false

  return (
    <>
      <div className="flex items-center gap-[30px] border-b border-line px-[38px] py-5 max-[680px]:flex-wrap max-[680px]:gap-3.5 max-[680px]:px-5 max-[680px]:py-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-[7px]">
          <span className="font-serif text-[27px] font-semibold tracking-[0.3px] text-brown">
            Bade Bebe
          </span>
          <svg className="text-sage" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 21V9" />
            <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5z" />
            <path d="M12 11c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4z" />
          </svg>
        </Link>

        {/* Arama formu */}
        <form
          onSubmit={handleSearch}
          className="flex max-w-[560px] flex-1 items-center gap-2.5 rounded-pill border border-line bg-cream-3 px-[18px] py-[11px] text-muted max-[680px]:order-3 max-[680px]:max-w-none max-[680px]:basis-full"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-brown-text outline-none placeholder:text-muted"
            placeholder="Kıyafet, temel parça ve daha fazlasını ara..."
          />
          <button
            type="submit"
            aria-label="Ara"
            className="-mr-2 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-rose text-white transition-colors hover:bg-rose-dk"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </button>
        </form>

        {/* Sağ linkler */}
        <div className="ml-auto flex items-center gap-[26px] max-[900px]:gap-4 max-[680px]:gap-3">
          <Link href="/favorites" className="relative flex items-center gap-2 text-sm font-semibold text-brown-2 transition-colors hover:text-rose-dk">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
            </svg>
            <span>Favoriler</span>
            {favoritesCount > 0 ? (
              <span className="-ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-extrabold leading-none text-white">
                {favoritesCount}
              </span>
            ) : null}
          </Link>

          {authChecked && profile ? (
            <div
              className="relative"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-semibold text-brown-2 transition-colors hover:border-line hover:bg-cream-3 hover:text-rose-dk max-[680px]:px-2"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
                </svg>
                <span className="max-[760px]:hidden">Merhaba, {displayName}</span>
                <span className="hidden max-[760px]:inline">Merhaba</span>
                <svg
                  className={`transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {accountMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-[16px] border border-line bg-white p-2 shadow-card"
                >
                  <div className="border-b border-line px-3 py-3">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-rose">
                      Hesabım
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-brown">{displayName}</p>
                  </div>
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="mt-2 flex items-center justify-between rounded-[12px] px-3 py-2.5 text-sm font-semibold text-brown-2 transition-colors hover:bg-cream-3 hover:text-rose-dk"
                  >
                    <span>Profilim</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center justify-between rounded-[12px] px-3 py-2.5 text-sm font-semibold text-brown-2 transition-colors hover:bg-cream-3 hover:text-rose-dk"
                    >
                      <span>Yönetim Paneli</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-sm font-semibold text-brown-2 transition-colors hover:bg-rose-tint hover:text-rose-dk"
                  >
                    <span>Çıkış Yap</span>
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href="/account/login" className="flex items-center gap-2 text-sm font-semibold text-brown-2 transition-colors hover:text-rose-dk">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
              </svg>
              <span>Giriş Yap</span>
            </Link>
          )}

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
