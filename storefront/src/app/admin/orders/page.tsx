'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { downloadCsv } from '@/lib/csv'
import { formatPrice } from '@/lib/utils'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface AdminOrder {
  id: number
  orderNumber: string
  status: OrderStatus
  customerEmail: string
  customerFirstName: string | null
  customerLastName: string | null
  customerPhone: string | null
  subtotalAmount: number | string | null
  shippingAmount: number | string | null
  discountAmount: number | string | null
  totalAmount: number | string
  currency: string
  paymentMethod: string | null
  shippingCarrier: string | null
  codSurcharge: number | string | null
  cancellationReason: string | null
  createdAt: string | null
  shippingAddress: {
    line1: string
    line2: string | null
    district: string
    city: string
    postalCode: string | null
    country: string
  } | null
  notes: string | null
  items: Array<{
    id: number
    productName: string
    variantLabel: string
    sku: string | null
    quantity: number
    unitPrice: number | string | null
    lineTotal: number | string
    currency: string
    imageUrl: string | null
  }>
}

interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

const PAGE_SIZE = 20

const STATUS_CONFIG = {
  PENDING_PAYMENT: { label: 'Ödeme Bekliyor', bg: '#FFF8EC', color: '#9A7020', dotColor: '#D4A017' },
  PAID: { label: 'Onaylandı', bg: '#EDF7F1', color: '#1A6640', dotColor: '#27AE60' },
  PREPARING: { label: 'Hazırlanıyor', bg: '#FFF8EC', color: '#9A7020', dotColor: '#D4A017' },
  SHIPPED: { label: 'Kargoda', bg: '#EBF4FF', color: '#1A4E8A', dotColor: '#2E86DE' },
  DELIVERED: { label: 'Teslim Edildi', bg: '#EDF7F1', color: '#1A6640', dotColor: '#27AE60' },
  CANCELLED: { label: 'İptal Edildi', bg: '#FEEAEA', color: '#8A1A1A', dotColor: '#E74C3C' },
  // 'Odenmedi': terk edilen/odemesi basarisiz kart siparisleri. Listede tab'i yok; yalnizca
  // olasi bir gorunum icin etiket tanimlanir.
  EXPIRED: { label: 'Ödenmedi', bg: '#F0EEEC', color: '#8C7A6A', dotColor: '#A89070' },
} as const

type OrderStatus = keyof typeof STATUS_CONFIG
type StatusKey = 'all' | OrderStatus

// Musterinin istedigi 5 asama (+ Tumu). 'Odeme Bekliyor' ve 'Odenmedi' sekme olarak gosterilmez.
const STATUS_TABS: Array<{ key: StatusKey; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'PAID', label: 'Onaylandı' },
  { key: 'PREPARING', label: 'Hazırlanıyor' },
  { key: 'SHIPPED', label: 'Kargoda' },
  { key: 'DELIVERED', label: 'Teslim Edildi' },
  { key: 'CANCELLED', label: 'İptal Edildi' },
]

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  EXPIRED: [],
}

function getStatus(status: string) {
  return STATUS_CONFIG[status.toUpperCase() as OrderStatus] ?? {
    label: status,
    bg: '#F4EEE6',
    color: '#5B4839',
    dotColor: '#A89070',
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: 'Kredi / Banka Kartı',
  COD: 'Kapıda Nakit Ödeme',
  EFT: 'EFT / Havale',
}

// Liste rozetinde gösterilen kısa etiket + renk.
const PAYMENT_METHOD_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  CARD: { label: 'iyzico', bg: '#EBF4FF', color: '#1A4E8A' },
  COD: { label: 'Kapıda Ödeme', bg: '#FFF3E0', color: '#9A5B20' },
  EFT: { label: 'Havale/EFT', bg: '#F0EAFB', color: '#5B3F9A' },
}

const PAYMENT_METHOD_TABS: Array<{ key: 'all' | 'CARD' | 'COD' | 'EFT'; label: string }> = [
  { key: 'all', label: 'Tüm Ödemeler' },
  { key: 'CARD', label: 'Kart (iyzico)' },
  { key: 'COD', label: 'Kapıda Ödeme' },
  { key: 'EFT', label: 'Havale/EFT' },
]

type PaymentMethodKey = 'all' | 'CARD' | 'COD' | 'EFT'

