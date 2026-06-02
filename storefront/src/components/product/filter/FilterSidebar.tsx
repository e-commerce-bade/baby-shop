'use client'

import { useProductFilter } from '@/hooks/useProductFilter'
import FilterGroup from './FilterGroup'
import CheckboxFilter from './CheckboxFilter'
import ChipFilter from './ChipFilter'
import SwatchFilter from './SwatchFilter'
import {
  filterCategories,
  filterSizes,
  filterColors,
  filterPriceRanges,
} from '@/lib/mock/filterData'

export default function FilterSidebar() {
  const { filters, toggleList, setPriceRange, clearAll, hasActiveFilters } =
    useProductFilter()

  return (
    <aside className="sticky top-[18px] rounded-panel border border-line bg-cream-3 px-5 py-[22px]">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold text-brown">Filtreler</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-rose-dk transition-colors hover:text-rose"
          >
            Tümünü temizle
          </button>
        )}
      </div>

      {/* Kategori */}
      <FilterGroup title="Kategori">
        <div className="space-y-0">
          {filterCategories.map((cat) => (
            <CheckboxFilter
              key={cat.label}
              label={cat.label}
              count={cat.count}
              checked={false}
              onChange={() => {
                // Kategori filtresi backend slug eşlemesi gerektirir — Faz 6'da tamamlanır
              }}
            />
          ))}
        </div>
      </FilterGroup>

      {/* Beden */}
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

      {/* Renk */}
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

      {/* Fiyat */}
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
    </aside>
  )
}
