'use client'

import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { formatPrice } from '@/lib/utils'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface CategoryResponse {
  id: number
  name: string
  active: boolean
}

interface ProductVariantResponse {
  id: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  active: boolean
}

interface ProductResponse {
  id: number
  name: string
  active: boolean
  primaryImageUrl?: string | null
  variants?: ProductVariantResponse[]
}

interface OrderResponse {
  orderNumber: string
  status: string
  totalAmount: number | string
  currency: string
  createdAt: string | null
  customerName?: string
  customerFirstName?: string
  customerLastName?: string
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
}

interface DailySales {
  date: string
  revenue: number | string
}

interface AnalyticsSummary {
  currency: string
  dailySales: DailySales[]
}

interface DashboardData {
  categories: CategoryResponse[]
  products: ProductResponse[]
  orders: PageResponse<OrderResponse>
  analytics: AnalyticsSummary | null
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Beklemede', bg: '#FFF8EC', color: '#9A7020' },
  PAID: { label: 'Ödendi', bg: '#EDF7F1', color: '#1A6640' },
  PROCESSING: { label: 'Hazırlanıyor', bg: '#FFF8EC', color: '#9A7020' },
  SHIPPED: { label: 'Kargoda', bg: '#EBF4FF', color: '#1A4E8A' },
  DELIVERED: { label: 'Teslim Edildi', bg: '#EDF7F1', color: '#1A6640' },
  CANCELLED: { label: 'İptal', bg: '#FEEAEA', color: '#8A1A1A' },
  REFUNDED: { label: 'İade', bg: '#FEF0EA', color: '#7A3020' },
}

function statusLabel(status: string) {
  const s = STATUS_MAP[status.toUpperCase()]
  if (!s) return { label: status, bg: '#F4EEE6', color: '#5B4839' }
  return s
}

const LOW_STOCK_LIMIT = 5
const LOW_STOCK_DISPLAY_COUNT = 5

interface LowStockItem {
  key: string
  name: string
  sku: string
  left: number
  imageUrl: string | null
}

/** Flattens active product variants, keeps the low-stock ones, and surfaces the scarcest first. */
function computeLowStock(products: ProductResponse[]): LowStockItem[] {
  return products
    .filter((product) => product.active)
    .flatMap((product) =>
      (product.variants ?? [])
        .filter((variant) => variant.active && variant.stockQuantity <= LOW_STOCK_LIMIT)
        .map((variant) => ({
          key: `${product.id}-${variant.id}`,
          name: product.name,
          sku: variant.sku ?? `${variant.sizeLabel} / ${variant.colorName}`,
          left: variant.stockQuantity,
          imageUrl: product.primaryImageUrl ?? null,
        })),
    )
    .sort((a, b) => a.left - b.left)
    .slice(0, LOW_STOCK_DISPLAY_COUNT)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function IconTrendUp() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 9l3.5-3.5L7 8l4-5" /><path d="M9 3h2v2" />
    </svg>
  )
}

function MetricCard({
  label,
  value,
  sub,
  iconBg,
  iconPath,
}: {
  label: string
  value: string | number
  sub: string
  iconBg: string
  iconPath: JSX.Element
}) {
  return (
    <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C4B5A5]">{label}</p>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${iconBg}`}>
          {iconPath}
        </div>
      </div>
      <p className="mt-3 text-[28px] font-extrabold leading-none text-[#3D2B1F]">{value}</p>
      <p className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-[#4A8A6A]">
        <IconTrendUp />
        <span className="text-[#B5A090] font-normal">{sub}</span>
      </p>
    </div>
  )
}

