'use client'

import { useEffect, useMemo, useState } from 'react'
import { useProductFilter, type ProductFilters } from '@/hooks/useProductFilter'
import FilterGroup from './FilterGroup'
import CheckboxFilter from './CheckboxFilter'
import ChipFilter from './ChipFilter'
import SwatchFilter from './SwatchFilter'
import { filterPriceRanges } from '@/lib/mock/filterData'

type FilterKey = 'category' | 'productType' | 'size' | 'color' | 'price'
type FilterSetting = { key: FilterKey; enabled: boolean }

type CategoryFacet = { slug: string; name: string }
type Facets = {
  categories: CategoryFacet[]
  productTypes: string[]
  colors: string[]
  sizes: string[]
}

const EMPTY_FACETS: Facets = { categories: [], productTypes: [], colors: [], sizes: [] }

// Bilinen renk adlari icin swatch rengi; bilinmeyenlerde notr bir ton gosterilir.
const COLOR_HEX: Record<string, string> = {
  Yulaf: '#DDCBB3', Pudra: '#E6BFBA', 'Gok Mavisi': '#BFD3E0', 'Gök Mavisi': '#BFD3E0',
  Adacayi: '#C2D2AE', Adaçayı: '#C2D2AE', Vizon: '#D2BCA2', 'Acik Pembe': '#E3B9B4', 'Açık Pembe': '#E3B9B4',
  Kahve: '#5B4839', Beyaz: '#FFFFFF', Siyah: '#2B2B2B', Kirmizi: '#C0392B', Kırmızı: '#C0392B',
  Mavi: '#2E86DE', Lacivert: '#2C3E50', Yesil: '#27AE60', Yeşil: '#27AE60', Sari: '#F1C40F', Sarı: '#F1C40F',
  Pembe: '#E75A88', Mor: '#8E44AD', Gri: '#95A5A6', Bej: '#E8DCC8', Turuncu: '#E67E22',
}

function colorHex(name: string): string {
  return COLOR_HEX[name] ?? '#D9CFC2'
}

const defaultVisibleFilters: Record<FilterKey, boolean> = {
  category: true,
  productType: true,
  size: true,
  color: true,
  price: true,
}

