'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminShell from './AdminShell'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

export default function AdminPlaceholderPage({
  title,
  description,
  nextItems,
}: {
  title: string
  description: string
  nextItems: string[]
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    let active = true

    async function checkAdmin() {
      try {
        const res = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })

        if (res.status === 401) { router.replace('/account/login?next=/admin'); return }
        if (!res.ok) { setForbidden(true); return }

        const p = (await res.json()) as AdminProfile
        if (!p.roles?.includes('ADMIN')) { setForbidden(true); return }
        if (active) setProfile(p)
      } finally {
        if (active) setLoading(false)
      }
    }

    void checkAdmin()
    return () => { active = false }
  }, [router])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  if (loading) {
    return (
      <AdminShell>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Yükleniyor...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (forbidden) {
    return (
      <AdminShell displayName={displayName}>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF0EA]">
            <svg className="h-7 w-7 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4M10 13.5h.01" /></svg>
          </div>
          <h1 className="text-[20px] font-bold text-[#3D2B1F]">Yetkisiz Erişim</h1>
          <p className="mt-2 text-[13px] text-[#B5A090]">Bu alan yalnızca ADMIN rolüne sahip kullanıcılar içindir.</p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell displayName={displayName}>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold text-[#3D2B1F]">{title}</h1>
        <p className="mt-1 text-[13px] text-[#B5A090]">{description}</p>
      </div>

      <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#F4EEE6]">
          <svg className="h-6 w-6 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4v12M4 10h12" /></svg>
        </div>
        <h2 className="text-[15px] font-bold text-[#3D2B1F]">Bu ekran için sıradaki geliştirmeler</h2>
        <ul className="mt-3 space-y-2.5">
          {nextItems.map((item) => (
            <li key={item} className="flex gap-2.5 text-[13px] text-[#6B5747]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C07B5A]" />
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[#5B4839] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#4A3A2E]"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4l-4 4 4 4" /></svg>
          Dashboard&apos;a Dön
        </Link>
      </div>
    </AdminShell>
  )
}
