'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

export default function CartSyncProvider() {
  const hasHydrated = useCartStore((state) => state.hasHydrated)
  const hydrateCart = useCartStore((state) => state.hydrateCart)

  useEffect(() => {
    if (!hasHydrated) {
      useCartStore.setState({ hasHydrated: true })
      return
    }

    void hydrateCart()
  }, [hasHydrated, hydrateCart])

  return null
}
