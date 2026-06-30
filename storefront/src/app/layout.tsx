import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Fraunces, Mulish } from 'next/font/google'
import './globals.css'
import CartSyncProvider from '@/components/cart/CartSyncProvider'
import SiteChrome from '@/components/layout/SiteChrome'
import NavigationProgress from '@/components/layout/NavigationProgress'
import { fetchCategories } from '@/lib/api/catalog'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: 'variable',
  style: ['normal', 'italic'],
  axes: ['opsz'],
})

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-mulish',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: {
    default: 'Bade Bebe — Küçükler için büyük sevgi',
    template: '%s — Bade Bebe',
  },
  description: 'Küçükler için zamansız parçalar, sevgi ve özenle hazırlandı.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Aktif kategoriler navigasyon icin (60sn cache'li). Backend erisilemezse bos doner; Nav
  // yine "Yeni Gelenler" + "İndirim" ile calisir.
  const categories = await fetchCategories()
  const navCategories = categories
    .filter((category) => category.isActive)
    .map((category) => ({ name: category.name, slug: category.slug }))

  return (
    <html lang="tr" className={`${fraunces.variable} ${mulish.variable}`}>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <CartSyncProvider />
        <SiteChrome categories={navCategories}>{children}</SiteChrome>
      </body>
    </html>
  )
}
