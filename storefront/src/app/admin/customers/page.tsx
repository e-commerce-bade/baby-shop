'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { formatPrice } from '@/lib/utils'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface Customer {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  active: boolean
  orderCount: number
  totalSpent: number | string
  currency: string
  createdAt: string | null
  lastOrderAt: string | null
}

async function readApiError(res: Response, fallback: string) {
  try {
    const payload = await res.json()
    if (typeof payload?.message === 'string') return payload.message
  } catch {
    // ignore empty bodies
  }
  return fallback
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fullName(c: Customer) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return name || '—'
}

function initials(c: Customer) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  if (!name) return c.email.slice(0, 2).toUpperCase()
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function AdminCustomersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const profileRes = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })
        if (profileRes.status === 401) {
          router.replace('/account/login?next=/admin/customers')
          return
        }
        if (!profileRes.ok) {
          setForbidden(true)
          return
        }
        const nextProfile = (await profileRes.json()) as AdminProfile
        if (!nextProfile.roles?.includes('ADMIN')) {
          setForbidden(true)
          return
        }
        if (!active) return
        setProfile(nextProfile)

        const res = await fetch('/api/admin/customers', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(await readApiError(res, 'Müşteriler yüklenemedi.'))
        if (!active) return
        setCustomers((await res.json()) as Customer[])
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Müşteriler yüklenirken hata oluştu.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [router])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        fullName(c).toLowerCase().includes(q) ||
        (c.phoneNumber ?? '').toLowerCase().includes(q),
    )
  }, [customers, search])

  const totalRevenue = useMemo(
    () => customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0),
    [customers],
  )
  const withOrders = useMemo(() => customers.filter((c) => c.orderCount > 0).length, [customers])

  if (loading) {
    return (
      <AdminShell displayName={displayName}>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Müşteriler yükleniyor...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (forbidden) {
    return (
      <AdminShell displayName={displayName}>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <h1 className="text-[20px] font-bold text-[#3D2B1F]">Yetkisiz Erişim</h1>
          <p className="mt-2 text-[13px] text-[#B5A090]">Bu alan yalnızca ADMIN rolüne sahip kullanıcılar içindir.</p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell displayName={displayName}>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold text-[#3D2B1F]">Müşteriler</h1>
        <p className="mt-0.5 text-[13px] text-[#B5A090]">
          Kayıtlı müşterileri, sipariş sayılarını ve toplam harcamalarını görüntüleyin.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
        <StatCard label="Toplam Müşteri" value={customers.length} />
        <StatCard label="Sipariş Veren" value={withOrders} />
        <StatCard label="Toplam Ciro" value={formatPrice(totalRevenue, 'TRY')} />
      </div>

      {error ? (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      ) : null}

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, e-posta veya telefon ara..."
          className="w-full rounded-[12px] border border-[#ECE3D6] bg-white py-2.5 pl-10 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <p className="text-[14px] font-semibold text-[#3D2B1F]">
            {customers.length === 0 ? 'Henüz kayıtlı müşteri yok.' : 'Aramanıza uygun müşteri bulunamadı.'}
          </p>
          <p className="mt-1 text-[13px] text-[#B5A090]">
            Müşteriler mağazadan kayıt olduğunda burada listelenir.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-[#ECE3D6] bg-white">
          {/* Desktop table header */}
          <div className="hidden grid-cols-[2fr_1.5fr_0.8fr_1fr_1fr] gap-4 border-b border-[#ECE3D6] bg-[#FAF6F1] px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#B5A090] lg:grid">
            <span>Müşteri</span>
            <span>İletişim</span>
            <span className="text-center">Sipariş</span>
            <span className="text-right">Harcama</span>
            <span className="text-right">Kayıt</span>
          </div>

          {filtered.map((c) => (
            <div
              key={c.id}
              className="border-b border-[#F4EEE6] px-5 py-4 last:border-b-0 lg:grid lg:grid-cols-[2fr_1.5fr_0.8fr_1fr_1fr] lg:items-center lg:gap-4"
            >
              {/* Customer */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4EEE6] text-[12px] font-bold text-[#5B4839]">
                  {initials(c)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-[#3D2B1F]">{fullName(c)}</p>
                  <p className="truncate text-[12px] text-[#B5A090] lg:hidden">{c.email}</p>
                </div>
              </div>

              {/* Contact (desktop) */}
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-[13px] text-[#5B4839]">{c.email}</p>
                <p className="text-[12px] text-[#B5A090]">{c.phoneNumber ?? '—'}</p>
              </div>

              {/* Mobile meta row */}
              <div className="mt-3 flex items-center justify-between gap-3 lg:contents">
                <span className="lg:text-center">
                  <span className="text-[11px] text-[#B5A090] lg:hidden">Sipariş: </span>
                  <span className="text-[13px] font-bold text-[#3D2B1F]">{c.orderCount}</span>
                </span>
                <span className="lg:text-right">
                  <span className="text-[11px] text-[#B5A090] lg:hidden">Harcama: </span>
                  <span className="text-[13px] font-bold text-[#3D2B1F]">
                    {formatPrice(c.totalSpent, c.currency)}
                  </span>
                </span>
                <span className="text-[12px] text-[#B5A090] lg:text-right">{formatDate(c.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#C4B5A5]">{label}</p>
      <p className="mt-2 text-[22px] font-extrabold leading-none text-[#3D2B1F]">{value}</p>
    </div>
  )
}
