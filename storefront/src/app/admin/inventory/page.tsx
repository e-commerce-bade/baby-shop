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

interface ProductVariant {
  id: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  price: number | string
  currency: string
  active: boolean
}

interface AdminProduct {
  id: number
  name: string
  slug: string
  active: boolean
  categoryName: string | null
  minPrice: number | string | null
  currency: string
  primaryImageUrl: string | null
  variants: ProductVariant[]
}

interface InventoryRow {
  productId: number
  productName: string
  productActive: boolean
  categoryName: string | null
  imageUrl: string | null
  variantId: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  price: number | string
  currency: string
  active: boolean
}

type StockFilter = 'all' | 'low' | 'out' | 'inactive'

const LOW_STOCK_LIMIT = 5

function ProductImage({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return <img src={src} alt={name} className="h-10 w-10 rounded-[8px] object-cover" />
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#F4EEE6] text-[#C4B5A5]">
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 2L2 6v8l8 4 8-4V6L10 2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 6l8 4 8-4M10 10v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function stockState(row: InventoryRow) {
  if (!row.active || !row.productActive) {
    return { label: 'Pasif', className: 'bg-[#FAF6F1] text-[#8C7A6A]' }
  }
  if (row.stockQuantity === 0) {
    return { label: 'Tükendi', className: 'bg-[#FEEAEA] text-[#8A1A1A]' }
  }
  if (row.stockQuantity <= LOW_STOCK_LIMIT) {
    return { label: `Az Stok (${row.stockQuantity})`, className: 'bg-[#FFF8EC] text-[#9A7020]' }
  }
  return { label: `Stokta (${row.stockQuantity})`, className: 'bg-[#EDF7F1] text-[#1A6640]' }
}

function StockBadge({ row }: { row: InventoryRow }) {
  const state = stockState(row)
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${state.className}`}>
      {state.label}
    </span>
  )
}

function flattenProducts(products: AdminProduct[]): InventoryRow[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({
      productId: product.id,
      productName: product.name,
      productActive: product.active,
      categoryName: product.categoryName,
      imageUrl: product.primaryImageUrl,
      variantId: variant.id,
      sku: variant.sku,
      sizeLabel: variant.sizeLabel,
      colorName: variant.colorName,
      stockQuantity: variant.stockQuantity,
      price: variant.price,
      currency: variant.currency,
      active: variant.active,
    })),
  )
}

export default function AdminInventoryPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')
  const [draftStocks, setDraftStocks] = useState<Record<number, string>>({})
  const [updatingVariantId, setUpdatingVariantId] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    async function loadInventory() {
      setLoading(true)
      setError(null)
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

        if (!profileResponse.ok) {
          setForbidden(true)
          return
        }

        const loadedProfile = (await profileResponse.json()) as AdminProfile
        if (!loadedProfile.roles?.includes('ADMIN')) {
          setForbidden(true)
          return
        }

        const productsResponse = await fetch('/api/admin/products', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        const payload = await productsResponse.json().catch(() => null)
        if (!productsResponse.ok) {
          throw new Error(payload?.message ?? 'Stok verileri yüklenemedi.')
        }

        if (!active) return
        setProfile(loadedProfile)
        setProducts(payload as AdminProduct[])
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Stok verileri yüklenemedi.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInventory()
    return () => {
      active = false
    }
  }, [router])

  const rows = useMemo(() => flattenProducts(products), [products])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (q) {
        const haystack = [
          row.productName,
          row.sku,
          row.categoryName,
          row.sizeLabel,
          row.colorName,
        ].filter(Boolean).join(' ').toLowerCase()

        if (!haystack.includes(q)) return false
      }

      if (filter === 'low') return row.active && row.productActive && row.stockQuantity > 0 && row.stockQuantity <= LOW_STOCK_LIMIT
      if (filter === 'out') return row.active && row.productActive && row.stockQuantity === 0
      if (filter === 'inactive') return !row.active || !row.productActive
      return true
    })
  }, [filter, rows, search])

  const metrics = useMemo(() => {
    const activeRows = rows.filter((row) => row.active && row.productActive)
    const totalStock = activeRows.reduce((total, row) => total + row.stockQuantity, 0)
    const lowStock = activeRows.filter((row) => row.stockQuantity > 0 && row.stockQuantity <= LOW_STOCK_LIMIT).length
    const outOfStock = activeRows.filter((row) => row.stockQuantity === 0).length
    const inactive = rows.length - activeRows.length

    return { totalStock, lowStock, outOfStock, inactive, variantCount: rows.length }
  }, [rows])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  function draftValue(row: InventoryRow) {
    return draftStocks[row.variantId] ?? String(row.stockQuantity)
  }

  function setDraft(row: InventoryRow, value: string) {
    setNotice(null)
    setDraftStocks((current) => ({ ...current, [row.variantId]: value }))
  }

  async function updateStock(row: InventoryRow) {
    const nextStock = Number.parseInt(draftValue(row), 10)

    if (Number.isNaN(nextStock) || nextStock < 0) {
      setError('Stok değeri sıfır veya daha büyük bir sayı olmalı.')
      return
    }

    setError(null)
    setNotice(null)
    setUpdatingVariantId(row.variantId)

    try {
      const response = await fetch(
        `/api/admin/products/${row.productId}/variants/${row.variantId}/stock`,
        {
          method: 'PATCH',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: nextStock }),
        },
      )

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Stok güncellenemedi.')
      }

      const updatedVariant = payload as ProductVariant
      setProducts((current) =>
        current.map((product) => product.id === row.productId
          ? {
              ...product,
              variants: product.variants.map((variant) => variant.id === row.variantId ? updatedVariant : variant),
            }
          : product),
      )
      setDraftStocks((current) => {
        const next = { ...current }
        delete next[row.variantId]
        return next
      })
      setNotice(`${row.productName} stoğu güncellendi.`)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Stok güncellenemedi.')
    } finally {
      setUpdatingVariantId(null)
    }
  }

  function exportRows() {
    const csvRows = [
      ['Ürün', 'SKU', 'Kategori', 'Beden', 'Renk', 'Stok', 'Durum', 'Fiyat'],
      ...filteredRows.map((row) => [
        row.productName,
        row.sku ?? '',
        row.categoryName ?? '',
        row.sizeLabel,
        row.colorName,
        String(row.stockQuantity),
        stockState(row).label,
        formatPrice(row.price, row.currency),
      ]),
    ]

    const csv = csvRows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventory.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Stok verileri yükleniyor...</p>
          </div>
        </div>
      </AdminShell>
    )
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
          <h1 className="text-[26px] font-bold text-[#3D2B1F]">Stok / Envanter</h1>
          <p className="mt-0.5 text-[13px] text-[#B5A090]">
            Ürün varyant stoklarını takip edin ve hızlıca güncelleyin.
          </p>
        </div>
        <button
          type="button"
          disabled={filteredRows.length === 0}
          onClick={exportRows}
          className="hidden items-center gap-2 rounded-[10px] border border-[#ECE3D6] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 10v2.5a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V10M8 1v9M5 7l3 3 3-3" />
          </svg>
          Dışa Aktar
        </button>
      </div>

      <section className="mb-5 grid grid-cols-4 gap-3 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
        <MetricCard label="Toplam Stok" value={metrics.totalStock} hint={`${metrics.variantCount} varyant`} />
        <MetricCard label="Az Stok" value={metrics.lowStock} hint={`≤ ${LOW_STOCK_LIMIT} adet`} tone="warning" />
        <MetricCard label="Tükenen" value={metrics.outOfStock} hint="aktif varyant" tone="danger" />
        <MetricCard label="Pasif" value={metrics.inactive} hint="ürün veya varyant" />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Ürün, SKU, renk veya beden ara..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-[10px] border border-[#ECE3D6] bg-white py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
          />
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as StockFilter)}
          className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
        >
          <option value="all">Tüm Stoklar</option>
          <option value="low">Az Stok</option>
          <option value="out">Tükenen</option>
          <option value="inactive">Pasif</option>
        </select>

        {(search || filter !== 'all') ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setFilter('all')
            }}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#5B4839] transition-colors hover:bg-[#FAF6F1]"
          >
            Filtreleri Temizle
          </button>
        ) : null}

        <span className="ml-auto text-[12.5px] text-[#B5A090]">
          {filteredRows.length} varyant gösteriliyor
        </span>
      </div>

      {notice ? (
        <div className="mb-4 rounded-[10px] bg-[#EDF7F1] px-4 py-3 text-[13px] font-semibold text-[#1A6640]">{notice}</div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      ) : null}

      <section className="mb-5 rounded-[16px] border border-[#ECE3D6] bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-[#3D2B1F]">Kritik Stok Uyarıları</h2>
            <p className="mt-0.5 text-[12px] text-[#B5A090]">Azalan veya tükenen aktif varyantlar.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
          {rows
            .filter((row) => row.active && row.productActive && row.stockQuantity <= LOW_STOCK_LIMIT)
            .slice(0, 3)
            .map((row) => (
              <div key={row.variantId} className="flex items-center gap-3 rounded-[12px] border border-[#F4EEE6] bg-[#FAF6F1] p-3">
                <ProductImage src={row.imageUrl} name={row.productName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[#3D2B1F]">{row.productName}</p>
                  <p className="text-[11.5px] text-[#A89070]">{row.sizeLabel} / {row.colorName}</p>
                </div>
                <StockBadge row={row} />
              </div>
            ))}
          {rows.filter((row) => row.active && row.productActive && row.stockQuantity <= LOW_STOCK_LIMIT).length === 0 ? (
            <div className="col-span-full rounded-[12px] border border-dashed border-[#D5C9BA] px-4 py-6 text-center text-[13px] text-[#B5A090]">
              Kritik stok uyarısı bulunmuyor.
            </div>
          ) : null}
        </div>
      </section>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#ECE3D6] bg-white lg:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#ECE3D6] bg-[#FAF6F1] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#A89070]">
              <th className="px-4 py-3.5">Ürün</th>
              <th className="px-4 py-3.5">Varyant</th>
              <th className="px-4 py-3.5">SKU</th>
              <th className="px-4 py-3.5">Kategori</th>
              <th className="px-4 py-3.5">Fiyat</th>
              <th className="px-4 py-3.5">Durum</th>
              <th className="px-4 py-3.5 text-right">Stok</th>
              <th className="px-4 py-3.5 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EEE6]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-[13px] text-[#B5A090]">
                  Arama kriterlerine uygun stok kaydı bulunamadı.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <InventoryTableRow
                  key={row.variantId}
                  row={row}
                  draftValue={draftValue(row)}
                  updating={updatingVariantId === row.variantId}
                  onDraftChange={(value) => setDraft(row, value)}
                  onSave={() => void updateStock(row)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {filteredRows.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#D5C9BA] bg-white px-5 py-12 text-center text-[13px] text-[#B5A090]">
            Arama kriterlerine uygun stok kaydı bulunamadı.
          </div>
        ) : (
          filteredRows.map((row) => (
            <InventoryMobileCard
              key={row.variantId}
              row={row}
              draftValue={draftValue(row)}
              updating={updatingVariantId === row.variantId}
              onDraftChange={(value) => setDraft(row, value)}
              onSave={() => void updateStock(row)}
            />
          ))
        )}
      </div>
    </AdminShell>
  )
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: number
  hint: string
  tone?: 'default' | 'warning' | 'danger'
}) {
  const colors = {
    default: 'bg-[#F4EEE6] text-[#5B4839]',
    warning: 'bg-[#FFF8EC] text-[#9A7020]',
    danger: 'bg-[#FEEAEA] text-[#8A1A1A]',
  }

  return (
    <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#A89070]">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[28px] font-extrabold text-[#3D2B1F]">{value}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${colors[tone]}`}>{hint}</span>
      </div>
    </div>
  )
}

