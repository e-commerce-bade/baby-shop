'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import type { CheckoutSummary } from '@/types/cart'

const FREE_SHIPPING_THRESHOLD = 1500

interface Props {
  subtotal: number
  currency: string
  onCheckout?: () => void
}

export default function CartSummary({ subtotal, currency, onCheckout }: Props) {
  const sessionId = useCartStore((state) => state.sessionId)
  const itemCount = useCartStore((state) => state.items.length)
  const [summary, setSummary] = useState<CheckoutSummary | null>(null)

  useEffect(() => {
    if (itemCount === 0) {
      setSummary(null)
      return
    }

    let cancelled = false

    async function loadSummary() {
      try {
        const response = await fetch(`/api/cart/${sessionId}/checkout`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Checkout summary failed: ${response.status}`)
        }

        const payload = (await response.json()) as CheckoutSummary
        if (!cancelled) {
          setSummary(payload)
        }
      } catch (error) {
        console.error('Failed to fetch checkout summary', error)
        if (!cancelled) {
          setSummary(null)
        }
      }
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [itemCount, sessionId])

  const effectiveSubtotal = summary ? parseFloat(summary.subtotal) : subtotal
  const effectiveCurrency = summary?.currency ?? currency
  const shipping = summary
    ? parseFloat(summary.shippingAmount)
    : effectiveSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : 99
  const total = summary ? parseFloat(summary.totalAmount) : effectiveSubtotal + shipping
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - effectiveSubtotal)
  const isFreeShipping = remaining === 0
  const progress = Math.min(100, (effectiveSubtotal / FREE_SHIPPING_THRESHOLD) * 100)

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] bg-cream-2 p-3.5">
        {isFreeShipping ? (
          <p className="text-center text-[12.5px] font-semibold text-sage">
            ✓ Ücretsiz kargo kazandın!
          </p>
        ) : (
          <>
            <p className="mb-2 text-[12px] font-semibold text-brown-2">
              Ücretsiz kargo için{' '}
              <span className="font-bold text-brown">
                {formatPrice(remaining, effectiveCurrency)}
              </span>{' '}
              daha ekle
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-rose transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-2.5 text-[13.5px]">
        <div className="flex justify-between text-brown-2">
          <span>Ara toplam</span>
          <span className="font-semibold text-brown">
            {formatPrice(effectiveSubtotal, effectiveCurrency)}
          </span>
        </div>
        <div className="flex justify-between text-brown-2">
          <span>Kargo</span>
          <span className={isFreeShipping ? 'font-semibold text-sage' : 'font-semibold text-brown'}>
            {isFreeShipping ? 'Ücretsiz' : formatPrice(shipping, effectiveCurrency)}
          </span>
        </div>
        <div className="flex justify-between border-t border-line pt-2.5 font-bold text-brown">
          <span>Toplam</span>
          <span className="font-serif text-[17px]">
            {formatPrice(total, effectiveCurrency)}
          </span>
        </div>
      </div>

      {onCheckout ? (
        <button
          type="button"
          onClick={onCheckout}
          className="w-full rounded-[14px] bg-rose py-4 text-[15px] font-bold text-white transition-colors hover:bg-rose-dk"
        >
          Siparişi Tamamla
        </button>
      ) : (
        <Link
          href="/cart"
          className="block w-full rounded-[14px] bg-rose py-4 text-center text-[15px] font-bold text-white transition-colors hover:bg-rose-dk"
        >
          Siparişi Tamamla
        </Link>
      )}

      <p className="text-center text-[11px] text-muted">
        Güvenli ödeme · SSL şifreli
      </p>
    </div>
  )
}
