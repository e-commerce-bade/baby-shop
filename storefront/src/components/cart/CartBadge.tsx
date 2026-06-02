'use client'

import { useEffect, useState } from 'react'
import { useCartStore, cartItemCount } from '@/store/cartStore'

export default function CartBadge() {
  const [mounted, setMounted] = useState(false)
  const count = useCartStore(cartItemCount)

  useEffect(() => setMounted(true), [])

  if (!mounted || count === 0) return null

  return (
    <span className="absolute -right-3 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose px-1 text-[11px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