const EMPTY_DRAFT: ProductFilters = {
  categorySlug: null,
  productTypes: [],
  colors: [],
  sizes: [],
  priceRange: null,
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function countSelected(draft: ProductFilters): number {
  return (
    (draft.categorySlug ? 1 : 0) +
    draft.productTypes.length +
    draft.colors.length +
    draft.sizes.length +
    (draft.priceRange ? 1 : 0)
  )
}

export default function FilterSidebar() {
  const { filters, applyFilters, clearAll } = useProductFilter()
  const [visibleFilters, setVisibleFilters] = useState(defaultVisibleFilters)
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Local draft: selections are staged here and only sent to the server when
  // the user presses "Uygula", so toggling controls never fires a request.
  const [draft, setDraft] = useState<ProductFilters>(filters)

  // Re-sync the draft whenever the applied (URL) filters change.
  const appliedKey = useMemo(() => JSON.stringify(filters), [filters])
  useEffect(() => {
    setDraft(JSON.parse(appliedKey) as ProductFilters)
  }, [appliedKey])

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const res = await fetch('/api/filter-settings', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return
        const settings = (await res.json()) as FilterSetting[]
        if (!active) return
        setVisibleFilters({
          ...defaultVisibleFilters,
          ...Object.fromEntries(settings.map((setting) => [setting.key, setting.enabled])),
        })
      } catch {
        // Keep default filters if settings cannot be loaded.
      }
    }

    void loadSettings()
    return () => {
      active = false
    }
  }, [])

  // Filtre secenekleri gercek kataloqdan gelir (sabit liste degil); boylece her secim
  // gercekten filtrelenebilir ve "urun bulunamadi" sonucu vermez.
  useEffect(() => {
    let active = true

    async function loadFacets() {
      try {
        const res = await fetch('/api/products/facets', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return
        const data = (await res.json()) as Partial<Facets>
        if (!active) return
        setFacets({
          categories: Array.isArray(data.categories) ? data.categories : [],
          productTypes: Array.isArray(data.productTypes) ? data.productTypes : [],
          colors: Array.isArray(data.colors) ? data.colors : [],
          sizes: Array.isArray(data.sizes) ? data.sizes : [],
        })
      } catch {
        // Facet yuklenemezse gruplar bos kalir (sessizce gizlenir).
      }
    }

    void loadFacets()
    return () => {
      active = false
    }
  }, [])

  const selectedCount = countSelected(draft)
  const isDirty = JSON.stringify(draft) !== appliedKey

  function handleApply() {
    applyFilters(draft)
    setDrawerOpen(false)
  }

  function handleClear() {
    setDraft(EMPTY_DRAFT)
    clearAll()
    setDrawerOpen(false)
  }

  const clearAllButton = (
    <button
      type="button"
      onClick={handleClear}
      disabled={selectedCount === 0}
      className="w-full rounded-pill border border-line py-2.5 text-[13px] font-bold text-brown-2 transition-colors hover:border-rose-soft hover:text-rose-dk disabled:cursor-not-allowed disabled:opacity-40"
    >
      Tüm Filtreleri Temizle
    </button>
  )

  const groups = (
    <>
      {visibleFilters.category && facets.categories.length > 0 ? (
        <FilterGroup title="Kategori">
          <div className="space-y-0">
            {facets.categories.map((cat) => (
              <CheckboxFilter
                key={cat.slug}
                label={cat.name}
                checked={draft.categorySlug === cat.slug}
                onChange={() =>
                  setDraft((d) => ({
                    ...d,
                    categorySlug: d.categorySlug === cat.slug ? null : cat.slug,
                  }))
                }
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {visibleFilters.productType && facets.productTypes.length > 0 ? (
        <FilterGroup title="Ürün Tipi">
          <div className="space-y-0">
            {facets.productTypes.map((type) => (
              <CheckboxFilter
                key={type}
                label={type}
                checked={draft.productTypes.includes(type)}
                onChange={() =>
                  setDraft((d) => ({ ...d, productTypes: toggleValue(d.productTypes, type) }))
                }
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {visibleFilters.size && facets.sizes.length > 0 ? (
        <FilterGroup title="Beden">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((size) => (
              <ChipFilter
                key={size}
                label={size}
                selected={draft.sizes.includes(size)}
                onToggle={() => setDraft((d) => ({ ...d, sizes: toggleValue(d.sizes, size) }))}
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {visibleFilters.color && facets.colors.length > 0 ? (
        <FilterGroup title="Renk">
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((color) => (
              <SwatchFilter
                key={color}
                name={color}
                hex={colorHex(color)}
                selected={draft.colors.includes(color)}
                onToggle={() => setDraft((d) => ({ ...d, colors: toggleValue(d.colors, color) }))}
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {visibleFilters.price ? (
        <FilterGroup title="Fiyat">
          <div className="space-y-0">
            {filterPriceRanges.map((range) => (
              <CheckboxFilter
                key={range.value}
                label={range.label}
                checked={draft.priceRange === range.value}
                onChange={() =>
                  setDraft((d) => ({
                    ...d,
                    priceRange: d.priceRange === range.value ? null : range.value,
                  }))
                }
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}
    </>
  )

  const applyButton = (
    <button
      type="button"
      onClick={handleApply}
      disabled={!isDirty}
      className="flex w-full items-center justify-center gap-2 rounded-pill bg-rose py-3 text-sm font-bold text-white transition-colors hover:bg-rose-dk disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
    >
      {isDirty ? 'Filtreleri Uygula' : 'Filtreler Uygulandı'}
      {selectedCount > 0 ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-[11px] font-extrabold leading-none">
          {selectedCount}
        </span>
      ) : null}
    </button>
  )

  const actionBar = (
    <div className="space-y-2">
      {applyButton}
      {clearAllButton}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar (in-flow grid column) */}
      <aside className="sticky top-[18px] rounded-panel border border-line bg-cream-3 px-5 py-[22px] max-[980px]:hidden">
        <div className="mb-2">
          <h3 className="font-serif text-xl font-semibold text-brown">Filtreler</h3>
        </div>
        {groups}
        <div className="mt-5 border-t border-line pt-4">{actionBar}</div>
      </aside>

      {/* Mobile trigger — fixed, so it stays out of the grid layout */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-2 rounded-pill bg-brown px-6 py-3.5 text-sm font-bold text-white shadow-card max-[980px]:flex"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        Filtrele
        {selectedCount > 0 ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-[11px] font-extrabold leading-none">
            {selectedCount}
          </span>
        ) : null}
      </button>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 min-[981px]:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-[360px] flex-col bg-cream-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-serif text-xl font-semibold text-brown">Filtreler</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Kapat"
                className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-cream-2 hover:text-brown"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {groups}
            </div>

            <div className="border-t border-line p-4">{actionBar}</div>
          </div>
        </div>
      ) : null}
    </>
  )
}
