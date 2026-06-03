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

interface AdminOrder {
  id: number
  orderNumber: string
  status: OrderStatus
  customerEmail: string
  customerFirstName: string | null
  customerLastName: string | null
  customerPhone: string | null
  totalAmount: number | string
  currency: string
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
    quantity: number
    lineTotal: number | string
    currency: string
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
  PAID: { label: 'Ödendi', bg: '#EDF7F1', color: '#1A6640', dotColor: '#27AE60' },
  PREPARING: { label: 'Hazırlanıyor', bg: '#FFF8EC', color: '#9A7020', dotColor: '#D4A017' },
  SHIPPED: { label: 'Kargoda', bg: '#EBF4FF', color: '#1A4E8A', dotColor: '#2E86DE' },
  DELIVERED: { label: 'Teslim Edildi', bg: '#EDF7F1', color: '#1A6640', dotColor: '#27AE60' },
  CANCELLED: { label: 'İptal Edildi', bg: '#FEEAEA', color: '#8A1A1A', dotColor: '#E74C3C' },
} as const

type OrderStatus = keyof typeof STATUS_CONFIG
type StatusKey = 'all' | OrderStatus

const STATUS_TABS: Array<{ key: StatusKey; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'PENDING_PAYMENT', label: 'Ödeme Bekliyor' },
  { key: 'PAID', label: 'Ödendi' },
  { key: 'PREPARING', label: 'Hazırlanıyor' },
  { key: 'SHIPPED', label: 'Kargoda' },
  { key: 'DELIVERED', label: 'Teslim' },
  { key: 'CANCELLED', label: 'İptal' },
]

const STATUS_OPTIONS = STATUS_TABS.filter((tab): tab is { key: OrderStatus; label: string } => tab.key !== 'all')

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

function getStatus(status: string) {
  return STATUS_CONFIG[status.toUpperCase() as OrderStatus] ?? {
    label: status,
    bg: '#F4EEE6',
    color: '#5B4839',
    dotColor: '#A89070',
  }
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

export default function AdminOrdersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [page, setPage] = useState<PageResponse<AdminOrder> | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [updatingOrderNumber, setUpdatingOrderNumber] = useState<string | null>(null)

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

  useEffect(() => {
    setCurrentPage(0)
  }, [search, statusFilter])

  useEffect(() => {
    if (!profile) return
    let active = true

    async function fetchOrders() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: String(currentPage), size: String(PAGE_SIZE) })
        const q = search.trim()

        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (q) params.set('orderNumber', q)

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
  }, [profile, currentPage, statusFilter, search])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  const orders = page?.content ?? []

  async function updateOrderStatus(order: AdminOrder, nextStatus: OrderStatus) {
    if (order.status === nextStatus) return

    setUpdatingOrderNumber(order.orderNumber)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}/status`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
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

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'orders.csv'
    link.click()
    URL.revokeObjectURL(url)
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

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] max-w-sm flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Sipariş no ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-[#ECE3D6] bg-white py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
          />
        </div>
        {(search || statusFilter !== 'all') ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
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
              {search || statusFilter !== 'all' ? 'Sonuç bulunamadı.' : 'Henüz sipariş bulunmuyor.'}
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
                      <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
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
                    <StatusBadge status={order.status} />
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

        <div className="space-y-5 px-6 py-5">
          <DetailSection title="Müşteri">
            <p className="font-semibold text-[#3D2B1F]">{customerName(order)}</p>
            <p className="mt-1 text-[13px] text-[#8C7A6A]">{order.customerEmail}</p>
            {order.customerPhone ? <p className="mt-1 text-[13px] text-[#8C7A6A]">{order.customerPhone}</p> : null}
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
                <div key={item.id} className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[13px] font-semibold text-[#3D2B1F]">{item.productName}</p>
                    <p className="mt-0.5 text-[12px] text-[#8C7A6A]">{item.variantLabel} x {item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-[13px] font-bold text-[#3D2B1F]">
                    {formatPrice(item.lineTotal, item.currency)}
                  </p>
                </div>
              ))}
            </div>
          </DetailSection>

          <DetailSection title="Özet">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#8C7A6A]">Durum</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] text-[#8C7A6A]">Toplam</span>
              <span className="font-bold text-[#3D2B1F]">{formatPrice(order.totalAmount, order.currency)}</span>
            </div>
          </DetailSection>

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
