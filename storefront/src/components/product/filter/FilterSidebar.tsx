'use client'

import { useEffect, useState } from 'react'
import { useProductFilter } from '@/hooks/useProductFilter'
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

export default function FilterSidebar() {
  const { filters, toggleList, setCategorySlug, setPriceRange, clearAll, hasActiveFilters } =
    useProductFilter()
  const [visibleFilters, setVisibleFilters] = useState(defaultVisibleFilters)

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

  return (
    <aside className="sticky top-[18px] max-[980px]:static rounded-panel border border-line bg-cream-3 px-5 py-[22px]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold text-brown">Filtreler</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-rose-dk transition-colors hover:text-rose"
          >
            Tumunu temizle
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
              checked={filters.categorySlug === cat.value}
              onChange={() => setCategorySlug(filters.categorySlug === cat.value ? null : cat.value)}
            />
          ))}
        </div>
      </FilterGroup>
      ) : null}

      {visibleFilters.productType ? (
      <FilterGroup title="Urun Tipi">
        <div className="space-y-0">
          {filterProductTypes.map((type) => (
            <CheckboxFilter
              key={type}
              label={type}
              checked={filters.productTypes.includes(type)}
              onChange={() => toggleList('productTypes', type)}
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
              selected={filters.sizes.includes(size)}
              onToggle={() => toggleList('sizes', size)}
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
              selected={filters.colors.includes(color.name)}
              onToggle={() => toggleList('colors', color.name)}
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
              checked={filters.priceRange === range.value}
              onChange={() =>
                setPriceRange(
                  filters.priceRange === range.value ? null : range.value,
                )
              }
            />
          ))}
        </div>
      </FilterGroup>
      ) : null}
    </aside>
  )
}
