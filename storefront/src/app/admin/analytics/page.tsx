'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { formatPrice } from '@/lib/utils'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface StatusCount {
  status: string
  count: number
}

interface TopProduct {
  productName: string
  quantity: number
  revenue: number | string
}

interface AnalyticsSummary {
  totalRevenue: number | string
  totalOrders: number
  paidOrders: number
  averageOrderValue: number | string
  totalCustomers: number
  totalProducts: number
  activeProducts: number
  totalCategories: number
  currency: string
  ordersByStatus: StatusCount[]
  topProducts: TopProduct[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Ödeme Bekliyor',
  PAID: 'Ödendi',
  PREPARING: 'Hazırlanıyor',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal',
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status
}

async function readApiError(res: Response, fallback: string) {
  try {
    const payload = await res.json()
    if (typeof payload?.message === 'string') return payload.message
  } catch {
    // ignore
  }
  return fallback
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          router.replace('/account/login?next=/admin/analytics')
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

        const res = await fetch('/api/admin/analytics/summary', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(await readApiError(res, 'Analitik verileri yüklenemedi.'))
        if (!active) return
        setData((await res.json()) as AnalyticsSummary)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Analitik verileri yüklenirken hata oluştu.')
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

  if (loading) {
    return (
      <AdminShell displayName={displayName}>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Analitik yükleniyor...</p>
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

  const maxStatusCount = Math.max(1, ...(data?.ordersByStatus.map((s) => s.count) ?? [1]))

  return (
    <AdminShell displayName={displayName}>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold text-[#3D2B1F]">Analitik</h1>
        <p className="mt-0.5 text-[13px] text-[#B5A090]">
          Mağazanızın satış ve katalog özetini görüntüleyin.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      ) : null}

      {data ? (
        <>
          {/* Primary metrics */}
          <div className="mb-5 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
            <Metric label="Toplam Ciro" value={formatPrice(data.totalRevenue, data.currency)} />
            <Metric label="Toplam Sipariş" value={data.totalOrders} sub={`${data.paidOrders} ödendi`} />
            <Metric label="Ort. Sepet" value={formatPrice(data.averageOrderValue, data.currency)} />
            <Metric label="Müşteri" value={data.totalCustomers} />
          </div>

          {/* Catalog metrics */}
          <div className="mb-5 grid grid-cols-3 gap-3 max-[480px]:grid-cols-1">
            <Metric label="Ürün" value={data.totalProducts} sub={`${data.activeProducts} aktif`} />
            <Metric label="Kategori" value={data.totalCategories} />
            <Metric label="Ödenmiş Sipariş" value={data.paidOrders} />
          </div>

          <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
            {/* Orders by status */}
            <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
              <h2 className="mb-4 text-[15px] font-bold text-[#3D2B1F]">Statüye Göre Siparişler</h2>
              {data.ordersByStatus.length === 0 ? (
                <p className="text-[13px] text-[#B5A090]">Henüz sipariş yok.</p>
              ) : (
                <div className="space-y-3">
                  {data.ordersByStatus.map((s) => (
                    <div key={s.status}>
                      <div className="mb-1 flex items-center justify-between text-[12.5px]">
                        <span className="font-semibold text-[#5B4839]">{statusLabel(s.status)}</span>
                        <span className="font-bold text-[#3D2B1F]">{s.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F4EEE6]">
                        <div
                          className="h-full rounded-full bg-[#C07B5A]"
                          style={{ width: `${(s.count / maxStatusCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top products */}
            <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
              <h2 className="mb-4 text-[15px] font-bold text-[#3D2B1F]">En Çok Satan Ürünler</h2>
              {data.topProducts.length === 0 ? (
                <p className="text-[13px] text-[#B5A090]">Henüz satış verisi yok.</p>
              ) : (
                <div className="space-y-1">
                  {data.topProducts.map((p, i) => (
                    <div
                      key={p.productName}
                      className="flex items-center gap-3 border-b border-[#F4EEE6] py-2.5 last:border-b-0"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F4EEE6] text-[11px] font-bold text-[#5B4839]">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#3D2B1F]">
                        {p.productName}
                      </span>
                      <span className="shrink-0 text-[12px] text-[#B5A090]">{p.quantity} adet</span>
                      <span className="shrink-0 text-[13px] font-bold text-[#3D2B1F]">
                        {formatPrice(p.revenue, data.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </AdminShell>
  )
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#C4B5A5]">{label}</p>
      <p className="mt-2.5 text-[24px] font-extrabold leading-none text-[#3D2B1F]">{value}</p>
      {sub ? <p className="mt-2 text-[12px] text-[#B5A090]">{sub}</p> : null}
    </div>
  )
}
