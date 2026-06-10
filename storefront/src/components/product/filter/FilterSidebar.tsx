'use client'

import { useEffect, useMemo, useState } from 'react'
import { useProductFilter, type ProductFilters } from '@/hooks/useProductFilter'
import FilterGroup from './FilterGroup'
import CheckboxFilter from './CheckboxFilter'
import ChipFilter from './ChipFilter'
import SwatchFilter from './SwatchFilter'
import {
  filterCategories,
  filterProductTypes,
  filterSizes,
  filterColors,
  filterPriceRanges,
} from '@/lib/mock/filterData'

type FilterKey = 'category' | 'productType' | 'size' | 'color' | 'price'
type FilterSetting = { key: FilterKey; enabled: boolean }

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

  // Local draft: selections are staged here and only sent to the server when
  // the user presses "Uygula", so toggling checkboxes no longer fires a request.
  const [draft, setDraft] = useState<ProductFilters>(filters)

  // Re-sync the draft whenever the applied (URL) filters change — e.g. after an
  // apply, a category nav click, or the browser back button.
  const appliedKey = useMemo(() => JSON.stringify(filters), [filters])
  useEffect(() => {
    setDraft(JSON.parse(appliedKey) as ProductFilters)
  }, [appliedKey])

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

  const selectedCount = countSelected(draft)
  const isDirty = JSON.stringify(draft) !== appliedKey

  function handleClear() {
    setDraft(EMPTY_DRAFT)
    clearAll()
  }

  return (
    <aside className="sticky top-[18px] max-[980px]:static rounded-panel border border-line bg-cream-3 px-5 py-[22px]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold text-brown">Filtreler</h3>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-bold text-rose-dk transition-colors hover:text-rose"
          >
            Tümünü temizle
          </button>
        )}
      </div>

      {visibleFilters.category ? (
        <FilterGroup title="Kategori">
          <div className="space-y-0">
            {filterCategories.map((cat) => (
              <CheckboxFilter
                key={cat.value}
                label={cat.label}
                checked={draft.categorySlug === cat.value}
                onChange={() =>
                  setDraft((d) => ({
                    ...d,
                    categorySlug: d.categorySlug === cat.value ? null : cat.value,
                  }))
                }
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {visibleFilters.productType ? (
        <FilterGroup title="Ürün Tipi">
          <div className="space-y-0">
            {filterProductTypes.map((type) => (
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

      {visibleFilters.size ? (
        <FilterGroup title="Beden">
          <div className="flex flex-wrap gap-2">
            {filterSizes.map((size) => (
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

      {visibleFilters.color ? (
        <FilterGroup title="Renk">
          <div className="flex flex-wrap gap-2.5">
            {filterColors.map((color) => (
              <SwatchFilter
                key={color.name}
                name={color.name}
                hex={color.hex}
                selected={draft.colors.includes(color.name)}
                onToggle={() => setDraft((d) => ({ ...d, colors: toggleValue(d.colors, color.name) }))}
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

      {/* Apply bar — only this commits the selection to the server */}
      <div className="mt-5 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => applyFilters(draft)}
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
      </div>
    </aside>
  )
}