function InventoryTableRow({
  row,
  draftValue,
  updating,
  onDraftChange,
  onSave,
}: {
  row: InventoryRow
  draftValue: string
  updating: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
}) {
  const changed = draftValue !== String(row.stockQuantity)

  return (
    <tr className="transition-colors hover:bg-[#FAF6F1]">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <ProductImage src={row.imageUrl} name={row.productName} />
          <div>
            <p className="font-semibold text-[#3D2B1F]">{row.productName}</p>
            <p className="text-[11.5px] text-[#A89070]">ID #{row.productId}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-[#6B5747]">{row.sizeLabel} / {row.colorName}</td>
      <td className="px-4 py-3.5 text-[#8C7A6A]">{row.sku ?? '-'}</td>
      <td className="px-4 py-3.5 text-[#8C7A6A]">{row.categoryName ?? '-'}</td>
      <td className="px-4 py-3.5 font-semibold text-[#3D2B1F]">{formatPrice(row.price, row.currency)}</td>
      <td className="px-4 py-3.5"><StockBadge row={row} /></td>
      <td className="px-4 py-3.5 text-right">
        <input
          type="number"
          min={0}
          value={draftValue}
          onChange={(event) => onDraftChange(event.target.value)}
          className="h-9 w-24 rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-right text-[13px] font-semibold text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
        />
      </td>
      <td className="px-4 py-3.5 text-right">
        <button
          type="button"
          disabled={!changed || updating}
          onClick={onSave}
          className="rounded-[9px] bg-[#C07B5A] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updating ? 'Kaydediliyor' : 'Kaydet'}
        </button>
      </td>
    </tr>
  )
}

function InventoryMobileCard({
  row,
  draftValue,
  updating,
  onDraftChange,
  onSave,
}: {
  row: InventoryRow
  draftValue: string
  updating: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
}) {
  const changed = draftValue !== String(row.stockQuantity)

  return (
    <article className="rounded-[14px] border border-[#ECE3D6] bg-white p-4">
      <div className="flex items-start gap-3">
        <ProductImage src={row.imageUrl} name={row.productName} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#3D2B1F]">{row.productName}</p>
          <p className="mt-0.5 text-[11.5px] text-[#A89070]">{row.sizeLabel} / {row.colorName}</p>
          <p className="mt-0.5 text-[11.5px] text-[#C4B5A5]">{row.sku ?? 'SKU yok'}</p>
        </div>
        <StockBadge row={row} />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        <input
          type="number"
          min={0}
          value={draftValue}
          onChange={(event) => onDraftChange(event.target.value)}
          className="h-10 rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[13px] font-semibold text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
        />
        <button
          type="button"
          disabled={!changed || updating}
          onClick={onSave}
          className="rounded-[9px] bg-[#C07B5A] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updating ? '...' : 'Kaydet'}
        </button>
      </div>
    </article>
  )
}