function paymentMethodLabel(method: string | null | undefined) {
  if (!method) return 'Kredi / Banka Kartı'
  return PAYMENT_METHOD_LABELS[method.toUpperCase()] ?? method
}

function PaymentMethodBadge({ method }: { method: string | null | undefined }) {
  const m = (method ?? 'CARD').toUpperCase()
  const cfg = PAYMENT_METHOD_BADGE[m] ?? { label: method ?? '-', bg: '#F4EEE6', color: '#5B4839' }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function customerName(order: AdminOrder) {
  return [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') || 'Misafir müşteri'
}

function itemCount(order: AdminOrder) {
  return order.items?.reduce((total, item) => total + item.quantity, 0) ?? 0
}

function StatusBadge({ status }: { status: string }) {
  const s = getStatus(status)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dotColor }} />
      {s.label}
    </span>
  )
}

// useSearchParams kullanan icerik, statik on-isleme icin Suspense siniri icinde olmalidir.
export default function AdminOrdersPage() {
  return (
    <Suspense fallback={null}>
      <AdminOrdersContent />
    </Suspense>
  )
}

function AdminOrdersContent() {
  const router = useRouter()
  // Ust cubuktaki genel aramadan gelindiginde (?q=...) arama kutusu o metinle acilir.
  const urlQuery = useSearchParams().get('q') ?? ''
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [page, setPage] = useState<PageResponse<AdminOrder> | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  // Siparişler sayfası varsayılan olarak "Sipariş Alındı" (PAID) filtresiyle açılır; aramayla
  // gelindiyse tüm durumlarda aranır.
  const [statusFilter, setStatusFilter] = useState<StatusKey>(urlQuery ? 'all' : 'PAID')
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethodKey>('all')
  const [search, setSearch] = useState(urlQuery)
  const [debouncedSearch, setDebouncedSearch] = useState(urlQuery)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [updatingOrderNumber, setUpdatingOrderNumber] = useState<string | null>(null)
  // İptal edilirken neden girilmesi için: iptal edilecek sipariş + neden metni.
  const [cancelTarget, setCancelTarget] = useState<AdminOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    let active = true

    async function init() {
      setLoading(true)
      try {
        const res = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })

        if (res.status === 401) {
          router.replace('/account/login?next=/admin')
          return
        }

        if (!res.ok) {
          setForbidden(true)
          return
        }

        const loadedProfile = (await res.json()) as AdminProfile
        if (!loadedProfile.roles?.includes('ADMIN')) {
          setForbidden(true)
          return
        }

        if (active) setProfile(loadedProfile)
      } catch (initError) {
        if (active) setError(initError instanceof Error ? initError.message : 'Hata oluştu.')
      }
    }

    void init()
    return () => {
      active = false
    }
  }, [router])

  // Genel aramadan gelinince (?q=...) kutuyu ona esitle; parametre sonra adres cubugundan silinir ki
  // ayni sonuca yeniden tiklanabilsin ve sayfa yenilenince arama geri gelmesin.
  useEffect(() => {
    if (!urlQuery) return
    setSearch(urlQuery)
    setDebouncedSearch(urlQuery)
    setStatusFilter('all')
    setPaymentFilter('all')
    router.replace(window.location.pathname, { scroll: false })
  }, [urlQuery, router])

  // Her tus vurusunda istek atmamak icin arama metni kisa bir gecikmeyle uygulanir. Arama tum
  // durumlarda yapilir: "Onaylandı" sekmesindeyken yazilan bir musteri adi, kargodaki siparisini de
  // bulmali; bu yuzden arama uygulanirken durum sekmesi "Tümü"ne alinir (kullanici sonra daraltabilir).
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      if (search.trim()) setStatusFilter('all')
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setCurrentPage(0)
  }, [debouncedSearch, statusFilter, paymentFilter])

  useEffect(() => {
    if (!profile) return
    let active = true

    async function fetchOrders() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: String(currentPage), size: String(PAGE_SIZE) })
        const q = debouncedSearch.trim()

        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (paymentFilter !== 'all') params.set('paymentMethod', paymentFilter)
        // Siparis no, musteri adi, telefon veya e-posta icinde arar.
        if (q) params.set('q', q)

        const res = await fetch(`/api/admin/orders?${params.toString()}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        const payload = await res.json().catch(() => null)
        if (!res.ok) throw new Error(payload?.message ?? 'Siparişler yüklenemedi.')

        if (active) setPage(payload as PageResponse<AdminOrder>)
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Hata oluştu.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchOrders()
    return () => {
      active = false
    }
  }, [profile, currentPage, statusFilter, paymentFilter, debouncedSearch])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  const orders = page?.content ?? []

  // İptal (İptal Edildi) seçilirse önce neden sorulur; diğer durumlar doğrudan güncellenir.
  function updateOrderStatus(order: AdminOrder, nextStatus: OrderStatus) {
    if (order.status === nextStatus) return
    if (nextStatus === 'CANCELLED') {
      setCancelReason('')
      setCancelTarget(order)
      return
    }
    void performStatusUpdate(order, nextStatus)
  }

  async function performStatusUpdate(order: AdminOrder, nextStatus: OrderStatus, cancellationReason?: string) {
    setUpdatingOrderNumber(order.orderNumber)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}/status`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          ...(cancellationReason && cancellationReason.trim() ? { cancellationReason: cancellationReason.trim() } : {}),
        }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.message ?? 'Sipariş durumu güncellenemedi.')

      const updated = payload as AdminOrder
      setPage((current) => current
        ? {
            ...current,
            content: current.content.map((item) => item.orderNumber === updated.orderNumber ? updated : item),
          }
        : current)
      setSelectedOrder((current) => current?.orderNumber === updated.orderNumber ? updated : current)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Sipariş durumu güncellenemedi.')
    } finally {
      setUpdatingOrderNumber(null)
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    const target = cancelTarget
    setCancelTarget(null)
    await performStatusUpdate(target, 'CANCELLED', cancelReason)
  }

  function exportVisibleOrders() {
    const rows = [
      ['Sipariş No', 'Müşteri', 'E-posta', 'Durum', 'Tarih', 'Ürün Adedi', 'Toplam'],
      ...orders.map((order) => [
        order.orderNumber,
        customerName(order),
        order.customerEmail,
        getStatus(order.status).label,
        formatDate(order.createdAt),
        String(itemCount(order)),
        `${formatPrice(order.totalAmount, order.currency)}`,
      ]),
    ]

    downloadCsv('orders.csv', rows)
  }

  if (forbidden) {
    return (
      <AdminShell>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <h1 className="text-[20px] font-bold text-[#3D2B1F]">Yetkisiz Erişim</h1>
          <p className="mt-2 text-[13px] text-[#B5A090]">Bu sayfa yalnızca admin kullanıcılar içindir.</p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell displayName={displayName}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[#3D2B1F]">Siparişler</h1>
          <p className="mt-0.5 text-[13px] text-[#B5A090]">
            {page ? `${page.totalElements} sipariş` : 'Siparişleri görüntüleyin ve yönetin.'}
          </p>
        </div>
        <button
          type="button"
          disabled={orders.length === 0}
          onClick={exportVisibleOrders}
          className="hidden items-center gap-2 rounded-[10px] border border-[#ECE3D6] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 10v2.5a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V10M8 1v9M5 7l3 3 3-3" />
          </svg>
          Dışa Aktar
        </button>
      </div>

      {/* Ödeme yöntemi filtresi (sipariş durumunun üstünde) */}
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#C4B5A5]">Ödeme</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {PAYMENT_METHOD_TABS.map((tab) => {
            const active = paymentFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPaymentFilter(tab.key)}
                className={`shrink-0 rounded-[8px] px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#F4EEE6] text-[#5B4839]'
                    : 'border border-[#ECE3D6] bg-white text-[#B5A090] hover:text-[#5B4839]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sipariş durumu filtresi */}
      <div className="mb-4 flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#C4B5A5]">Durum</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`shrink-0 rounded-[8px] px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#F4EEE6] text-[#5B4839]'
                    : 'border border-[#ECE3D6] bg-white text-[#B5A090] hover:text-[#5B4839]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] max-w-md flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Müşteri adı, telefon, e-posta veya sipariş no ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-[#ECE3D6] bg-white py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
          />
        </div>
        {(search || statusFilter !== 'all' || paymentFilter !== 'all') ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setPaymentFilter('all')
            }}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#5B4839] transition-colors hover:bg-[#FAF6F1]"
          >
            Filtreleri Temizle
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-[16px] border border-[#ECE3D6] bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
              <p className="text-[12px] text-[#B5A090]">Yükleniyor...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EEE6]">
              <svg className="h-6 w-6 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 6h12l-1.5 10H5.5L4 6z" /><path d="M7.5 6V4.5a2.5 2.5 0 015 0V6" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-[#5B4839]">
              {search || statusFilter !== 'all' || paymentFilter !== 'all' ? 'Sonuç bulunamadı.' : 'Henüz sipariş bulunmuyor.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#ECE3D6] bg-[#FAF6F1] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#A89070]">
                    <th className="px-5 py-3.5">Sipariş No</th>
                    <th className="px-5 py-3.5">Müşteri</th>
                    <th className="px-5 py-3.5">Tarih</th>
                    <th className="px-5 py-3.5">Ürün</th>
                    <th className="px-5 py-3.5">Durum</th>
                    <th className="px-5 py-3.5 text-right">Tutar</th>
                    <th className="px-5 py-3.5 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EEE6]">
                  {orders.map((order) => (
                    <tr key={order.orderNumber} className="transition-colors hover:bg-[#FAF6F1]">
                      <td className="px-5 py-4 font-bold text-[#3D2B1F]">{order.orderNumber}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#3D2B1F]">{customerName(order)}</p>
                        <p className="text-[11.5px] text-[#A89070]">{order.customerEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-[#8C7A6A]">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-4 text-[#8C7A6A]">{itemCount(order)} adet</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge status={order.status} />
                          <PaymentMethodBadge method={order.paymentMethod} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-[#3D2B1F]">
                        {formatPrice(order.totalAmount, order.currency)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="flex h-8 items-center rounded-[8px] border border-[#ECE3D6] px-3 text-[12px] font-semibold text-[#5B4839] transition-colors hover:bg-[#F4EEE6]"
                          >
                            Detay
                          </button>
                          <StatusSelect
                            order={order}
                            disabled={updatingOrderNumber === order.orderNumber}
                            onChange={(nextStatus) => void updateOrderStatus(order, nextStatus)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[#F4EEE6] lg:hidden">
              {orders.map((order) => (
                <div key={order.orderNumber} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#3D2B1F]">{order.orderNumber}</p>
                      <p className="mt-0.5 text-[12.5px] text-[#8C7A6A]">{customerName(order)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={order.status} />
                      <PaymentMethodBadge method={order.paymentMethod} />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[12px] text-[#A89070]">{formatDate(order.createdAt)}</span>
                    <span className="font-bold text-[#3D2B1F]">{formatPrice(order.totalAmount, order.currency)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-[8px] border border-[#ECE3D6] px-3 py-2 text-[12px] font-semibold text-[#5B4839]"
                    >
                      Detay
                    </button>
                    <StatusSelect
                      order={order}
                      disabled={updatingOrderNumber === order.orderNumber}
                      onChange={(nextStatus) => void updateOrderStatus(order, nextStatus)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {page && page.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12.5px] text-[#B5A090]">
            Sayfa {currentPage + 1} / {page.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!page.hasPrevious}
              onClick={() => setCurrentPage((value) => Math.max(0, value - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#ECE3D6] bg-white text-[#5B4839] transition-colors hover:bg-[#F4EEE6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4l-4 4 4 4" /></svg>
            </button>
            <button
              type="button"
              disabled={!page.hasNext}
              onClick={() => setCurrentPage((value) => value + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#ECE3D6] bg-white text-[#5B4839] transition-colors hover:bg-[#F4EEE6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>
            </button>
          </div>
        </div>
      ) : null}

      {selectedOrder ? (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      ) : null}

      {/* İptal nedeni modalı */}
      {cancelTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={() => setCancelTarget(null)}>
          <div className="w-full max-w-[420px] rounded-[16px] bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[#3D2B1F]">Siparişi İptal Et</h3>
            <p className="mt-1 text-[12.5px] text-[#8C7A6A]">
              {cancelTarget.orderNumber} numaralı sipariş iptal edilecek. İptal nedenini yazın:
            </p>
            <textarea
              autoFocus
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Örn. Müşteri vazgeçti / Stok kalmadı / Yanlış sipariş"
              className="mt-3 w-full rounded-[10px] border border-[#ECE3D6] bg-[#FAF6F1] px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:bg-white focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 rounded-[10px] border border-[#ECE3D6] py-2.5 text-[13px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void confirmCancel()}
                className="flex-1 rounded-[10px] bg-[#C0392B] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A93226]"
              >
                Siparişi İptal Et
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  )
}

function StatusSelect({
  order,
  disabled,
  onChange,
}: {
  order: AdminOrder
  disabled: boolean
  onChange: (status: OrderStatus) => void
}) {
  const available = ALLOWED_TRANSITIONS[order.status] ?? []
  const disabledSelect = disabled || available.length === 0

  return (
    <select
      value=""
      disabled={disabledSelect}
      onChange={(event) => {
        const nextStatus = event.target.value as OrderStatus
        if (nextStatus) onChange(nextStatus)
        event.currentTarget.value = ''
      }}
      className="h-8 rounded-[8px] border border-[#ECE3D6] bg-white px-2 text-[12px] font-semibold text-[#5B4839] outline-none transition-colors hover:bg-[#F4EEE6] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`${order.orderNumber} sipariş durumunu güncelle`}
    >
      <option value="">{disabled ? 'Güncelleniyor' : available.length > 0 ? 'Durum' : 'Kapalı'}</option>
      {available.map((status) => (
        <option key={status} value={status}>
          {STATUS_CONFIG[status].label}
        </option>
      ))}
    </select>
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function absoluteUrl(url: string) {
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

// Siparis detayini bagimsiz bir yazdirma penceresinde acar; kullanici yazdirabilir veya
// "PDF olarak kaydet" ile PDF alabilir. Admin arayuzunun stilini tasimadan temiz cikti verir.
// Musteri, teslimat ve odeme (odeme sekli + toplam) en ustte durur; urunler kucuk gorselli kartlar
// halinde alta dizilir. Boylece yalnizca ilk sayfa yazdirilsa bile siparisin tum ozeti kagittadir.
function printOrder(order: AdminOrder) {
  const status = getStatus(order.status)
  const address = order.shippingAddress
  const money = (value: number | string | null | undefined) => escapeHtml(formatPrice(value ?? 0, order.currency))
  const addressHtml = address
    ? [
        address.line1,
        address.line2,
        [address.district, address.city].filter(Boolean).join(', '),
        [address.postalCode, address.country].filter(Boolean).join(' / '),
      ]
        .filter(Boolean)
        .map((line) => `<div>${escapeHtml(String(line))}</div>`)
        .join('')
    : '<div>Adres bilgisi yok.</div>'

  const isCashOnDelivery = (order.paymentMethod ?? '').toUpperCase() === 'COD'
  const shipping = Number(order.shippingAmount ?? 0)
  const amountRows = [
    order.subtotalAmount != null ? `<tr><td>Ara toplam</td><td>${money(order.subtotalAmount)}</td></tr>` : '',
    order.shippingAmount != null ? `<tr><td>Kargo</td><td>${shipping > 0 ? money(shipping) : 'Ücretsiz'}</td></tr>` : '',
    Number(order.codSurcharge) > 0 ? `<tr><td>Kapıda ödeme farkı</td><td>${money(order.codSurcharge)}</td></tr>` : '',
    Number(order.discountAmount) > 0 ? `<tr><td>İndirim</td><td>-${money(order.discountAmount)}</td></tr>` : '',
  ].join('')

  const totalQuantity = order.items.reduce((total, item) => total + item.quantity, 0)
  const itemsHtml = order.items
    .map((item) => {
      const thumb = item.imageUrl
        ? `<img src="${escapeHtml(absoluteUrl(item.imageUrl))}" alt="" />`
        : '<div class="noimg"></div>'
      const unitPrice = item.unitPrice != null ? `${item.quantity} × ${money(item.unitPrice)}` : `${item.quantity} adet`
      return `
        <div class="item">
          ${thumb}
          <div class="item-body">
            <div class="item-name">${escapeHtml(item.productName)}</div>
            <div class="item-variant">${escapeHtml(item.variantLabel ?? '')}</div>
            ${item.sku ? `<div class="muted small">${escapeHtml(item.sku)}</div>` : ''}
            <div class="item-price"><span>${unitPrice}</span><strong>${money(item.lineTotal)}</strong></div>
          </div>
        </div>`
    })
    .join('')

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Sipariş ${escapeHtml(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #3D2B1F; margin: 28px; font-size: 13px; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #A89070; margin: 0 0 6px; }
  .brand { font-size: 13px; font-weight: 700; color: #C07B5A; letter-spacing: 0.14em; text-transform: uppercase; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #ECE3D6; padding-bottom:12px; }
  .muted { color:#8C7A6A; }
  .small { font-size: 11px; }
  .strong { font-weight: 700; font-size: 15px; }
  .badge { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700; background:${status.bg}; color:${status.color}; }
  .summary { display:flex; gap:12px; margin-top:14px; }
  .box { flex:1; border:1px solid #ECE3D6; border-radius:10px; padding:12px; overflow-wrap:anywhere; }
  .pay { flex:1.1; background:#FAF6F1; }
  .amounts { width:100%; border-collapse:collapse; margin-top:6px; color:#8C7A6A; }
  .amounts td { padding:1px 0; }
  .amounts td:last-child { text-align:right; }
  .total { display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid #ECE3D6; margin-top:6px; padding-top:6px; font-weight:800; }
  .total span:last-child { font-size:20px; }
  .collect { margin-top:6px; padding:5px 8px; border-radius:6px; border:1px solid #E0B98A; font-weight:700; text-align:center; }
  .items-title { margin:18px 0 8px; }
  .items { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .item { display:flex; gap:12px; border:1px solid #ECE3D6; border-radius:10px; padding:10px; break-inside:avoid; page-break-inside:avoid; }
  .item img, .item .noimg { width:104px; height:128px; flex-shrink:0; object-fit:cover; border-radius:8px; border:1px solid #ECE3D6; background:#F4EEE6; }
  .item-body { flex:1; min-width:0; display:flex; flex-direction:column; }
  .item-name { font-weight:700; }
  .item-variant { font-size:14px; font-weight:700; color:#C07B5A; margin:3px 0; }
  .item-price { display:flex; justify-content:space-between; align-items:baseline; margin-top:auto; padding-top:6px; }
  .note { margin-top:14px; border:1px solid #ECE3D6; border-radius:10px; padding:12px; }
  @media print { body { margin: 10mm; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">Bade Bebe · Sipariş Detayı</div>
      <h1>${escapeHtml(order.orderNumber)}</h1>
      <div class="muted">${escapeHtml(formatDate(order.createdAt))}</div>
    </div>
    <span class="badge">${escapeHtml(status.label)}</span>
  </div>

  <div class="summary">
    <div class="box">
      <h2>Müşteri</h2>
      <div class="strong">${escapeHtml(customerName(order))}</div>
      <div>${escapeHtml(order.customerPhone ?? 'Telefon yok')}</div>
      <div class="muted">${escapeHtml(order.customerEmail)}</div>
    </div>
    <div class="box">
      <h2>Teslimat</h2>
      ${addressHtml}
      ${order.shippingCarrier ? `<div class="muted">Kargo: ${escapeHtml(order.shippingCarrier)}</div>` : ''}
    </div>
    <div class="box pay">
      <h2>Ödeme</h2>
      <div class="strong">${escapeHtml(paymentMethodLabel(order.paymentMethod))}</div>
      <table class="amounts">${amountRows}</table>
      <div class="total"><span>Toplam</span><span>${money(order.totalAmount)}</span></div>
      ${isCashOnDelivery ? `<div class="collect">Kapıda tahsil edilecek: ${money(order.totalAmount)}</div>` : ''}
    </div>
  </div>

  <h2 class="items-title">Ürünler (${totalQuantity} adet)</h2>
  <div class="items">${itemsHtml}</div>

  ${order.notes ? `<div class="note"><h2>Müşteri Notu</h2>${escapeHtml(order.notes)}</div>` : ''}
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=820,height=900')
  if (!printWindow) return
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  // Gorsellerin yuklenmesi icin kisa bekleme; onload guvenilir sekilde tetiklenmeyebilir.
  printWindow.setTimeout(() => {
    printWindow.print()
  }, 350)
}

function OrderDetailsDrawer({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Detayı kapat" onClick={onClose} />
      <aside className="relative h-full w-full max-w-[460px] overflow-y-auto bg-white shadow-[0_20px_80px_rgba(61,43,31,.18)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ECE3D6] bg-white px-6 py-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C07B5A]">Sipariş Detayı</p>
            <h2 className="mt-1 text-[22px] font-bold text-[#3D2B1F]">{order.orderNumber}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printOrder(order)}
              className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#ECE3D6] px-3 text-[12.5px] font-semibold text-[#5B4839] transition-colors hover:bg-[#F4EEE6]"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6V2h8v4M4 12H3a1 1 0 01-1-1V8a1 1 0 011-1h10a1 1 0 011 1v3a1 1 0 01-1 1h-1M4 10h8v4H4z" />
              </svg>
              Yazdır
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#ECE3D6] text-[#5B4839] transition-colors hover:bg-[#F4EEE6]"
              aria-label="Kapat"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <DetailSection title="Müşteri">
            <p className="font-semibold text-[#3D2B1F]">{customerName(order)}</p>
            <p className="mt-1 text-[13px] text-[#8C7A6A]">{order.customerEmail}</p>
            {order.customerPhone ? <p className="mt-1 text-[13px] text-[#8C7A6A]">{order.customerPhone}</p> : null}
          </DetailSection>

          <DetailSection title="Özet">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#8C7A6A]">Durum</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] text-[#8C7A6A]">Ödeme Yöntemi</span>
              <span className="text-[13px] font-semibold text-[#3D2B1F]">{paymentMethodLabel(order.paymentMethod)}</span>
            </div>
            {order.shippingCarrier ? (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] text-[#8C7A6A]">Kargo Firması</span>
                <span className="text-[13px] font-semibold text-[#3D2B1F]">{order.shippingCarrier}</span>
              </div>
            ) : null}
            {Number(order.codSurcharge) > 0 ? (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] text-[#8C7A6A]">Kapıda Ödeme Farkı</span>
                <span className="text-[13px] font-semibold text-[#3D2B1F]">{formatPrice(order.codSurcharge ?? 0, order.currency)}</span>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] text-[#8C7A6A]">Toplam</span>
              <span className="font-bold text-[#3D2B1F]">{formatPrice(order.totalAmount, order.currency)}</span>
            </div>
          </DetailSection>

          <DetailSection title="Teslimat">
            {order.shippingAddress ? (
              <div className="text-[13px] leading-relaxed text-[#8C7A6A]">
                <p className="font-semibold text-[#3D2B1F]">{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                <p>{[order.shippingAddress.district, order.shippingAddress.city].filter(Boolean).join(', ')}</p>
                <p>{[order.shippingAddress.postalCode, order.shippingAddress.country].filter(Boolean).join(' / ')}</p>
              </div>
            ) : (
              <p className="text-[13px] text-[#8C7A6A]">Adres bilgisi yok.</p>
            )}
          </DetailSection>

          <DetailSection title="Ürünler">
            <div className="divide-y divide-[#F4EEE6]">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#3D2B1F]">{item.productName}</p>
                      <p className="mt-0.5 text-[12px] text-[#8C7A6A]">
                        {item.variantLabel} · {item.quantity}
                        {item.unitPrice != null ? ` × ${formatPrice(item.unitPrice, item.currency)}` : ' adet'}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-bold text-[#3D2B1F]">
                      {formatPrice(item.lineTotal, item.currency)}
                    </p>
                  </div>
                  <div className="mt-2.5 h-[352px] w-[288px] max-w-full overflow-hidden rounded-[10px] border border-[#ECE3D6] bg-[#F4EEE6]">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#C4B5A5]">
                        <svg className="h-9 w-9" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
                          <rect x="3" y="3" width="14" height="14" rx="2" />
                          <circle cx="7.5" cy="7.5" r="1.5" />
                          <path d="M4 14l4-4 3 3 2-2 3 3" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>

          {order.status === 'CANCELLED' && order.cancellationReason ? (
            <DetailSection title="İptal Nedeni">
              <p className="text-[13px] leading-relaxed text-[#8A1A1A]">{order.cancellationReason}</p>
            </DetailSection>
          ) : null}

          {order.notes ? (
            <DetailSection title="Not">
              <p className="text-[13px] leading-relaxed text-[#8C7A6A]">{order.notes}</p>
            </DetailSection>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[#ECE3D6] bg-[#FAF6F1] p-4">
      <h3 className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#A89070]">{title}</h3>
      {children}
    </section>
  )
}
