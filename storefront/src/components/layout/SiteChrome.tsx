'use client'

import { usePathname } from 'next/navigation'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Header from '@/components/layout/Header'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminArea = pathname.startsWith('/admin')
  const isAuthPage = pathname === '/account/login' || pathname === '/account/register'

  if (isAdminArea || isAuthPage) {
    return <main>{children}</main>
  }

  return (
    <>
      <AnnouncementBar />
      <Header />
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  )
}
