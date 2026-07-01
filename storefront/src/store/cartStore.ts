'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartLineItem, CartState, CheckoutSummary } from '@/types/cart'

let latestCartRequestToken = 0

// Adet degisikliklerinde ardisik +/- tiklamalarini urun basina tek PATCH'te birlestirmek icin.
const quantitySyncTimers = new Map<string, ReturnType<typeof setTimeout>>()
const QUANTITY_SYNC_DELAY_MS = 400

function newSessionId() {
  // sessionId, anonim sepeti adresleyen bir tasiyici (bearer) yetkidir; yuksek entropi sart.
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    }
  }
  // Son care: kriptografik API yoksa iki Math.random'i birlestir (zayif ama nadir bir yol).
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

function beginCartRequest() {
  latestCartRequestToken += 1
  return latestCartRequestToken
}

function isLatestCartRequest(token: number) {
  return token === latestCartRequestToken
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

async function requestCart(path: string, init?: RequestInit): Promise<BackendCartResponse> {
  const res = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  })

  if (!res.ok) {
    // Backend'in hata mesajini (orn. "Yeterli stok yok") kullaniciya gosterebilmek icin cikar.
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    const message =
      body && typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : 'Sepet güncellenemedi. Lütfen tekrar deneyin.'
    throw new Error(message)
  }

  return res.json() as Promise<BackendCartResponse>
}

async function fetchCheckoutSummary(sessionId: string): Promise<CheckoutSummary | null> {
  try {
    const res = await fetch(`/api/cart/${sessionId}/checkout`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return null
    }

    return res.json() as Promise<CheckoutSummary>
  } catch {
    return null
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      sessionId: newSessionId(),
      items: [],
      isOpen: false,
      isSyncing: false,
      hasHydrated: false,
      checkoutSummary: null,
      cartError: null,

      clearCartError: () => set({ cartError: null }),

      refreshCheckoutSummary: async () => {
        const requestToken = beginCartRequest()
        const summary = await fetchCheckoutSummary(get().sessionId)
        if (!isLatestCartRequest(requestToken)) return
        set({ checkoutSummary: summary })
      },

      hydrateCart: async () => {
        if (get().isSyncing) return

        const requestToken = beginCartRequest()
        set({ isSyncing: true })

        try {
          const cart = await requestCart(`/api/cart/${get().sessionId}`, { cache: 'no-store' })
          if (!isLatestCartRequest(requestToken)) return

          set({
            items: cart.items.map(mapCartItem),
            isOpen: false,
          })

          const summary = await fetchCheckoutSummary(get().sessionId)
          if (!isLatestCartRequest(requestToken)) return

          set({ checkoutSummary: summary })
        } catch (err) {
          console.error('Failed to hydrate cart', err)
        } finally {
          if (!isLatestCartRequest(requestToken)) return
          set({ isSyncing: false })
        }
      },

      addItem: async ({ quantity = 1, ...incoming }) => {
        const requestToken = beginCartRequest()
        set({ isSyncing: true, cartError: null })

        try {
          const cart = await requestCart(`/api/cart/${get().sessionId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productVariantId: incoming.variantId, quantity }),
          })
          if (!isLatestCartRequest(requestToken)) return

          set({
            items: cart.items.map(mapCartItem),
            isOpen: true,
          })

          const summary = await fetchCheckoutSummary(get().sessionId)
          if (!isLatestCartRequest(requestToken)) return

          set({ checkoutSummary: summary })
        } catch (err) {
          console.error('Failed to add item to cart', err)
          // Sessizce yutma: kullaniciya hata mesajini goster (orn. stok yetersiz/pasif urun).
          set({ cartError: err instanceof Error ? err.message : 'Ürün sepete eklenemedi.' })
        } finally {
          if (!isLatestCartRequest(requestToken)) return
          set({ isSyncing: false })
        }
      },

      removeItem: async (id) => {
        const requestToken = beginCartRequest()
        set({ isSyncing: true, cartError: null })

        try {
          const cart = await requestCart(`/api/cart/${get().sessionId}/items/${id}`, {
            method: 'DELETE',
          })
          if (!isLatestCartRequest(requestToken)) return

          set({ items: cart.items.map(mapCartItem) })

          const summary = await fetchCheckoutSummary(get().sessionId)
          if (!isLatestCartRequest(requestToken)) return

          set({ checkoutSummary: summary })
        } catch (err) {
          console.error('Failed to remove item from cart', err)
          // Sunucu ile senkron kalmak icin gercege geri don ve hatayi bildir.
          set({ cartError: err instanceof Error ? err.message : 'Ürün sepetten çıkarılamadı.' })
          void get().hydrateCart()
        } finally {
          if (!isLatestCartRequest(requestToken)) return
          set({ isSyncing: false })
        }
      },

      updateQuantity: (id, quantity) => {
        const nextQuantity = Math.max(1, Math.round(quantity))

        // 1) Optimistik: UI'i (adet + satir/ara toplam) aninda guncelle, satiri kilitleme.
        //    Token'i hemen artir; boylece halen ucan eski bir yanit optimistik durumu ezmez.
        beginCartRequest()
        set((state) => ({
          cartError: null,
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: nextQuantity } : item,
          ),
        }))

        // 2) Debounce: ayni urun icin hizli tiklamalari tek PATCH'te birlestir.
        const pending = quantitySyncTimers.get(id)
        if (pending) clearTimeout(pending)

        quantitySyncTimers.set(
          id,
          setTimeout(() => {
            quantitySyncTimers.delete(id)
            const targetQuantity = get().items.find((item) => item.id === id)?.quantity ?? nextQuantity
            const requestToken = beginCartRequest()

            void (async () => {
              try {
                const cart = await requestCart(`/api/cart/${get().sessionId}/items/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ quantity: targetQuantity }),
                })
                if (!isLatestCartRequest(requestToken)) return

                set({ items: cart.items.map(mapCartItem) })

                const summary = await fetchCheckoutSummary(get().sessionId)
                if (!isLatestCartRequest(requestToken)) return

                set({ checkoutSummary: summary })
              } catch (err) {
                console.error('Failed to update cart quantity', err)
                // Sunucu reddederse (orn. stok yetersiz) optimistik degisikligi gercege geri al ve bildir.
                set({ cartError: err instanceof Error ? err.message : 'Adet güncellenemedi.' })
                void get().hydrateCart()
              }
            })()
          }, QUANTITY_SYNC_DELAY_MS),
        )
      },

      clearCart: () => set({ items: [], checkoutSummary: null }),
      startNewCart: () =>
        set({
          sessionId: newSessionId(),
          items: [],
          checkoutSummary: null,
          isOpen: false,
          isSyncing: false,
        }),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
    }),
    {
      name: 'badebebe-cart',
      version: 2,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<CartState>

        return {
          ...currentState,
          sessionId: persisted.sessionId || currentState.sessionId,
          items: [],
          checkoutSummary: null,
          isOpen: false,
          isSyncing: false,
          hasHydrated: false,
        }
      },
      onRehydrateStorage: () => () => {
        useCartStore.setState({
          items: [],
          checkoutSummary: null,
          isOpen: false,
          hasHydrated: true,
        })
      },
      partialize: (state) => ({
        sessionId: state.sessionId,
      }),
    },
  ),
)

export const cartItemCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)

export const cartSubtotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
