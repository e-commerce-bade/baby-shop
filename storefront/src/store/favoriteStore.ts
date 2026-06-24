'use client'

import { create } from 'zustand'
import type { ProductSummary } from '@/types/product'

export type FavoriteToggleResult = 'added' | 'removed' | 'unauthorized' | 'error'

interface FavoriteState {
  items: ProductSummary[]
  hasLoaded: boolean
  isAuthenticated: boolean
  loadFavorites: () => Promise<void>
  toggleFavorite: (product: ProductSummary) => Promise<FavoriteToggleResult>
  removeAllFavorites: () => Promise<void>
  isFavorite: (productId: number) => boolean
  clearFavorites: () => void
}

// Favoriler hesaba baglidir ve sunucuda saklanir (cihazlar arasi senkron, paylasilan
// cihazda kullanicilar arasi sizinti yok). Bu store yalnizca sunucunun bir onbellegidir;
// localStorage'a kalici yazilmaz.
export const useFavoriteStore = create<FavoriteState>()((set, get) => ({
  items: [],
  hasLoaded: false,
  isAuthenticated: false,

  loadFavorites: async () => {
    try {
      const res = await fetch('/api/account/favorites', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })

      if (res.status === 401) {
        set({ items: [], hasLoaded: true, isAuthenticated: false })
        return
      }

      if (!res.ok) {
        set({ hasLoaded: true })
        return
      }

      const items = (await res.json()) as ProductSummary[]
      set({ items, hasLoaded: true, isAuthenticated: true })
    } catch {
      set({ hasLoaded: true })
    }
  },

  toggleFavorite: async (product) => {
    const exists = get().isFavorite(product.id)

    // Optimistik UI guncellemesi
    set((state) => ({
      items: exists
        ? state.items.filter((item) => item.id !== product.id)
        : [product, ...state.items],
    }))

    const revert = () =>
      set((state) => ({
        items: exists
          ? [product, ...state.items.filter((item) => item.id !== product.id)]
          : state.items.filter((item) => item.id !== product.id),
      }))

    try {
      const res = await fetch(`/api/account/favorites/${product.id}`, {
        method: exists ? 'DELETE' : 'PUT',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })

      if (res.status === 401) {
        // Giris yapilmamis: yerel favorileri temizle, cagiran tarafi yonlendirsin.
        set({ items: [], isAuthenticated: false })
        return 'unauthorized'
      }

      if (!res.ok) {
        revert()
        return 'error'
      }

      set({ isAuthenticated: true })
      return exists ? 'removed' : 'added'
    } catch {
      revert()
      return 'error'
    }
  },

  removeAllFavorites: async () => {
    const ids = get().items.map((item) => item.id)
    set({ items: [] })
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/account/favorites/${id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        }).catch(() => undefined),
      ),
    )
  },

  isFavorite: (productId) => get().items.some((item) => item.id === productId),

  // Cikis/401'de yerel onbellegi temizle; sonraki giriste yeniden yuklenebilmesi icin
  // hasLoaded da sifirlanir.
  clearFavorites: () => set({ items: [], isAuthenticated: false, hasLoaded: false }),
}))

export const favoriteCount = (state: FavoriteState) => state.items.length
