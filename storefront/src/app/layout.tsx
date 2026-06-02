import type { Metadata } from 'next'
import { Fraunces, Mulish } from 'next/font/google'
import './globals.css'
import CartSyncProvider from '@/components/cart/CartSyncProvider'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Header from '@/components/layout/Header'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'

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
    default: 'MiniMori - Tiny outfits, big memories',
    template: '%s - MiniMori',
  },
  description: 'Küçükler için zamansız parçalar, sevgi ve özenle hazırlandı.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`${fraunces.variable} ${mulish.variable}`}>
      <body>
        <CartSyncProvider />
        <AnnouncementBar />
        <Header />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
