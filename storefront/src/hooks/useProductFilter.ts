'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface ProductFilters {
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
    (key: 'colors' | 'sizes', value: string) => {
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

  const clearAll = useCallback(() => router.push(pathname), [router, pathname])

  const hasActiveFilters =
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.priceRange !== null

  return { filters, toggleList, setPriceRange, clearAll, hasActiveFilters }
}
