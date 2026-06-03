'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProductSummary } from '@/types/product'

interface FavoriteState {
  items: ProductSummary[]
  addFavorite: (product: ProductSummary) => void
  removeFavorite: (productId: number) => void
  toggleFavorite: (product: ProductSummary) => void
  isFavorite: (productId: number) => boolean
  clearFavorites: () => void
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      items: [],
      addFavorite: (product) =>
        set((state) => {
          if (state.items.some((item) => item.id === product.id)) {
            return state
          }

          return { items: [product, ...state.items] }
        }),
      removeFavorite: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),
      toggleFavorite: (product) => {
        if (get().isFavorite(product.id)) {
          get().removeFavorite(product.id)
          return
        }

        get().addFavorite(product)
      },
      isFavorite: (productId) => get().items.some((item) => item.id === productId),
      clearFavorites: () => set({ items: [] }),
    }),
    {
      name: 'badebebe-favorites',
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
      partialize: (state) => ({
        items: state.items,
      }),
    },
  ),
)

export const favoriteCount = (state: FavoriteState) => state.items.length
