'use client'

import type { JSX } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useFavoriteStore } from '@/store/favoriteStore'

type IconProps = { className?: string }
type NavItem = {
  href: string
  label: string
  icon: (props: IconProps) => JSX.Element
  exactMatch?: boolean
}

function IconGrid({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconBag({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12l-1.5 10H5.5L4 6z" /><path d="M7.5 6V4.5a2.5 2.5 0 015 0V6" />
    </svg>
  )
}

function IconPackage({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L2 6v8l8 4 8-4V6L10 2z" /><path d="M2 6l8 4 8-4" /><path d="M10 10v8" />
    </svg>
  )
}

function IconFolder({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7a1.5 1.5 0 011.5-1.5h4l2 2h7A1.5 1.5 0 0118 9v6.5A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5V7z" />
    </svg>
  )
}

function IconBox({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="9" width="16" height="9" rx="1.5" /><path d="M6 9V6a4 4 0 018 0v3" /><path d="M8 14h4" />
    </svg>
  )
}

function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7" r="2.5" /><path d="M1.5 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="14.5" cy="6" r="2" /><path d="M17 16c0-2-1.2-3.8-3-4.6" />
    </svg>
  )
}

function IconTag({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2H5a1 1 0 00-1 1v5.5l8.5 8.5a2 2 0 002.8 0l3.2-3.2a2 2 0 000-2.8L10.5 2z" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconBarChart({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14l4-5 4 3 4-7" /><path d="M3 17h14" />
    </svg>
  )
}

function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </svg>
  )
}

function IconBell({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2a5.5 5.5 0 015.5 5.5c0 3.5 1 5 1 5h-13s1-1.5 1-5A5.5 5.5 0 0110 2z" />
      <path d="M8.5 17.5a1.5 1.5 0 003 0" />
    </svg>
  )
}

function IconMenu({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  )
}

function IconClose({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" />
    </svg>
  )
}

function IconChevron({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4l3.5 3.5L9.5 4" />
    </svg>
  )
}

function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L10 3l7 6.5" />
      <path d="M5 8.5V17h10V8.5" />
      <path d="M8 17v-5h4v5" />
    </svg>
  )
}

const navLinks: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: IconGrid, exactMatch: true },
  { href: '/admin/orders', label: 'Siparişler', icon: IconBag },
  { href: '/admin/products', label: 'Ürünler', icon: IconPackage },
  { href: '/admin/filters', label: 'Filtreler', icon: IconTag },
  { href: '/admin/categories', label: 'Kategoriler', icon: IconFolder },
  { href: '/admin/inventory', label: 'Stok / Envanter', icon: IconBox },
  { href: '/admin/customers', label: 'Müşteriler', icon: IconUsers },
  { href: '/admin/analytics', label: 'Analitik', icon: IconBarChart },
  { href: '/admin/settings', label: 'Ayarlar', icon: IconSettings },
]

const mobileTabLinks: NavItem[] = [
  { href: '/admin', label: 'Panel', icon: IconGrid, exactMatch: true },
  { href: '/admin/orders', label: 'Siparişler', icon: IconBag },
  { href: '/admin/products', label: 'Ürünler', icon: IconPackage },
  { href: '/admin/filters', label: 'Filtreler', icon: IconTag },
  { href: '/admin/categories', label: 'Kategoriler', icon: IconFolder },
]

export default function AdminShell({
  children,
  displayName,
}: {
  children: React.ReactNode
  displayName?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const clearFavorites = useFavoriteStore((s) => s.clearFavorites)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function isActive(link: NavItem) {
    if (link.exactMatch) return pathname === link.href
    return pathname === link.href || pathname.startsWith(link.href + '/')
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearFavorites()
    router.replace('/account/login?next=/admin')
    router.refresh()
  }

  const initials = displayName
    ? displayName
        .split(' ')
        .map((w) => w[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'A'

  return (
    <div className="min-h-screen bg-[#FAF6F1] text-[#3D2B1F]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#ECE3D6] bg-white transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#ECE3D6] px-5">
          <Link href="/admin" className="block" onClick={() => setSidebarOpen(false)}>
            <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-[#C4B5A5]">
              Admin Panel
            </span>
            <span className="font-serif text-[20px] font-semibold leading-tight text-[#5B4839]">
              Bade Bebe
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#C4B5A5] hover:bg-[#FAF6F1] lg:hidden"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navLinks.map((link) => {
            const active = isActive(link)
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#F4EEE6] text-[#5B4839]'
                    : 'text-[#B5A090] hover:bg-[#FAF6F1] hover:text-[#5B4839]'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    active ? 'text-[#C07B5A]' : ''
                  }`}
                />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* User profile */}
        <div className="shrink-0 border-t border-[#ECE3D6] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4EEE6] text-[11px] font-bold text-[#5B4839]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-[#3D2B1F]">
                {displayName ?? 'Admin'}
              </p>
              <p className="text-[11px] text-[#B5A090]">Yönetici</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              title="Çıkış Yap"
              className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#B5A090] transition-colors hover:bg-[#F4EEE6] hover:text-[#5B4839]"
            >
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-[62px] items-center border-b border-[#ECE3D6] bg-white/95 px-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-3 flex h-9 w-9 items-center justify-center rounded-[10px] text-[#B5A090] transition-colors hover:bg-[#FAF6F1] hover:text-[#5B4839] lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <div className="relative flex-1 max-w-xs">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" />
            <input
              type="search"
              placeholder="Sipariş, ürün, müşteri ara..."
              className="w-full rounded-[10px] border border-[#ECE3D6] bg-[#FAF6F1] py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] transition-colors focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-[#B5A090] transition-colors hover:bg-[#FAF6F1] hover:text-[#5B4839]"
            >
              <IconBell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#C07B5A]" />
            </button>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((value) => !value)}
                className="flex h-9 items-center gap-2 rounded-[10px] border border-[#ECE3D6] bg-white px-2.5 transition-colors hover:bg-[#FAF6F1]"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F4EEE6] text-[11px] font-bold text-[#5B4839]">
                  {initials}
                </div>
                <span className="hidden text-[13px] font-semibold text-[#3D2B1F] sm:block">
                  {displayName ?? 'Admin'}
                </span>
                <IconChevron className={`h-3.5 w-3.5 text-[#C4B5A5] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-11 w-48 overflow-hidden rounded-[12px] border border-[#ECE3D6] bg-white py-1.5 shadow-[0_18px_42px_-22px_rgba(91,72,57,.45)]"
                >
                  <Link
                    href="/"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold text-[#5B4839] transition-colors hover:bg-[#FAF6F1]"
                  >
                    <IconHome className="h-4 w-4 text-[#C07B5A]" />
                    Ana Sayfa
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      void handleLogout()
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#B35A48] transition-colors hover:bg-[#FFF6F2]"
                  >
                    <IconClose className="h-4 w-4" />
                    Çıkış Yap
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 py-5 pb-24 lg:px-8 lg:py-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[#ECE3D6] bg-white lg:hidden">
        {mobileTabLinks.map((link) => {
          const active = isActive(link)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-[#C07B5A]' : 'text-[#C4B5A5]'
              }`}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