/** Rounds up to a "nice" axis maximum (1/2/5 × 10ⁿ) so the gridline labels stay readable. */
function niceCeil(value: number) {
  if (value <= 0) return 100
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

function formatAxis(value: number, currency: string) {
  if (value >= 1000) {
    const k = value / 1000
    return `₺${Number.isInteger(k) ? k : k.toFixed(1)}K`
  }
  return formatPrice(value, currency)
}

const SALES_VIEWBOX = { w: 400, h: 100, top: 12, bottom: 8 }

function SalesChart({ data, currency }: { data: DailySales[]; currency: string }) {
  const points = data.map((d) => ({ date: d.date, revenue: Number(d.revenue) || 0 }))

  if (points.length === 0) {
    return (
      <div className="flex h-[130px] items-center justify-center text-[12px] text-[#C4B5A5]">
        Henüz satış verisi yok.
      </div>
    )
  }

  const { w, h, top, bottom } = SALES_VIEWBOX
  const axisMax = niceCeil(Math.max(...points.map((p) => p.revenue)))
  const plotHeight = h - top - bottom

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w
    const y = top + (1 - p.revenue / axisMax) * plotHeight
    return { ...p, x, y }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  const peak = coords.reduce((best, c) => (c.revenue > best.revenue ? c : best), coords[0])
  const peakLabel = new Date(peak.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  const peakLeftPct = (peak.x / w) * 100

  return (
    <div className="flex gap-2">
      {/* Y axis (revenue) */}
      <div className="flex h-[130px] flex-col justify-between text-right text-[10px] text-[#C4B5A5]">
        <span>{formatAxis(axisMax, currency)}</span>
        <span>{formatAxis(axisMax / 2, currency)}</span>
        <span>₺0</span>
      </div>
      <div className="relative flex-1">
        <div className="relative h-[130px] overflow-hidden">
          <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C07B5A" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#C07B5A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#chartGrad)" />
            <path d={linePath} fill="none" stroke="#C07B5A" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            {peak.revenue > 0 ? (
              <>
                <circle cx={peak.x} cy={peak.y} r="3.5" fill="#C07B5A" />
                <circle cx={peak.x} cy={peak.y} r="7" fill="#C07B5A" fillOpacity="0.18" />
              </>
            ) : null}
          </svg>
          {peak.revenue > 0 ? (
            <div
              className="absolute top-2 -translate-x-1/2 rounded-[8px] border border-[#ECE3D6] bg-white px-2.5 py-1.5 shadow-sm"
              style={{ left: `${Math.min(Math.max(peakLeftPct, 12), 88)}%` }}
            >
              <p className="text-[9.5px] font-bold text-[#C4B5A5]">{peakLabel}</p>
              <p className="text-[12px] font-extrabold text-[#3D2B1F]">{formatPrice(peak.revenue, currency)}</p>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex justify-between">
          {points.map((p) => (
            <span key={p.date} className="text-[10px] text-[#C4B5A5]">
              {new Date(p.date).getDate()}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  label,
  iconBg,
  icon,
}: {
  href: string
  label: string
  iconBg: string
  icon: JSX.Element
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-[12px] border border-[#ECE3D6] bg-white p-4 text-center transition-colors hover:border-[#D5C9BA] hover:bg-[#FAF6F1]"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${iconBg}`}>
        {icon}
      </div>
      <span className="text-[12px] font-semibold text-[#5B4839]">{label}</span>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError(null)
      setForbidden(false)

      try {
        const profileResponse = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })

        if (profileResponse.status === 401) {
          router.replace('/account/login?next=/admin')
          return
        }

        if (!profileResponse.ok) throw new Error('Admin profil bilgisi alınamadı.')

        const loadedProfile = (await profileResponse.json()) as AdminProfile

        if (!loadedProfile.roles?.includes('ADMIN')) {
          setForbidden(true)
          return
        }

        const [catRes, prodRes, ordRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/categories', { cache: 'no-store', headers: { Accept: 'application/json' } }),
          fetch('/api/admin/products', { cache: 'no-store', headers: { Accept: 'application/json' } }),
          fetch('/api/admin/orders?page=0&size=5', { cache: 'no-store', headers: { Accept: 'application/json' } }),
          fetch('/api/admin/analytics/summary', { cache: 'no-store', headers: { Accept: 'application/json' } }),
        ])

        if (!catRes.ok || !prodRes.ok || !ordRes.ok) {
          throw new Error('Dashboard verileri alınamadı.')
        }

        if (!active) return

        setProfile(loadedProfile)
        setData({
          categories: (await catRes.json()) as CategoryResponse[],
          products: (await prodRes.json()) as ProductResponse[],
          orders: (await ordRes.json()) as PageResponse<OrderResponse>,
          analytics: analyticsRes.ok ? ((await analyticsRes.json()) as AnalyticsSummary) : null,
        })
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Dashboard yüklenemedi.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()
    return () => { active = false }
  }, [router])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center h-64">
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
      <AdminShell>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF0EA]">
            <svg className="h-7 w-7 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4M10 13.5h.01" strokeLinecap="round" /></svg>
          </div>
          <h1 className="text-[20px] font-bold text-[#3D2B1F]">Yetkisiz Erişim</h1>
          <p className="mt-2 text-[13px] text-[#B5A090]">Bu alan yalnızca ADMIN rolüne sahip kullanıcılar içindir.</p>
          <Link href="/account" className="mt-5 inline-flex rounded-[12px] bg-[#5B4839] px-5 py-2.5 text-[13px] font-bold text-white">
            Hesabıma Dön
          </Link>
        </div>
      </AdminShell>
    )
  }

  if (error) {
    return (
      <AdminShell displayName={displayName}>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-8">
          <p className="text-[13px] text-[#8A1A1A]">{error}</p>
        </div>
      </AdminShell>
    )
  }

  const categories = data?.categories ?? []
  const products = data?.products ?? []
  const orders = data?.orders.content ?? []
  const activeProducts = products.filter((p) => p.active).length
  const lowStockItems = computeLowStock(products)

  return (
    <AdminShell displayName={displayName}>
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#3D2B1F]">Dashboard</h1>
          <p className="mt-1 text-[13px] text-[#B5A090]">Mağazanızdaki son durumu buradan takip edin.</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Toplam Sipariş"
          value={data?.orders.totalElements ?? 0}
          sub="tüm siparişler"
          iconBg="bg-[#EBF4FF]"
          iconPath={
            <svg className="h-5 w-5 text-[#1A4E8A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h12l-1.5 10H5.5L4 6z" /><path d="M7.5 6V4.5a2.5 2.5 0 015 0V6" />
            </svg>
          }
        />
        <MetricCard
          label="Toplam Ürün"
          value={products.length}
          sub={`${activeProducts} aktif`}
          iconBg="bg-[#EDF7F1]"
          iconPath={
            <svg className="h-5 w-5 text-[#1A6640]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2L2 6v8l8 4 8-4V6L10 2z" /><path d="M2 6l8 4 8-4" /><path d="M10 10v8" />
            </svg>
          }
        />
        <MetricCard
          label="Toplam Kategori"
          value={categories.length}
          sub={`${categories.filter((c) => c.active).length} aktif`}
          iconBg="bg-[#F4EEE6]"
          iconPath={
            <svg className="h-5 w-5 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7a1.5 1.5 0 011.5-1.5h4l2 2h7A1.5 1.5 0 0118 9v6.5A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5V7z" />
            </svg>
          }
        />
        <MetricCard
          label="Panel Durumu"
          value="Aktif"
          sub="tüm sistemler normal"
          iconBg="bg-[#EDF7F1]"
          iconPath={
            <svg className="h-5 w-5 text-[#1A6640]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" /><path d="M7 10l2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* Chart + Low Stock */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#3D2B1F]">Satış Özeti</h2>
              <p className="text-[12px] text-[#C4B5A5]">Son 7 günlük tahmini görünüm</p>
            </div>
            <span className="rounded-[8px] bg-[#FAF6F1] px-2.5 py-1 text-[11.5px] font-semibold text-[#B5A090]">
              Son 7 Gün
            </span>
          </div>
          <SalesChart
            data={data?.analytics?.dailySales ?? []}
            currency={data?.analytics?.currency ?? 'TRY'}
          />
        </div>

        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-[#3D2B1F]">Düşük Stok Uyarısı</h2>
            <Link href="/admin/inventory" className="text-[12px] font-semibold text-[#C07B5A] hover:underline">
              Tümünü Gör
            </Link>
          </div>
          {lowStockItems.length > 0 ? (
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-10 w-10 shrink-0 rounded-[10px] object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-[10px] bg-[#F4EEE6]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#3D2B1F]">{item.name}</p>
                    <p className="text-[11.5px] text-[#C4B5A5]">{item.sku}</p>
                  </div>
                  <span className={`text-[13px] font-extrabold ${item.left === 0 ? 'text-[#8A1A1A]' : 'text-[#C07B5A]'}`}>
                    {item.left}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[#D5C9BA] bg-[#FAF6F1] px-5 py-8 text-center">
              <p className="text-[13px] text-[#B5A090]">Düşük stoklu ürün bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders + Quick Actions */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#3D2B1F]">Son Siparişler</h2>
              <p className="text-[12px] text-[#C4B5A5]">Son 5 kayıt</p>
            </div>
            <Link href="/admin/orders" className="text-[12px] font-semibold text-[#C07B5A] hover:underline">
              Tümünü Gör
            </Link>
          </div>

          {orders.length > 0 ? (
            <div className="overflow-hidden rounded-[12px] border border-[#ECE3D6]">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#FAF6F1] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#C4B5A5]">
                    <th className="px-4 py-3">Sipariş</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Müşteri</th>
                    <th className="hidden px-4 py-3 md:table-cell">Tarih</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EEE6]">
                  {orders.map((order) => {
                    const s = statusLabel(order.status)
                    const customer =
                      order.customerName ??
                      [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') ??
                      '—'
                    return (
                      <tr key={order.orderNumber} className="hover:bg-[#FAF6F1] transition-colors">
                        <td className="px-4 py-3 font-bold text-[#3D2B1F]">{order.orderNumber}</td>
                        <td className="hidden px-4 py-3 text-[#6B5747] sm:table-cell">{customer}</td>
                        <td className="hidden px-4 py-3 text-[#B5A090] md:table-cell">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{ background: s.bg, color: s.color }}
                          >
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#3D2B1F]">
                          {formatPrice(order.totalAmount, order.currency)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[#D5C9BA] bg-[#FAF6F1] px-5 py-10 text-center">
              <p className="text-[13px] text-[#B5A090]">Henüz sipariş bulunmuyor.</p>
            </div>
          )}
        </div>

        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
          <h2 className="mb-4 text-[16px] font-bold text-[#3D2B1F]">Hızlı Aksiyonlar</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            <QuickAction
              href="/admin/products"
              label="Yeni Ürün Ekle"
              iconBg="bg-[#F4EEE6]"
              icon={<svg className="h-5 w-5 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>}
            />
            <QuickAction
              href="/admin/orders"
              label="Siparişleri Gör"
              iconBg="bg-[#EBF4FF]"
              icon={<svg className="h-5 w-5 text-[#1A4E8A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h12l-1.5 10H5.5L4 6z" /><path d="M7.5 6V4.5a2.5 2.5 0 015 0V6" /></svg>}
            />
            <QuickAction
              href="/admin/categories"
              label="Kategori Yönetimi"
              iconBg="bg-[#FFF8EC]"
              icon={<svg className="h-5 w-5 text-[#9A7020]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 7a1.5 1.5 0 011.5-1.5h4l2 2h7A1.5 1.5 0 0118 9v6.5A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5V7z" /></svg>}
            />
            <QuickAction
              href="/admin/inventory"
              label="Stok Yönetimi"
              iconBg="bg-[#EDF7F1]"
              icon={<svg className="h-5 w-5 text-[#1A6640]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="9" width="16" height="9" rx="1.5" /><path d="M6 9V6a4 4 0 018 0v3" /></svg>}
            />
            <QuickAction
              href="/admin/analytics"
              label="Analitik Raporu"
              iconBg="bg-[#F4EEE6]"
              icon={<svg className="h-5 w-5 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 14l4-5 4 3 4-7" /><path d="M3 17h14" /></svg>}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
