'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/lib/utils'

interface OrderHit {
  orderNumber: string
  status: string
  customerFirstName: string | null
  customerLastName: string | null
  customerPhone: string | null
  totalAmount: number | string
  currency: string
}

interface ProductHit {
  id: number
  name: string
  active: boolean
  minPrice: number | string | null
  currency: string
  primaryImageUrl: string | null
  variants: Array<{ stockQuantity: number }>
}

interface CustomerHit {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
}

interface SearchResults {
  orders: OrderHit[]
  products: ProductHit[]
  customers: CustomerHit[]
}

const MIN_QUERY_LENGTH = 2

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Ödeme Bekliyor',
  PAID: 'Onaylandı',
  PREPARING: 'Hazırlanıyor',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal Edildi',
  EXPIRED: 'Ödenmedi',
}

function fullName(first: string | null, last: string | null, fallback: string) {
  return [first, last].filter(Boolean).join(' ') || fallback
}

/**
 * Admin ust cubugundaki genel arama: yazilan metni siparislerde (no, musteri adi, telefon, e-posta),
 * urunlerde (ad, marka, SKU) ve kayitli musterilerde arar; sonuca tiklaninca ilgili sayfa o kayitla acilir.
 */
export default function AdminSearchBox() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const [value, setValue] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  // Sonuclarin hangi metin icin geldigi: yazmaya devam edilirken eski sonuclar gorunur kalir ama
  // Enter onlara gitmez ve "sonuc yok" yeni metin icin soylenmez.
  const [resultsFor, setResultsFor] = useState('')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  const query = value.trim()
  const searchable = query.length >= MIN_QUERY_LENGTH
  const current = results !== null && resultsFor === query

  useEffect(() => {
    if (!searchable) {
      requestId.current += 1
      setResults(null)
      setResultsFor('')
      setLoading(false)
      return
    }

    const id = ++requestId.current
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error('search failed')
        const payload = (await res.json()) as SearchResults
        if (id !== requestId.current) return
        setResults(payload)
        setResultsFor(query)
        setFailed(false)
      } catch {
        if (id !== requestId.current) return
        setResults(null)
        setResultsFor('')
        setFailed(true)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, searchable])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const encoded = encodeURIComponent(query)
  const orderHref = (order: OrderHit) => `/admin/orders?q=${encodeURIComponent(order.orderNumber)}`
  const productHref = (product: ProductHit) => `/admin/products?open=${product.id}`
  const customerHref = (customer: CustomerHit) => `/admin/customers?q=${encodeURIComponent(customer.email)}`

  function firstResultHref() {
    if (!results || !current) return null
    if (results.orders[0]) return orderHref(results.orders[0])
    if (results.products[0]) return productHref(results.products[0])
    if (results.customers[0]) return customerHref(results.customers[0])
    return null
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && searchable) {
      event.preventDefault()
      // Bu metnin sonuclari gelmisse ilkine, henuz gelmemisse siparis aramasina gider.
      router.push(firstResultHref() ?? `/admin/orders?q=${encoded}`)
      setOpen(false)
    }
  }

  // Esc panelin icindeyken de kapatir ve odagi kutuya geri verir; odak panelin disina cikinca
  // (Tab ile) panel kapanir.
  function handleContainerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      inputRef.current?.focus()
    }
  }

  function handleContainerBlur(event: React.FocusEvent<HTMLDivElement>) {
    // Hedefi olmayan odak kaybi (orn. Safari'de baglantiya tiklamak odagi tasimaz) paneli kapatmaz;
    // aksi halde tiklanan sonuc, tiklama tamamlanmadan kaybolurdu. Disari tiklama ayrica yakalanir.
    const next = event.relatedTarget as Node | null
    if (next && !containerRef.current?.contains(next)) setOpen(false)
  }

  const hasResults = results !== null && results.orders.length + results.products.length + results.customers.length > 0
  const itemClass = 'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#FAF6F1]'
  const groupTitleClass = 'px-4 pb-1 pt-3 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#C4B5A5]'

  return (
    <div ref={containerRef} className="relative max-w-xs flex-1" onKeyDown={handleContainerKeyDown} onBlur={handleContainerBlur}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => { setValue(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Sipariş, ürün, müşteri ara..."
        aria-label="Sipariş, ürün veya müşteri ara"
        aria-expanded={open && searchable}
        aria-controls="admin-search-results"
        className="w-full rounded-[10px] border border-[#ECE3D6] bg-[#FAF6F1] py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] transition-colors focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
      />

      {open && searchable ? (
        <div
          id="admin-search-results"
          role="region"
          aria-label="Arama sonuçları"
          aria-busy={loading}
          // Panelin bos bir yerine tiklamak odagi panelde tutar (disari cikmis sayilip kapanmaz).
          tabIndex={-1}
          className="z-50 max-h-[72vh] overflow-y-auto rounded-[14px] outline-none border border-[#ECE3D6] bg-white pb-1.5 shadow-[0_18px_42px_-22px_rgba(91,72,57,.45)] max-lg:fixed max-lg:inset-x-3 max-lg:top-[58px] lg:absolute lg:left-0 lg:top-11 lg:w-[460px]"
        >
          {results === null ? (
            <p role="status" className="px-4 py-4 text-[13px] text-[#B5A090]">
              {failed && !loading ? 'Arama yapılamadı. Lütfen tekrar deneyin.' : 'Aranıyor...'}
            </p>
          ) : !hasResults ? (
            <p role="status" className="px-4 py-4 text-[13px] text-[#B5A090]">
              {current ? `“${query}” için sonuç bulunamadı.` : 'Aranıyor...'}
            </p>
          ) : (
            <>
              {results.orders.length > 0 ? (
                <>
                  <p className={groupTitleClass}>Siparişler</p>
                  {results.orders.map((order) => (
                    <Link key={order.orderNumber} href={orderHref(order)} onClick={() => setOpen(false)} className={itemClass}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#3D2B1F]">
                          {fullName(order.customerFirstName, order.customerLastName, 'Misafir müşteri')}
                        </p>
                        <p className="truncate text-[11.5px] text-[#B5A090]">
                          {order.orderNumber}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold text-[#3D2B1F]">{formatPrice(order.totalAmount, order.currency)}</p>
                        <p className="text-[11px] text-[#A89070]">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                      </div>
                    </Link>
                  ))}
                </>
              ) : null}

              {results.products.length > 0 ? (
                <>
                  <p className={groupTitleClass}>Ürünler</p>
                  {results.products.map((product) => (
                    <Link key={product.id} href={productHref(product)} onClick={() => setOpen(false)} className={itemClass}>
                      {product.primaryImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.primaryImageUrl} alt="" className="h-10 w-10 shrink-0 rounded-[8px] object-cover" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-[8px] bg-[#F4EEE6]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#3D2B1F]">{product.name}</p>
                        <p className="truncate text-[11.5px] text-[#B5A090]">
                          {product.variants.length} varyant · stok {product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)}
                          {product.active ? '' : ' · Pasif'}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-bold text-[#3D2B1F]">
                        {formatPrice(product.minPrice ?? 0, product.currency)}
                      </p>
                    </Link>
                  ))}
                </>
              ) : null}

              {results.customers.length > 0 ? (
                <>
                  <p className={groupTitleClass}>Müşteriler</p>
                  {results.customers.map((customer) => (
                    <Link key={customer.id} href={customerHref(customer)} onClick={() => setOpen(false)} className={itemClass}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#3D2B1F]">
                          {fullName(customer.firstName, customer.lastName, customer.email)}
                        </p>
                        <p className="truncate text-[11.5px] text-[#B5A090]">
                          {customer.email}{customer.phoneNumber ? ` · ${customer.phoneNumber}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </>
              ) : null}
            </>
          )}

          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#F4EEE6] px-4 pt-2.5 text-[12px] font-semibold text-[#C07B5A]">
            <Link href={`/admin/orders?q=${encoded}`} onClick={() => setOpen(false)} className="hover:underline">Siparişlerde ara</Link>
            <Link href={`/admin/products?q=${encoded}`} onClick={() => setOpen(false)} className="hover:underline">Ürünlerde ara</Link>
            <Link href={`/admin/customers?q=${encoded}`} onClick={() => setOpen(false)} className="hover:underline">Müşterilerde ara</Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
