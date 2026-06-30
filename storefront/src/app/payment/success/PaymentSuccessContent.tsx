'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const startNewCart = useCartStore((state) => state.startNewCart)
  const orderNumber = searchParams.get('orderNumber')

  useEffect(() => {
    // iyzico Ödeme Formu callback'i, formun kendi iframe'i icinde bu sayfayi acabilir.
    // Bu durumda sepeti temizleyen ana uygulama (ust pencere) hic yenilenmez ve sepet
    // dolu gorunur. iframe icindeysek ust pencereyi bu sayfaya tasi; ana uygulama yeniden
    // yuklenir, startNewCart calisir ve kullanici basari ekranini gercekten gorur.
    if (typeof window !== 'undefined' && window.top && window.top !== window.self) {
      window.top.location.href = window.location.href
      return
    }

    // Yeni session ile temiz sepet baslat; aksi halde odenmis (backend'de hala dolu) sepet
    // bir sonraki hydrate'te geri yuklenir.
    startNewCart()
  }, [startNewCart])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-14">
      <div className="w-full max-w-[520px] rounded-panel border border-line bg-white p-7 text-center">
        <h1 className="font-serif text-[26px] font-semibold text-brown">
          Odeme tamamlandi
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Siparisiniz alindi. Odeme onayi iyzico uzerinden basariyla dondu.
        </p>
        {orderNumber ? (
          <p className="mt-5 rounded-[12px] bg-cream-2 px-4 py-3 text-[13px] font-semibold text-brown-2">
            Siparis no: <span className="text-brown">{orderNumber}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
          >
            Alisverise devam et
          </Link>
          <Link
            href={orderNumber ? `/orders/track?orderNumber=${encodeURIComponent(orderNumber)}` : '/orders/track'}
            className="inline-flex rounded-[14px] border border-line bg-white px-7 py-3.5 text-[14px] font-bold text-brown transition-colors hover:bg-cream-2"
          >
            Siparisi takip et
          </Link>
        </div>
      </div>
    </div>
  )
}
