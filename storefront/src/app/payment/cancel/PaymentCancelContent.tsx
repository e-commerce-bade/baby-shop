'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function PaymentCancelContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('orderNumber')

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-14">
      <div className="w-full max-w-[520px] rounded-panel border border-line bg-white p-7 text-center">
        <h1 className="font-serif text-[26px] font-semibold text-brown">
          Odeme tamamlanamadi
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Odeme basarisiz oldu ya da iptal edildi. Sepetinizdeki urunlerle tekrar deneyebilirsiniz.
        </p>
        {orderNumber ? (
          <p className="mt-5 rounded-[12px] bg-cream-2 px-4 py-3 text-[13px] font-semibold text-brown-2">
            Siparis no: <span className="text-brown">{orderNumber}</span>
          </p>
        ) : null}
        <Link
          href="/cart"
          className="mt-6 inline-flex rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
        >
          Sepete don
        </Link>
      </div>
    </div>
  )
}
