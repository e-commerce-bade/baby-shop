'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import ImageLightbox from '@/components/admin/ImageLightbox'
import MultiSelect from '@/components/admin/MultiSelect'
import { downloadCsv } from '@/lib/csv'
import { PRICE_INPUT_HINT, STOCK_INPUT_HINT, parsePriceInput, parseStockInput } from '@/lib/numberInput'
import { BABY_MONTH_SIZES, KIDS_AGE_SIZES, compareSizeLabels, sizeOptionsForCategory } from '@/lib/sizes'
import { STOCK_CONFLICT_HINT, readStockConflicts, type StockConflict } from '@/lib/stockConflict'
import { foldForSearch, formatPrice } from '@/lib/utils'

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
  compareAtPrice?: number | string | null
  currency: string
  active: boolean
}

interface AdminProduct {
  id: number
  name: string
  slug: string
  active: boolean
  brand?: string | null
  productType?: string | null
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
  brand: string | null
  productType: string | null
  categoryName: string | null
  imageUrl: string | null
  variantId: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  price: number | string
  compareAtPrice: number | string | null
  currency: string
  active: boolean
}

type StatusFilter = 'all' | 'active' | 'inactive'
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

interface VariantEditForm {
  sku: string
  sizeLabel: string
  colorName: string
  stockQuantity: string
  price: string
  currency: string
  active: boolean
}

const LOW_STOCK_LIMIT = 5
const PAGE_SIZE = 100

// `onOpen` verilirse kucuk gorsel tiklanabilir olur ve buyuk onizlemeyi acar.
function ProductImage({ src, name, onOpen }: { src: string | null; name: string; onOpen?: () => void }) {
  if (src && onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title="Görseli büyüt"
        aria-label={`${name} görselini büyüt`}
        className="shrink-0 cursor-zoom-in rounded-[8px] ring-[#C07B5A] transition-shadow hover:ring-2 focus-visible:outline-none focus-visible:ring-2"
      >
        <img src={src} alt={name} className="h-10 w-10 rounded-[8px] object-cover" />
      </button>
    )
  }
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

function flattenProduct(product: AdminProduct): InventoryRow[] {
  return product.variants.map((variant) => ({
    productId: product.id,
    productName: product.name,
    productActive: product.active,
    brand: product.brand ?? null,
    productType: product.productType ?? null,
    categoryName: product.categoryName,
    imageUrl: product.primaryImageUrl,
    variantId: variant.id,
    sku: variant.sku,
    sizeLabel: variant.sizeLabel,
    colorName: variant.colorName,
    stockQuantity: variant.stockQuantity,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice ?? null,
    currency: variant.currency,
    active: variant.active,
  }))
}

