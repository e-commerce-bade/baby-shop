import Link from 'next/link'
import { cn } from '@/lib/utils'

type NavCategory = { name: string; slug: string }
type NavItem = { label: string; href: string; sale?: boolean }

// "Yeni Gelenler" ve "İndirim" sabit; aradaki kategoriler layout'tan (aktif kategoriler) prop gelir.
export default function Nav({ categories }: { categories: NavCategory[] }) {
  const navItems: NavItem[] = [
    { label: 'Yeni Gelenler', href: '/products' },
    ...categories.map((category) => ({
      label: category.name,
      href: `/products?categorySlug=${encodeURIComponent(category.slug)}`,
    })),
    { label: 'İndirim', href: '/products?sort=price-desc', sale: true },
  ]

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-9 border-b border-line px-[38px] py-4 max-[680px]:gap-x-[18px] max-[680px]:gap-y-3.5 max-[680px]:px-5 max-[680px]:py-3.5"
      aria-label="Ana menü"
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'group relative text-sm font-semibold text-brown-2 transition-colors hover:text-rose-dk',
            item.sale && 'text-rose-dk',
          )}
        >
          {item.label}
          <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 rounded-full bg-rose transition-all duration-[250ms] group-hover:w-full" />
        </Link>
      ))}
    </nav>
  )
}
