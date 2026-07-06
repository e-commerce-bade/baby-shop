'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { fetchStoreSettings, type StoreSettings } from '@/lib/storeSettings'

interface SummaryItem {
  id: number
  productName: string
  variantLabel: string | null
  quantity: number
  lineTotal: number | string
  currency: string
}

interface OrderSummary {
  subtotalAmount: number | string
  shippingAmount: number | string
  totalAmount: number | string
  currency: string
  items: SummaryItem[]
}

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const startNewCart = useCartStore((state) => state.startNewCart)
  const orderNumber = searchParams.get('orderNumber')
  // Ödeme yöntemi: COD (kapıda) / EFT (havale) / null (kart, iyzico).
  const method = searchParams.get('method')
  const isOffline = method === 'COD' || method === 'EFT'
  const [email, setEmail] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)

  // EFT/havale siparişinde IBAN bilgilerini göstermek için mağaza ayarlarını çek.
  useEffect(() => {
    if (method !== 'EFT') return
    let active = true
    void fetchStoreSettings().then((s) => { if (active) setStoreSettings(s) })
    return () => { active = false }
  }, [method])

  useEffect(() => {
    // iyzico Ödeme Formu callback'i, formun kendi iframe'i icinde bu sayfayi acabilir.
    // iframe icindeysek ust pencereyi bu sayfaya tasi; ana uygulama yeniden yuklenir,
    // startNewCart calisir ve kullanici basari ekranini gercekten gorur.
    if (typeof window !== 'undefined' && window.top && window.top !== window.self) {
      window.top.location.href = window.location.href
      return
    }

    // Yeni session ile temiz sepet baslat; aksi halde odenmis sepet bir sonraki hydrate'te geri gelir.
    startNewCart()

    if (!orderNumber) return

    // Checkout'ta saklanan (bu sekme) e-posta ile sipariş özetini çek. Tek seferliktir.
    let stored: { orderNumber?: string; email?: string } | null = null
    try {
      const raw = sessionStorage.getItem('badebebe_last_order')
      if (raw) stored = JSON.parse(raw) as { orderNumber?: string; email?: string }
    } catch { /* yok say */ }

    if (!stored?.email || stored.orderNumber !== orderNumber) return
    const customerEmail = stored.email
    setEmail(customerEmail)
    try { sessionStorage.removeItem('badebebe_last_order') } catch { /* yok say */ }

    let active = true
    fetch('/api/orders/track', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber, email: customerEmail }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data) setOrder(data as OrderSummary) })
      .catch(() => { /* özet gosterilemezse sorun degil */ })

    return () => { active = false }
  }, [startNewCart, orderNumber])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-14">
      <div className="w-full max-w-[520px] rounded-panel border border-line bg-white p-7 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#EDF7F1]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1A6640" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-serif text-[26px] font-semibold text-brown">
          {isOffline ? 'Siparişiniz alındı' : 'Ödeme tamamlandı'}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          {method === 'COD'
            ? 'Siparişiniz alındı. Ödemeyi teslimat sırasında kapıda nakit olarak yapabilirsiniz.'
            : method === 'EFT'
              ? 'Siparişiniz alındı. Havale/EFT ödemenizi aşağıdaki hesaba yaptığınızda siparişiniz hazırlanmaya başlanır.'
              : 'Siparişiniz alındı. Ödeme onayı iyzico üzerinden başarıyla döndü.'}
        </p>

        {/* EFT/Havale bilgileri */}
        {method === 'EFT' && (
          <div className="mt-5 rounded-[14px] border border-[#F0E2C8] bg-[#FFF8EC] p-4 text-left text-[13px] leading-relaxed text-brown-2">
            <p className="mb-2 font-bold text-[#8A6D1F]">Havale / EFT Bilgileri</p>
            <p><span className="text-muted">Banka:</span> <span className="font-semibold">{storeSettings?.bankTransferBankName ?? '—'}</span></p>
            <p><span className="text-muted">Hesap Sahibi:</span> <span className="font-semibold">{storeSettings?.bankTransferAccountName ?? '—'}</span></p>
            <p className="break-all"><span className="text-muted">IBAN:</span> <span className="font-mono font-semibold">{storeSettings?.bankTransferIban ?? '—'}</span></p>
            {orderNumber && (
              <p className="mt-2 text-[12px] text-muted">
                Açıklama kısmına sipariş numaranızı (<span className="font-mono font-semibold text-brown-2">{orderNumber}</span>) yazmayı unutmayın.
              </p>
            )}
          </div>
        )}

        {orderNumber ? (
          <p className="mt-5 rounded-[12px] bg-cream-2 px-4 py-3 text-[13px] font-semibold text-brown-2">
            Sipariş no: <span className="font-mono text-brown">{orderNumber}</span>
          </p>
        ) : null}

        {email ? (
          <p className="mt-3 text-[13px] text-muted">
            Sipariş onayı <span className="font-semibold text-brown-2">{email}</span> adresine gönderildi.
          </p>
        ) : null}

        {order ? (
          <div className="mt-5 rounded-[14px] border border-line bg-cream-3 p-4 text-left">
            <div className="divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-brown">{item.productName}</p>
                    <p className="text-[11.5px] text-muted">
                      {[item.variantLabel, `${item.quantity} adet`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-bold text-brown">
                    {formatPrice(item.lineTotal, item.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
              <div className="flex justify-between text-brown-2">
                <span>Ara toplam</span>
                <span className="font-semibold text-brown">{formatPrice(order.subtotalAmount, order.currency)}</span>
              </div>
              <div className="flex justify-between text-brown-2">
                <span>Kargo</span>
                <span className="font-semibold text-brown">
                  {Number(order.shippingAmount) === 0 ? 'Ücretsiz' : formatPrice(order.shippingAmount, order.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5 font-bold text-brown">
                <span>Toplam</span>
                <span className="font-serif text-[15px]">{formatPrice(order.totalAmount, order.currency)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
          >
            Alışverişe devam et
          </Link>
          <Link
            href={orderNumber ? `/orders/track?orderNumber=${encodeURIComponent(orderNumber)}` : '/orders/track'}
            className="inline-flex rounded-[14px] border border-line bg-white px-7 py-3.5 text-[14px] font-bold text-brown transition-colors hover:bg-cream-2"
          >
            Siparişi takip et
          </Link>
        </div>
      </div>
    </div>
  )
}
