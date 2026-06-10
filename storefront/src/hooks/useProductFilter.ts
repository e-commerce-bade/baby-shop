'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface ProductFilters {
  categorySlug: string | null
  productTypes: string[]
  colors: string[]
  sizes: string[]
  priceRange: string | null
}

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function useProductFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters: ProductFilters = {
    categorySlug: searchParams.get('categorySlug') ?? searchParams.get('category'),
    productTypes: parseList(searchParams.get('productTypes')),
    colors: parseList(searchParams.get('colors')),
    sizes: parseList(searchParams.get('sizes')),
    priceRange: searchParams.get('price'),
  }

  const buildParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const toggleList = useCallback(
    (key: 'colors' | 'sizes' | 'productTypes', value: string) => {
      const current = parseList(searchParams.get(key))
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      buildParams({ [key]: next.length ? next.join(',') : null })
    },
    [buildParams, searchParams],
  )

  const setPriceRange = useCallback(
    (value: string | null) => buildParams({ price: value }),
    [buildParams],
  )

  const setCategorySlug = useCallback(
    (value: string | null) => buildParams({ categorySlug: value, category: null }),
    [buildParams],
  )

  /**
   * Commit a full draft of filters to the URL in a single navigation, so the
   * server only refetches once when the user presses "Apply" — instead of on
   * every individual checkbox toggle. Preserves unrelated params (q, sort).
   */
  const applyFilters = useCallback(
    (draft: ProductFilters) => {
      const params = new URLSearchParams()
      const q = searchParams.get('q')
      const sort = searchParams.get('sort')
      if (q) params.set('q', q)
      if (sort) params.set('sort', sort)
      if (draft.categorySlug) params.set('categorySlug', draft.categorySlug)
      if (draft.productTypes.length) params.set('productTypes', draft.productTypes.join(','))
      if (draft.colors.length) params.set('colors', draft.colors.join(','))
      if (draft.sizes.length) params.set('sizes', draft.sizes.join(','))
      if (draft.priceRange) params.set('price', draft.priceRange)
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const clearAll = useCallback(() => router.push(pathname), [router, pathname])

  const hasActiveFilters =
    filters.categorySlug !== null ||
    filters.productTypes.length > 0 ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.priceRange !== null

  return { filters, toggleList, setCategorySlug, setPriceRange, applyFilters, clearAll, hasActiveFilters }
}
