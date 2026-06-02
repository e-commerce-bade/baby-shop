'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartLineItem, CartState } from '@/types/cart'

function newSessionId() {
  return typeof crypto !== 'undefined'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

interface BackendCartItem {
  id: number
  productId: number
  productName: string
  productSlug: string
  primaryImageUrl: string | null
  productVariantId: number
  sizeLabel: string
  colorName: string
  quantity: number
  unitPrice: number | string
  currency: string
}

interface BackendCartResponse {
  id: number
  sessionId: string
  status: string
  items: BackendCartItem[]
  totalQuantity: number
  subtotal: number | string
  currency: string
}

function mapCartItem(item: BackendCartItem): CartLineItem {
  return {
    id: String(item.id),
    cartItemId: item.id,
    productId: item.productId,
    variantId: item.productVariantId,
    slug: item.productSlug,
    productName: item.productName,
    variantLabel: `${item.sizeLabel} / ${item.colorName}`,
    primaryImageUrl: item.primaryImageUrl,
    price: typeof item.unitPrice === 'string' ? item.unitPrice : item.unitPrice.toFixed(2),
    currency: item.currency,
    quantity: item.quantity,
  }
}

async function requestCart(
  path: string,
  init?: RequestInit,
): Promise<BackendCartResponse> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Cart request failed: ${response.status}`)
  }

  return response.json() as Promise<BackendCartResponse>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      sessionId: newSessionId(),
      items: [],
      isOpen: false,
      isSyncing: false,

      hydrateCart: async () => {
        const { sessionId, isSyncing } = get()
        if (isSyncing) {
          return
        }

        set({ isSyncing: true })

        try {
          const cart = await requestCart(`/api/cart/${sessionId}`, {
            cache: 'no-store',
          })

          set({
            items: cart.items.map(mapCartItem),
          })
        } catch (error) {
          console.error('Failed to hydrate cart', error)
        } finally {
          set({ isSyncing: false })
        }
      },

      addItem: async ({ quantity = 1, ...incoming }) => {
        set({ isSyncing: true })

        try {
          const cart = await requestCart(`/api/cart/${get().sessionId}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              productVariantId: incoming.variantId,
              quantity,
            }),
          })

          set({
            items: cart.items.map(mapCartItem),
            isOpen: true,
          })
        } catch (error) {
          console.error('Failed to add item to cart', error)
        } finally {
          set({ isSyncing: false })
        }
      },

      removeItem: async (id) => {
        set({ isSyncing: true })

        try {
          const cart = await requestCart(`/api/cart/${get().sessionId}/items/${id}`, {
            method: 'DELETE',
          })

          set({
            items: cart.items.map(mapCartItem),
          })
        } catch (error) {
          console.error('Failed to remove item from cart', error)
        } finally {
          set({ isSyncing: false })
        }
      },

      updateQuantity: async (id, quantity) => {
        set({ isSyncing: true })

        try {
          const cart = await requestCart(`/api/cart/${get().sessionId}/items/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quantity }),
          })

          set({
            items: cart.items.map(mapCartItem),
          })
        } catch (error) {
          console.error('Failed to update cart quantity', error)
        } finally {
          set({ isSyncing: false })
        }
      },

      clearCart: () => set({ items: [] }),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
    }),
    {
      name: 'minimori-cart',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
      partialize: (state) => ({
        sessionId: state.sessionId,
        items: state.items,
      }),
    },
  ),
)

export const cartItemCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)

export const cartSubtotal = (state: CartState) =>
  state.items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0,
  )