// Masaustu tablosu ile mobil kartlar ayni anda degil, ekrana gore yalnizca biri cizilir
// (1.300+ varyantta iki kopya, her tus vurusunu gozle gorulur sekilde yavaslatiyordu).
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isDesktop
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  // Coklu secim filtreleri: bos dizi = filtre yok; doluysa secilenlerden herhangi birine uyanlar.
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [productTypeFilter, setProductTypeFilter] = useState<string[]>([])
  const [sizeFilter, setSizeFilter] = useState<string[]>([])
  const [colorFilter, setColorFilter] = useState<string[]>([])
  const [brandFilter, setBrandFilter] = useState<string[]>([])
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [draftStocks, setDraftStocks] = useState<Record<number, string>>({})
  // Tek satir kaydi suren varyantlar (Enter ile art arda birkac satir kaydedilebilir).
  const [updatingIds, setUpdatingIds] = useState<ReadonlySet<number>>(new Set())
  const [editingRow, setEditingRow] = useState<InventoryRow | null>(null)
  const [editForm, setEditForm] = useState<VariantEditForm | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  // Toplu islemler: isaretlenen varyantlar, onlara verilecek stok ve suren toplu istek.
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkStock, setBulkStock] = useState('')
  const [bulkSize, setBulkSize] = useState('')
  const [bulkBusy, setBulkBusy] = useState<'save' | 'delete' | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const listTopRef = useRef<HTMLDivElement>(null)
  const [previewRow, setPreviewRow] = useState<InventoryRow | null>(null)

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

  const isDesktop = useIsDesktop()

  // Satir nesneleri urun bazinda onbelleklenir: bir kayittan sonra yalnizca degisen urunun
  // satirlari yeni nesne olur, digerleri ayni kalir ve (memo sayesinde) yeniden cizilmez.
  const rowCache = useRef(new WeakMap<AdminProduct, InventoryRow[]>())
  const rows = useMemo(() => products.flatMap((product) => {
    let productRows = rowCache.current.get(product)
    if (!productRows) {
      productRows = flattenProduct(product)
      rowCache.current.set(product, productRows)
    }
    return productRows
  }), [products])

  const filterOptions = useMemo(() => {
    const categories = new Set<string>()
    const productTypes = new Set<string>()
    const sizes = new Set<string>()
    const colors = new Set<string>()
    const brands = new Set<string>()

    rows.forEach((row) => {
      if (row.categoryName) categories.add(row.categoryName)
      if (row.productType) productTypes.add(row.productType)
      if (row.sizeLabel) sizes.add(row.sizeLabel)
      if (row.colorName) colors.add(row.colorName)
      if (row.brand) brands.add(row.brand)
    })

    return {
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b, 'tr')),
      productTypes: Array.from(productTypes).sort((a, b) => a.localeCompare(b, 'tr')),
      sizes: Array.from(sizes).sort(compareSizeLabels),
      colors: Array.from(colors).sort((a, b) => a.localeCompare(b, 'tr')),
      brands: Array.from(brands).sort((a, b) => a.localeCompare(b, 'tr')),
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    // Buyuk/kucuk harf ve Turkce karakter duyarsiz ("kiz" = "Kız", "GARNİLİ" = "garnili").
    const q = foldForSearch(search.trim())
    const minPrice = minPriceFilter === '' ? null : Number(minPriceFilter)
    const maxPrice = maxPriceFilter === '' ? null : Number(maxPriceFilter)

    return rows.filter((row) => {
      const isActive = row.active && row.productActive
      const price = Number(row.price)

      if (q) {
        const haystack = foldForSearch([
          row.productName,
          row.sku,
          row.brand,
          row.categoryName,
          row.productType,
          row.sizeLabel,
          row.colorName,
        ].filter(Boolean).join(' '))

        if (!haystack.includes(q)) return false
      }

      if (statusFilter === 'active' && !isActive) return false
      if (statusFilter === 'inactive' && isActive) return false
      if (stockFilter === 'in_stock' && (!isActive || row.stockQuantity <= 0)) return false
      if (stockFilter === 'low_stock' && (!isActive || row.stockQuantity <= 0 || row.stockQuantity > LOW_STOCK_LIMIT)) return false
      if (stockFilter === 'out_of_stock' && (!isActive || row.stockQuantity !== 0)) return false
      if (categoryFilter.length > 0 && !categoryFilter.includes(row.categoryName ?? '')) return false
      if (productTypeFilter.length > 0 && !productTypeFilter.includes(row.productType ?? '')) return false
      if (sizeFilter.length > 0 && !sizeFilter.includes(row.sizeLabel)) return false
      if (colorFilter.length > 0 && !colorFilter.includes(row.colorName)) return false
      if (brandFilter.length > 0 && !brandFilter.includes(row.brand ?? '')) return false
      if (minPrice !== null && Number.isFinite(minPrice) && (!Number.isFinite(price) || price < minPrice)) return false
      if (maxPrice !== null && Number.isFinite(maxPrice) && (!Number.isFinite(price) || price > maxPrice)) return false
      return true
    })
  }, [
    brandFilter,
    categoryFilter,
    colorFilter,
    maxPriceFilter,
    minPriceFilter,
    productTypeFilter,
    rows,
    search,
    sizeFilter,
    statusFilter,
    stockFilter,
  ])

  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'all' ||
    stockFilter !== 'all' ||
    categoryFilter.length > 0 ||
    productTypeFilter.length > 0 ||
    sizeFilter.length > 0 ||
    colorFilter.length > 0 ||
    brandFilter.length > 0 ||
    minPriceFilter ||
    maxPriceFilter,
  )

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setStockFilter('all')
    setCategoryFilter([])
    setProductTypeFilter([])
    setSizeFilter([])
    setColorFilter([])
    setBrandFilter([])
    setMinPriceFilter('')
    setMaxPriceFilter('')
  }

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

  // Satirlara verilen islevler sabit kimlikli olmali; aksi halde her tus vurusunda tum satirlar
  // yeniden cizilir.
  const setDraft = useCallback((variantId: number, value: string) => {
    setNotice(null)
    setDraftStocks((current) => ({ ...current, [variantId]: value }))
  }, [])

  // Kayit, liste acildiktan sonra stok degistigi icin (yeni siparis, iptal) reddedildi: listedeki
  // stoklar guncel degerlerle yenilenir, yazilan taslaklar korunur; "Kaydet" tekrar basilinca
  // taslak guncel stogun uzerine yazilir.
  const applyCurrentStocks = useCallback((conflicts: StockConflict[]) => {
    const current = new Map(conflicts.map((conflict) => [conflict.variantId, conflict.currentStockQuantity]))
    setProducts((products) => products.map((product) => (
      product.variants.some((variant) => current.has(variant.id))
        ? {
            ...product,
            variants: product.variants.map((variant) => {
              const stockQuantity = current.get(variant.id)
              return stockQuantity === undefined ? variant : { ...variant, stockQuantity }
            }),
          }
        : product
    )))
  }, [])

  // Stogu degistirilip henuz kaydedilmemis satirlar ("Tümünü Kaydet" bunlari tek istekte yazar).
  const changedRows = useMemo(
    () => rows.filter((row) => {
      const draft = draftStocks[row.variantId]
      return draft !== undefined && draft !== String(row.stockQuantity)
    }),
    [rows, draftStocks],
  )

  // Liste sayfalanir: binlerce satiri ayni anda cizmek eski bilgisayarlarda her tus vurusunu
  // saniyelerce bekletiyordu. Taslaklar ve secim sayfalar arasinda korunur.
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(pageIndex, pageCount - 1)
  const pageRows = useMemo(
    () => filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filteredRows, currentPage],
  )

  useEffect(() => {
    setPageIndex(0)
  }, [search, statusFilter, stockFilter, categoryFilter, productTypeFilter, sizeFilter, colorFilter, brandFilter, minPriceFilter, maxPriceFilter])

  const selectedOnPage = pageRows.filter((row) => selected.has(row.variantId)).length
  const allOnPageSelected = pageRows.length > 0 && selectedOnPage === pageRows.length
  const selectedInFilter = filteredRows.filter((row) => selected.has(row.variantId)).length

  const toggleRow = useCallback((variantId: number) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(variantId)) next.delete(variantId)
      else next.add(variantId)
      return next
    })
  }, [])

  // Basliktaki kutu yalnizca ekrandaki sayfayi secer/birakir; filtredeki tum satirlar icin alttaki
  // cubukta ayri bir "tümünü seç" secenegi cikar (yanlislikla binlerce satir secilmesin).
  function togglePage() {
    setSelected((current) => {
      const next = new Set(current)
      pageRows.forEach((row) => (allOnPageSelected ? next.delete(row.variantId) : next.add(row.variantId)))
      return next
    })
  }

  function selectAllFiltered() {
    setSelected((current) => {
      const next = new Set(current)
      filteredRows.forEach((row) => next.add(row.variantId))
      return next
    })
  }

  function goToPage(nextPage: number) {
    setPageIndex(Math.min(Math.max(nextPage, 0), pageCount - 1))
    listTopRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }

  function applyBulkStock() {
    const value = bulkStock.trim()
    if (value === '') return
    if (Number.isNaN(parseStockInput(value))) {
      setError(STOCK_INPUT_HINT)
      return
    }
    setError(null)
    setNotice(null)
    setDraftStocks((current) => {
      const next = { ...current }
      selected.forEach((variantId) => { next[variantId] = value })
      return next
    })
    setBulkStock('')
  }

  function discardDrafts() {
    // "Geri al", "Tümünü Kaydet"in hemen yaninda: birden fazla degisiklik (belki baska sayfalarda)
    // tek dokunusla kaybolmasin.
    if (changedRows.length > 1 && !window.confirm(
      `${changedRows.length} stok değişikliği kaydedilmeden geri alınacak. Devam edilsin mi?`,
    )) return
    setError(null)
    setDraftStocks({})
  }

  // Kaydedilmemis stok degisikligi varken sayfa yenilenir ya da kapatilirsa tarayici uyarir.
  const hasUnsavedStock = changedRows.length > 0
  useEffect(() => {
    if (!hasUnsavedStock) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedStock])

  // Secili varyantlarin bedenini (farkli urunlerde bile) tek seferde sabit listedeki bir degere
  // cevirir; orn. "3-4", "3-4 Yas" ve "3-4Yaş" yazimlarini "3-4 Yaş"ta birlestirmek icin.
  async function applyBulkSize() {
    if (bulkBusy || !bulkSize || selected.size === 0) return
    const targets = rows.filter((row) => selected.has(row.variantId) && row.sizeLabel !== bulkSize)
    if (targets.length === 0) {
      setError(null)
      setNotice(`Seçili varyantların bedeni zaten "${bulkSize}".`)
      return
    }
    const confirmed = window.confirm(
      `${targets.length} varyantın bedeni "${bulkSize}" olarak değiştirilecek. Devam edilsin mi?`,
    )
    if (!confirmed) return

    setError(null)
    setNotice(null)
    setBulkBusy('save')
    try {
      const response = await fetch('/api/admin/variants', {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: targets.map((row) => ({ id: row.variantId, sizeLabel: bulkSize })) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message ?? 'Bedenler değiştirilemedi.')

      const updated = new Map((payload as ProductVariant[]).map((variant) => [variant.id, variant]))
      setProducts((current) => current.map((product) => (
        product.variants.some((variant) => updated.has(variant.id))
          ? { ...product, variants: product.variants.map((variant) => updated.get(variant.id) ?? variant) }
          : product
      )))
      setNotice(`${updated.size} varyantın bedeni "${bulkSize}" yapıldı.`)
      setBulkSize('')
      // Beden filtresi aciksa yeni bedeni de kapsar; boylece degisen satirlar listede kalir
      // (eski etiketler seceneklerden kalkinca filtreden de kendiliginden duser).
      setSizeFilter((current) => (current.length > 0 && !current.includes(bulkSize) ? [...current, bulkSize] : current))
      setSelected(new Set())
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Bedenler değiştirilemedi.')
    } finally {
      setBulkBusy(null)
    }
  }

  async function saveAllStocks() {
    if (bulkBusy || changedRows.length === 0) return

    const updates = changedRows.map((row) => ({ row, stockQuantity: parseStockInput(draftValue(row)) }))
    const invalid = updates.find((update) => Number.isNaN(update.stockQuantity))
    if (invalid) {
      setError(`${invalid.row.productName} (${invalid.row.sizeLabel} / ${invalid.row.colorName}): ${STOCK_INPUT_HINT}`)
      return
    }

    setError(null)
    setNotice(null)
    setBulkBusy('save')
    try {
      const response = await fetch('/api/admin/variants', {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: updates.map((update) => ({
            id: update.row.variantId,
            stockQuantity: update.stockQuantity,
            // Listenin gosterdigi stok: arada bir siparis stogu degistirdiyse sunucu kaydi reddeder.
            expectedStockQuantity: update.row.stockQuantity,
          })),
        }),
      })
      const payload = await response.json().catch(() => null)
      const conflicts = response.status === 409 ? readStockConflicts(payload) : null
      if (conflicts) {
        applyCurrentStocks(conflicts)
        setError(`${payload?.message ?? 'Stok bu arada değişti.'} ${STOCK_CONFLICT_HINT}`)
        return
      }
      if (!response.ok) throw new Error(payload?.message ?? 'Stoklar güncellenemedi.')

      const updated = new Map((payload as ProductVariant[]).map((variant) => [variant.id, variant]))
      setProducts((current) => current.map((product) => (
        product.variants.some((variant) => updated.has(variant.id))
          ? { ...product, variants: product.variants.map((variant) => updated.get(variant.id) ?? variant) }
          : product
      )))
      setDraftStocks((current) => {
        const next = { ...current }
        updates.forEach((update) => {
          // Istek surerken yeniden degistirilen satirin taslagi korunur.
          if (next[update.row.variantId] === draftValue(update.row)) delete next[update.row.variantId]
        })
        return next
      })
      setNotice(`${updated.size} varyantın stoğu güncellendi.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Stoklar güncellenemedi.')
    } finally {
      setBulkBusy(null)
    }
  }

  async function deleteVariants(variantIds: number[], description: string) {
    if (bulkBusy || variantIds.length === 0) return false
    // Secim sayfalar ve filtreler arasinda korunur; ekranda olmayan secili satirlar da silinecekse
    // bunu acikca soyle.
    const onScreen = new Set(pageRows.map((row) => row.variantId))
    const offScreen = variantIds.filter((variantId) => !onScreen.has(variantId)).length
    const offScreenNote = offScreen > 0
      ? `\n\nDikkat: bunların ${offScreen} tanesi şu an ekranda görünmüyor (başka sayfada ya da filtrenin dışında).`
      : ''
    const confirmed = window.confirm(
      `${description} kalıcı olarak silinecek.${offScreenNote}\n\nBu işlem geri alınamaz. Eski siparişler etkilenmez; sepetlerdeki ilgili satırlar temizlenir. Devam edilsin mi?`,
    )
    if (!confirmed) return false

    setError(null)
    setNotice(null)
    setBulkBusy('delete')
    try {
      const response = await fetch('/api/admin/variants/delete', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: variantIds }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Varyantlar silinemedi.')
      }

      const removed = new Set(variantIds)
      setProducts((current) => current.map((product) => (
        product.variants.some((variant) => removed.has(variant.id))
          ? { ...product, variants: product.variants.filter((variant) => !removed.has(variant.id)) }
          : product
      )))
      setSelected((current) => new Set([...current].filter((variantId) => !removed.has(variantId))))
      setDraftStocks((current) => {
        const next = { ...current }
        removed.forEach((variantId) => { delete next[variantId] })
        return next
      })
      setNotice(`${variantIds.length} varyant silindi.`)
      return true
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Varyantlar silinemedi.')
      return false
    } finally {
      setBulkBusy(null)
    }
  }

  const openImage = useCallback((row: InventoryRow) => setPreviewRow(row), [])

  // Duzenleme paneli acilirken satirda kaydedilmemis bir stok yazilmissa o deger kullanilir;
  // aksi halde panel eski stoku gonderir ve yazilan deger sessizce kaybolurdu.
  const draftStocksRef = useRef(draftStocks)
  useEffect(() => {
    draftStocksRef.current = draftStocks
  }, [draftStocks])

  const openVariantEditor = useCallback((row: InventoryRow) => {
    setError(null)
    setNotice(null)
    setEditingRow(row)
    setEditForm({
      sku: row.sku ?? '',
      sizeLabel: row.sizeLabel,
      colorName: row.colorName,
      stockQuantity: draftStocksRef.current[row.variantId] ?? String(row.stockQuantity),
      price: String(row.price),
      currency: row.currency,
      active: row.active,
    })
  }, [])

  function closeVariantEditor() {
    // Kayit ya da silme surerken kapatilmaz; sonucu (ya da hatasi) panelde gosterilir.
    if (savingEdit || bulkBusy === 'delete') return
    setError(null)
    setEditingRow(null)
    setEditForm(null)
  }

  function applyUpdatedVariant(row: InventoryRow, updatedVariant: ProductVariant) {
    setProducts((current) =>
      current.map((product) => product.id === row.productId
        ? {
            ...product,
            variants: product.variants.map((variant) => variant.id === row.variantId ? updatedVariant : variant),
          }
        : product),
    )
  }

  async function updateVariant() {
    if (!editingRow || !editForm) return

    const stockQuantity = parseStockInput(editForm.stockQuantity)
    const price = parsePriceInput(editForm.price)
    const currency = editForm.currency.trim().toUpperCase()

    if (!editForm.sizeLabel.trim() || !editForm.colorName.trim()) {
      setError('Beden ve renk alanları zorunludur.')
      return
    }

    if (Number.isNaN(stockQuantity)) {
      setError(STOCK_INPUT_HINT)
      return
    }

    if (Number.isNaN(price)) {
      setError(PRICE_INPUT_HINT)
      return
    }

    if (currency.length !== 3) {
      setError('Para birimi 3 karakter olmalı. Örn: TRY')
      return
    }

    setError(null)
    setNotice(null)
    setSavingEdit(true)

    try {
      const response = await fetch(
        `/api/admin/products/${editingRow.productId}/variants/${editingRow.variantId}`,
        {
          method: 'PUT',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: editForm.sku.trim() || null,
            sizeLabel: editForm.sizeLabel.trim(),
            colorName: editForm.colorName.trim(),
            stockQuantity,
            // Panel acildiginda listede gorunen stok: stok elle degistirilmediyse sunucu stoga
            // dokunmaz (arada gelen siparisin dusumu ezilmez); degistirildiyse ve arada stok
            // degismisse kayit reddedilir.
            expectedStockQuantity: editingRow.stockQuantity,
            price,
            // Bu formda duzenlenmez; gonderilmezse backend indirimsiz fiyati siler.
            compareAtPrice: editingRow.compareAtPrice != null ? Number(editingRow.compareAtPrice) : null,
            currency,
            active: editForm.active,
          }),
        },
      )

      const payload = await response.json().catch(() => null)
      const conflicts = response.status === 409 ? readStockConflicts(payload) : null
      if (conflicts) {
        applyCurrentStocks(conflicts)
        const currentStock = conflicts.find((conflict) => conflict.variantId === editingRow.variantId)?.currentStockQuantity
        // Panel acik kalir; tekrar kaydedince yazilan stok guncel degerin uzerine yazilir.
        if (currentStock !== undefined) setEditingRow({ ...editingRow, stockQuantity: currentStock })
        setError(`${payload?.message ?? 'Stok bu arada değişti.'} ${STOCK_CONFLICT_HINT}`)
        return
      }
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Varyant güncellenemedi.')
      }

      const updatedVariant = payload as ProductVariant
      applyUpdatedVariant(editingRow, updatedVariant)
      setDraftStocks((current) => {
        // Satirdaki taslak ancak panelde kaydedilen degerle aynıysa temizlenir; panelden sonra satira
        // baska bir deger yazildiysa korunur.
        if (current[editingRow.variantId] !== editForm.stockQuantity) return current
        const next = { ...current }
        delete next[editingRow.variantId]
        return next
      })
      setNotice(`${editingRow.productName} varyantı güncellendi.`)
      setEditingRow(null)
      setEditForm(null)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Varyant güncellenemedi.')
    } finally {
      setSavingEdit(false)
    }
  }

  const updateStock = useCallback(async (row: InventoryRow, draft: string) => {
    // "Tümünü Kaydet" ile ayni kurallar: "2.5" ya da "1e3" gibi yazimlar reddedilir (eskiden 2 ve 1
    // olarak sessizce kaydediliyordu).
    const nextStock = parseStockInput(draft)

    if (Number.isNaN(nextStock)) {
      setError(`${row.productName} (${row.sizeLabel} / ${row.colorName}): ${STOCK_INPUT_HINT}`)
      return
    }

    setError(null)
    setNotice(null)
    setUpdatingIds((current) => new Set(current).add(row.variantId))

    try {
      const response = await fetch(
        `/api/admin/products/${row.productId}/variants/${row.variantId}/stock`,
        {
          method: 'PATCH',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: nextStock, expectedStockQuantity: row.stockQuantity }),
        },
      )

      const payload = await response.json().catch(() => null)
      const conflicts = response.status === 409 ? readStockConflicts(payload) : null
      if (conflicts) {
        applyCurrentStocks(conflicts)
        setError(`${payload?.message ?? 'Stok bu arada değişti.'} ${STOCK_CONFLICT_HINT}`)
        return
      }
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
        // Istek surerken satira yeni bir deger yazildiysa o taslak korunur.
        if (current[row.variantId] !== draft) return current
        const next = { ...current }
        delete next[row.variantId]
        return next
      })
      setNotice(`${row.productName} stoğu güncellendi.`)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Stok güncellenemedi.')
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current)
        next.delete(row.variantId)
        return next
      })
    }
  }, [applyCurrentStocks])

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

    downloadCsv('inventory.csv', csvRows)
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
      {editingRow && editForm ? (
        <VariantEditDrawer
          row={editingRow}
          form={editForm}
          saving={savingEdit || bulkBusy !== null}
          error={error}
          onChange={setEditForm}
          onClose={closeVariantEditor}
          onSave={() => void updateVariant()}
          onDelete={async () => {
            const row = editingRow
            const deleted = await deleteVariants(
              [row.variantId],
              `"${row.productName}" ürününün ${row.sizeLabel} / ${row.colorName} varyantı`,
            )
            if (deleted) {
              setEditingRow(null)
              setEditForm(null)
            }
          }}
        />
      ) : null}

      {previewRow?.imageUrl ? (
        <ImageLightbox
          images={[{ src: previewRow.imageUrl, alt: previewRow.productName, caption: previewRow.productName }]}
          onClose={() => setPreviewRow(null)}
        />
      ) : null}

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

      <div className="mb-4 rounded-[16px] border border-[#ECE3D6] bg-white p-4">
        <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-3 max-[820px]:grid-cols-2 max-[560px]:grid-cols-1">
          <div className="relative col-span-2 max-[820px]:col-span-2 max-[560px]:col-span-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Ürün, SKU, marka, renk veya beden ara..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-[10px] border border-[#ECE3D6] bg-white py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as StockFilter)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tüm Stok</option>
            <option value="in_stock">Stokta</option>
            <option value="low_stock">Az Stok</option>
            <option value="out_of_stock">Tükendi</option>
          </select>

          <MultiSelect allLabel="Tüm Kategoriler" options={filterOptions.categories} selected={categoryFilter} onChange={setCategoryFilter} />
          <MultiSelect allLabel="Tüm Ürün Tipleri" options={filterOptions.productTypes} selected={productTypeFilter} onChange={setProductTypeFilter} />
          <MultiSelect allLabel="Tüm Yaş/Beden" options={filterOptions.sizes} selected={sizeFilter} onChange={setSizeFilter} />
          <MultiSelect allLabel="Tüm Renkler" options={filterOptions.colors} selected={colorFilter} onChange={setColorFilter} />
          <MultiSelect allLabel="Tüm Markalar" options={filterOptions.brands} selected={brandFilter} onChange={setBrandFilter} />

          <input
            type="number"
            min={0}
            placeholder="Min fiyat"
            value={minPriceFilter}
            onChange={(event) => setMinPriceFilter(event.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] placeholder:text-[#C4B5A5] focus:outline-none"
          />

          <input
            type="number"
            min={0}
            placeholder="Max fiyat"
            value={maxPriceFilter}
            onChange={(event) => setMaxPriceFilter(event.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] placeholder:text-[#C4B5A5] focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] text-[#B5A090]">
            {filteredRows.length} varyant gösteriliyor
          </span>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#C07B5A] transition-colors hover:bg-[#FAF6F1]"
            >
              Filtreleri Temizle
            </button>
          ) : null}
        </div>
      </div>

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

      <div ref={listTopRef} className="scroll-mt-20" />
      {/* Tablo dar masaustu ekranlarda (iPad yatay, kucuk pencere) sagdan kesilmesin; yatay kayar. */}
      {isDesktop ? (
      <div className="overflow-x-auto rounded-[16px] border border-[#ECE3D6] bg-white">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#ECE3D6] bg-[#FAF6F1] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#A89070]">
              <th className="w-10 px-4 py-3.5">
                <input
                  type="checkbox"
                  aria-label="Bu sayfadaki varyantları seç"
                  checked={allOnPageSelected}
                  ref={(element) => {
                    if (element) element.indeterminate = selectedOnPage > 0 && !allOnPageSelected
                  }}
                  onChange={togglePage}
                  className="rounded border-[#D5C9BA] accent-[#C07B5A]"
                />
              </th>
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
                <td colSpan={9} className="px-4 py-14 text-center text-[13px] text-[#B5A090]">
                  Arama kriterlerine uygun stok kaydı bulunamadı.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <InventoryTableRow
                  key={row.variantId}
                  row={row}
                  draftValue={draftValue(row)}
                  updating={updatingIds.has(row.variantId)}
                  selected={selected.has(row.variantId)}
                  onToggleSelected={toggleRow}
                  onDraftChange={setDraft}
                  onSave={updateStock}
                  onEdit={openVariantEditor}
                  onOpenImage={openImage}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      ) : (
      <div className="space-y-3">
        {filteredRows.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#D5C9BA] bg-white px-5 py-12 text-center text-[13px] text-[#B5A090]">
            Arama kriterlerine uygun stok kaydı bulunamadı.
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-2 px-1 text-[12.5px] font-semibold text-[#7A6656]">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={togglePage}
                className="rounded border-[#D5C9BA] accent-[#C07B5A]"
              />
              Bu sayfadaki {pageRows.length} varyantı seç
            </label>
            {pageRows.map((row) => (
              <InventoryMobileCard
                key={row.variantId}
                row={row}
                draftValue={draftValue(row)}
                updating={updatingIds.has(row.variantId)}
                selected={selected.has(row.variantId)}
                onToggleSelected={toggleRow}
                onDraftChange={setDraft}
                onSave={updateStock}
                onEdit={openVariantEditor}
                onOpenImage={openImage}
              />
            ))}
          </>
        )}
      </div>
      )}

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-[#B5A090]">
            {currentPage * PAGE_SIZE + 1}–{currentPage * PAGE_SIZE + pageRows.length} / {filteredRows.length} varyant · sayfa {currentPage + 1} / {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#5B4839] transition-colors hover:border-[#A89070] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Önceki
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              className="rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#5B4839] transition-colors hover:border-[#A89070] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        </div>
      ) : null}

      {/* Toplu islem cubugu: ekranin altinda sabit durur; boylece uzun listede asagida calisirken
          secim, kaydedilmemis degisiklikler ve islem sonucu her zaman gorunur. */}
      {selected.size > 0 || changedRows.length > 0 || notice || error ? <div className="h-56 lg:h-28" aria-hidden="true" /> : null}
      {selected.size > 0 || changedRows.length > 0 || notice || error ? (
        <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-[#ECE3D6] bg-white/95 px-4 py-3 shadow-[0_-10px_24px_-18px_rgba(91,72,57,.7)] backdrop-blur lg:bottom-0 lg:left-64 lg:px-8">
          {error ? (
            <div role="alert" className="mb-2 flex items-start justify-between gap-3 rounded-[10px] bg-[#FEEAEA] px-3.5 py-2.5 text-[13px] text-[#8A1A1A]">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Hatayı kapat" className="shrink-0 font-bold">×</button>
            </div>
          ) : null}
          {notice ? (
            <div role="status" className="mb-2 flex items-start justify-between gap-3 rounded-[10px] bg-[#EDF7F1] px-3.5 py-2.5 text-[13px] font-semibold text-[#1A6640]">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Bildirimi kapat" className="shrink-0 font-bold">×</button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-bold text-[#3D2B1F]">{selected.size} varyant seçili</span>
                {selected.size > selectedOnPage ? (
                  // Secim sayfalar ve filtreler arasinda korunur; ekranda olmayan secili satirlar
                  // toplu islemlere dahildir, bu yuzden acikca gosterilir.
                  <span className="text-[12px] font-semibold text-[#9A5B12]">
                    ({selected.size - selectedOnPage} tanesi bu sayfada görünmüyor)
                  </span>
                ) : null}
                {allOnPageSelected && selectedInFilter < filteredRows.length ? (
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="h-9 rounded-[9px] border border-[#D8CABB] px-3 text-[12px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1]"
                  >
                    Listelenen {filteredRows.length} varyantın tümünü seç
                  </button>
                ) : null}
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Seçilenlere verilecek stok"
                  placeholder="Stok"
                  value={bulkStock}
                  onChange={(event) => setBulkStock(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') applyBulkStock() }}
                  className="h-9 w-24 rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[13px] font-semibold text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                />
                <button
                  type="button"
                  onClick={applyBulkStock}
                  disabled={bulkStock.trim() === ''}
                  className="h-9 rounded-[9px] bg-[#5B4839] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#3D2B1F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stoğu uygula
                </button>
                <select
                  aria-label="Seçilenlerin yeni bedeni"
                  value={bulkSize}
                  onChange={(event) => setBulkSize(event.target.value)}
                  className="h-9 rounded-[9px] border border-[#ECE3D6] bg-white px-2 text-[13px] text-[#3D2B1F] outline-none focus:border-[#A89070]"
                >
                  <option value="">Beden seç…</option>
                  {[...KIDS_AGE_SIZES, ...BABY_MONTH_SIZES].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void applyBulkSize()}
                  disabled={!bulkSize || bulkBusy !== null}
                  className="h-9 rounded-[9px] bg-[#5B4839] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#3D2B1F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bedeni değiştir
                </button>
                <button
                  type="button"
                  onClick={() => void deleteVariants([...selected], `Seçili ${selected.size} varyant`)}
                  disabled={bulkBusy !== null}
                  className="h-9 rounded-[9px] bg-[#FEEAEA] px-3 text-[12px] font-bold text-[#8A1A1A] transition-colors hover:bg-[#FAD4D4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkBusy === 'delete' ? 'Siliniyor...' : 'Seçilenleri sil'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="h-9 px-1 text-[12px] font-semibold text-[#A89070] hover:text-[#5B4839]"
                >
                  Seçimi kaldır
                </button>
              </div>
            ) : null}
            {changedRows.length > 0 ? (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#5B4839]">{changedRows.length} stok değişikliği kaydedilmedi</span>
                <button
                  type="button"
                  onClick={discardDrafts}
                  disabled={bulkBusy !== null}
                  className="h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-[#ECE3D6] px-3 text-[12px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:opacity-50"
                >
                  Geri al
                </button>
                <button
                  type="button"
                  onClick={() => void saveAllStocks()}
                  disabled={bulkBusy !== null}
                  className="h-9 shrink-0 whitespace-nowrap rounded-[9px] bg-[#C07B5A] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkBusy === 'save' ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AdminShell>
  )
}

function VariantEditDrawer({
  row,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  row: InventoryRow
  form: VariantEditForm
  saving: boolean
  // Panel acikken sayfanin alt cubugu panelin arkasinda kalir; hata burada gosterilir.
  error: string | null
  onChange: (form: VariantEditForm) => void
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  function updateField<K extends keyof VariantEditForm>(field: K, value: VariantEditForm[K]) {
    onChange({ ...form, [field]: value })
  }

  // Beden sabit listeden secilir; listede olmayan eski bir etiket varsa o da secenek olarak kalir.
  const fixedSizes = sizeOptionsForCategory(row.categoryName).sizes
  const sizeChoices = fixedSizes.includes(row.sizeLabel) ? fixedSizes : [row.sizeLabel, ...fixedSizes]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold text-[#3D2B1F]">Varyantı Düzenle</h2>
            <p className="mt-0.5 truncate text-[12px] text-[#A89070]">{row.productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#C4B5A5] transition-colors hover:bg-[#FAF6F1] hover:text-[#5B4839] disabled:opacity-50"
            title="Kapat"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Beden</span>
              <select
                value={form.sizeLabel}
                onChange={(event) => updateField('sizeLabel', event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 text-[13px] text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
              >
                {sizeChoices.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Renk</span>
              <input
                type="text"
                value={form.colorName}
                onChange={(event) => updateField('colorName', event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 text-[13px] text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">SKU</span>
            <input
              type="text"
              value={form.sku}
              onChange={(event) => updateField('sku', event.target.value)}
              placeholder="SKU"
              className="h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 text-[13px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
            />
          </label>

          <div className="grid grid-cols-[1fr_1fr_96px] gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Stok</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.stockQuantity}
                onChange={(event) => updateField('stockQuantity', event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 text-[13px] font-semibold text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Fiyat</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={(event) => updateField('price', event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 text-[13px] font-semibold text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Birim</span>
              <input
                type="text"
                maxLength={3}
                value={form.currency}
                onChange={(event) => updateField('currency', event.target.value.toUpperCase())}
                className="h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 text-[13px] font-bold uppercase text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => updateField('active', !form.active)}
            className="flex w-full items-center justify-between rounded-[10px] border border-[#ECE3D6] px-4 py-3 text-left transition-colors hover:bg-[#FAF6F1]"
          >
            <span>
              <span className="block text-[13px] font-semibold text-[#3D2B1F]">Aktif</span>
              <span className="block text-[11.5px] text-[#A89070]">Storefront ve stok hesaplarına dahil edilsin</span>
            </span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${form.active ? 'bg-[#C07B5A]' : 'bg-[#D5C9BA]'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
          </button>

          <div className="rounded-[10px] border border-[#F0B9B1] bg-[#FFF7F5] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#8A1A1A]">Varyantı sil</p>
            <p className="mt-0.5 text-[11.5px] leading-5 text-[#8A4A3E]">
              Yanlış eklenmiş bir beden/rengi kalıcı olarak kaldırır. Eski siparişler etkilenmez.
            </p>
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="mt-2.5 rounded-[9px] bg-[#B73B35] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#9F2F2A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Kalıcı Olarak Sil
            </button>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mx-6 mb-1 rounded-[10px] bg-[#FEEAEA] px-3.5 py-2.5 text-[12.5px] text-[#8A1A1A]">
            {error}
          </div>
        ) : null}
        <div className="flex gap-3 border-t border-[#ECE3D6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-[10px] border border-[#ECE3D6] py-2.5 text-[13px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 rounded-[10px] bg-[#C07B5A] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </aside>
    </>
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

// Satirlar memo'ludur: bir stok kutusuna yazmak ya da bir kutuyu isaretlemek yalnizca o satiri
// yeniden cizer. Bunun icin islevler satir bilgisini parametre olarak alir (kimlikleri sabit kalir).
interface InventoryRowProps {
  row: InventoryRow
  draftValue: string
  updating: boolean
  selected: boolean
  onToggleSelected: (variantId: number) => void
  onDraftChange: (variantId: number, value: string) => void
  onSave: (row: InventoryRow, draftValue: string) => void
  onEdit: (row: InventoryRow) => void
  onOpenImage: (row: InventoryRow) => void
}

const InventoryTableRow = memo(function InventoryTableRow({
  row,
  draftValue,
  updating,
  selected,
  onToggleSelected,
  onDraftChange,
  onSave,
  onEdit,
  onOpenImage,
}: InventoryRowProps) {
  const changed = draftValue !== String(row.stockQuantity)

  // Satir renginde gecis animasyonu yok: 100 satirlik tabloda her kare yeniden boyandigi icin
  // satirlari art arda isaretlemek yavas bilgisayarlarda gozle gorulur sekilde agirlasiyordu.
  return (
    <tr className={`hover:bg-[#FAF6F1] ${changed ? 'bg-[#FFF8EC]' : ''}`}>
      <td className="px-4 py-3.5">
        <input
          type="checkbox"
          aria-label={`${row.productName} ${row.sizeLabel} / ${row.colorName} seç`}
          checked={selected}
          onChange={() => onToggleSelected(row.variantId)}
          className="rounded border-[#D5C9BA] accent-[#C07B5A]"
        />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <ProductImage src={row.imageUrl} name={row.productName} onOpen={() => onOpenImage(row)} />
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
        {/* Metin kutusu (number degil): odaktayken fare tekerlegi degeri sessizce degistirmesin. */}
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${row.productName} ${row.sizeLabel} / ${row.colorName} stok`}
          value={draftValue}
          onChange={(event) => onDraftChange(row.variantId, event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && changed && !updating) onSave(row, draftValue) }}
          className="h-9 w-24 rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-right text-[13px] font-semibold text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
        />
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#ECE3D6] text-[#A89070] transition-colors hover:bg-[#FAF6F1] hover:text-[#5B4839]"
            title="Varyantı düzenle"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8H3v-3L11 2z" /></svg>
          </button>
          <button
            type="button"
            disabled={!changed || updating}
            onClick={() => onSave(row, draftValue)}
            className="rounded-[9px] bg-[#C07B5A] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? 'Kaydediliyor' : 'Kaydet'}
          </button>
        </div>
      </td>
    </tr>
  )
})

const InventoryMobileCard = memo(function InventoryMobileCard({
  row,
  draftValue,
  updating,
  selected,
  onToggleSelected,
  onDraftChange,
  onSave,
  onEdit,
  onOpenImage,
}: InventoryRowProps) {
  const changed = draftValue !== String(row.stockQuantity)

  return (
    <article className={`rounded-[14px] border border-[#ECE3D6] p-4 ${changed ? 'bg-[#FFF8EC]' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={`${row.productName} ${row.sizeLabel} / ${row.colorName} seç`}
          checked={selected}
          onChange={() => onToggleSelected(row.variantId)}
          className="mt-3 rounded border-[#D5C9BA] accent-[#C07B5A]"
        />
        <ProductImage src={row.imageUrl} name={row.productName} onOpen={() => onOpenImage(row)} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#3D2B1F]">{row.productName}</p>
          <p className="mt-0.5 text-[11.5px] text-[#A89070]">{row.sizeLabel} / {row.colorName}</p>
          <p className="mt-0.5 text-[11.5px] text-[#C4B5A5]">{row.sku ?? 'SKU yok'}</p>
          <p className="mt-1 text-[12px] font-bold text-[#3D2B1F]">{formatPrice(row.price, row.currency)}</p>
        </div>
        <StockBadge row={row} />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-3">
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${row.productName} ${row.sizeLabel} / ${row.colorName} stok`}
          value={draftValue}
          onChange={(event) => onDraftChange(row.variantId, event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && changed && !updating) onSave(row, draftValue) }}
          className="h-10 rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[13px] font-semibold text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
        />
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#ECE3D6] text-[#A89070] transition-colors hover:bg-[#FAF6F1] hover:text-[#5B4839]"
          title="Varyantı düzenle"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8H3v-3L11 2z" /></svg>
        </button>
        <button
          type="button"
          disabled={!changed || updating}
          onClick={() => onSave(row, draftValue)}
          className="rounded-[9px] bg-[#C07B5A] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updating ? '...' : 'Kaydet'}
        </button>
      </div>
    </article>
  )
})
