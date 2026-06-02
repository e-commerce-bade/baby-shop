'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

export default function CartSyncProvider() {
  const hydrateCart = useCartStore((state) => state.hydrateCart)

  useEffect(() => {
    void hydrateCart()
  }, [hydrateCart])

  return null
}
