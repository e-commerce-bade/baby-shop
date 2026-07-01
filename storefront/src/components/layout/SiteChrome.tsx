'use client'

import { usePathname } from 'next/navigation'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Header from '@/components/layout/Header'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/layout/WhatsAppButton'
import { AuthProvider } from '@/components/auth/AuthProvider'

export default function SiteChrome({
  children,
  categories,
}: {
  children: React.ReactNode
  categories: { name: string; slug: string }[]
}) {
  const pathname = usePathname()
  const isAdminArea = pathname.startsWith('/admin')
  const isAuthPage = pathname === '/account/login' || pathname === '/account/register'

  // Admin alani kendi oturum kontrolunu yapar; cift /me cagrisi olmasin diye saranmaz.
  if (isAdminArea) {
    return <main>{children}</main>
  }

  // Auth sayfalari (giris/kayit) chrome'suz ama AuthProvider icinde olmali ki
  // basarili giriste oturum durumunu refresh() ile guncelleyebilsinler.
  if (isAuthPage) {
    return (
      <AuthProvider>
        <main>{children}</main>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <AnnouncementBar />
      <Header />
      <Nav categories={categories} />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </AuthProvider>
  )
}
