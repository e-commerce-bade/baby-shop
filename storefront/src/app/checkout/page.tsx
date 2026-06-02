'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatPrice } from '@/lib/utils'
import { useCartStore, cartSubtotal } from '@/store/cartStore'
import CheckoutSteps from '@/components/checkout/CheckoutSteps'
import CheckoutSection from '@/components/checkout/CheckoutSection'
import ShippingMethodSelector from '@/components/checkout/ShippingMethodSelector'
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary'

// ─── Schema (değiştirilmedi) ──────────────────────────────────────────────────

const checkoutSchema = z.object({
  customerEmail:     z.string().trim().email('Geçerli bir e-posta adresi girin.'),
  customerFirstName: z.string().trim().max(100).optional(),
  customerLastName:  z.string().trim().max(100).optional(),
  customerPhone:     z.string().trim().max(30).optional(),
  line1:     z.string().trim().min(1, 'Adres zorunludur.').max(255),
  line2:     z.string().trim().max(255).optional(),
  district:  z.string().trim().min(1, 'İlçe zorunludur.').max(120),
  city:      z.string().trim().min(1, 'Şehir zorunludur.').max(120),
  postalCode:z.string().trim().max(20).optional(),
  country:   z.string().trim().min(1, 'Ülke zorunludur.').max(100),
  notes:     z.string().trim().max(2000).optional(),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

interface OrderResponse {
  orderNumber: string
  status: string
  totalAmount: number | string
  currency: string
}

function optionalValue(value?: string) {
  const v = value?.trim()
  return v ? v : undefined
}

// ─── Input & Field helpers ────────────────────────────────────────────────────

const inputCls =
  'mt-1.5 w-full rounded-[12px] border border-line bg-cream-3 px-4 py-3 text-[14px] text-brown outline-none transition-colors focus:border-rose-soft focus:bg-white placeholder:text-muted'

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col ${className ?? ''}`}>
      <span className="text-[13px] font-bold text-brown-2">
        {label}
        {!required && <span className="ml-1 font-normal text-muted">(Opsiyonel)</span>}
      </span>
      {children}
      {error && <span className="mt-1 text-[12px] font-semibold text-rose-dk">{error}</span>}
    </label>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [mounted, setMounted]         = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null)
  const [shipping, setShipping]       = useState('standard')

  const sessionId              = useCartStore((s) => s.sessionId)
  const hasHydrated            = useCartStore((s) => s.hasHydrated)
  const isSyncing              = useCartStore((s) => s.isSyncing)
  const items                  = useCartStore((s) => s.items)
  const summary                = useCartStore((s) => s.checkoutSummary)
  const localSubtotal          = useCartStore(cartSubtotal)
  const refreshCheckoutSummary = useCartStore((s) => s.refreshCheckoutSummary)
  const startNewCart           = useCartStore((s) => s.startNewCart)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: 'Türkiye' },
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !hasHydrated || createdOrder) return
    void refreshCheckoutSummary()
  }, [createdOrder, hasHydrated, mounted, refreshCheckoutSummary])

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          customerEmail:     values.customerEmail,
          customerFirstName: optionalValue(values.customerFirstName),
          customerLastName:  optionalValue(values.customerLastName),
          customerPhone:     optionalValue(values.customerPhone),
          shippingAddress: {
            line1:      values.line1,
            line2:      optionalValue(values.line2),
            district:   values.district,
            city:       values.city,
            postalCode: optionalValue(values.postalCode),
            country:    values.country,
          },
          notes: optionalValue(values.notes),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.message ?? `Sipariş oluşturulamadı (${res.status}).`)
      }
      setCreatedOrder(payload as OrderResponse)
      startNewCart()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Sipariş oluşturulamadı.')
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!mounted || !hasHydrated || isSyncing) {
    return <div className="min-h-[60vh]" />
  }

  // ── Sipariş oluşturuldu ────────────────────────────────────────────────────
  if (createdOrder) {
    return <OrderConfirmation order={createdOrder} />
  }

  // ── Sepet boş / checkout için hazır değil ─────────────────────────────────
  if (items.length === 0 || summary?.readyForCheckout === false) {
    return <CartNotReady />
  }

  const currency = summary?.currency ?? items[0]?.currency ?? 'TRY'
  const subtotal = summary?.subtotal ?? localSubtotal

  return (
    <div className="min-h-screen bg-cream-3">
      {/* ── Checkout header ──────────────────────────────────────────────── */}
      <header className="border-b border-line bg-white px-[38px] py-4 max-[680px]:px-5">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          {/* Logo + geri */}
          <div>
            <Link href="/" className="font-serif text-[22px] font-semibold text-brown">
              MiniMori
            </Link>
            <div className="mt-0.5">
              <Link
                href="/cart"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted transition-colors hover:text-rose-dk"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Sepete Dön
              </Link>
            </div>
          </div>

          {/* Adım göstergesi */}
          <CheckoutSteps current={2} />

          {/* Yardım */}
          <div className="hidden text-right text-[12px] text-muted sm:block">
            <p className="font-semibold">Yardıma mı ihtiyacınız var?</p>
            <a href="mailto:destek@minimori.com" className="text-rose underline underline-offset-2 hover:text-rose-dk">
              Bize yazın
            </a>
          </div>
        </div>
      </header>

      {/* ── Ana içerik ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1200px] px-[38px] py-8 max-[980px]:px-6 max-[680px]:px-4 max-[680px]:py-5">
        <div className="grid grid-cols-[1fr_360px] items-start gap-7 max-[980px]:grid-cols-1">

          {/* SOL: form bölümleri ─────────────────────────────────────────── */}
          <form
            id="checkout-form"
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-5"
          >
            {/* 1. Müşteri Bilgileri */}
            <CheckoutSection
              num={1}
              title="Müşteri Bilgileri"
              subtitle="Siparişinizi takip etmenizi kolaylaştırmak için kullanacağız."
            >
              <div className="grid grid-cols-2 gap-4 max-[680px]:grid-cols-1">
                <Field label="Ad" required error={errors.customerFirstName?.message}>
                  <input {...register('customerFirstName')} placeholder="Adınız" className={inputCls} />
                </Field>
                <Field label="Soyad" required error={errors.customerLastName?.message}>
                  <input {...register('customerLastName')} placeholder="Soyadınız" className={inputCls} />
                </Field>
                <Field label="E-posta" required error={errors.customerEmail?.message}>
                  <input {...register('customerEmail')} type="email" placeholder="ornek@email.com" className={inputCls} />
                </Field>
                <Field label="Telefon" error={errors.customerPhone?.message}>
                  <input {...register('customerPhone')} type="tel" placeholder="+90 555 000 00 00" className={inputCls} />
                </Field>
              </div>
              {/* UI-only checkbox */}
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-brown-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line accent-rose"
                />
                Bir dahaki alışverişim için hesap oluştur
              </label>
            </CheckoutSection>

            {/* 2. Teslimat Adresi */}
            <CheckoutSection
              num={2}
              title="Teslimat Adresi"
              subtitle="Siparişinizin gönderileceği adres."
            >
              <div className="grid grid-cols-2 gap-4 max-[680px]:grid-cols-1">
                <Field label="Ülke / Bölge" required error={errors.country?.message} className="col-span-2 max-[680px]:col-span-1">
                  <input {...register('country')} placeholder="Türkiye" className={inputCls} />
                </Field>
                <Field label="Adres" required error={errors.line1?.message} className="col-span-2 max-[680px]:col-span-1">
                  <input {...register('line1')} placeholder="Cadde, mahalle, bina no..." className={inputCls} />
                </Field>
                <Field label="Daire / Kat" error={errors.line2?.message} className="col-span-2 max-[680px]:col-span-1">
                  <input {...register('line2')} placeholder="Daire, kat, blok (opsiyonel)" className={inputCls} />
                </Field>
                <Field label="Şehir" required error={errors.city?.message}>
                  <input {...register('city')} placeholder="İstanbul" className={inputCls} />
                </Field>
                <Field label="İlçe" required error={errors.district?.message}>
                  <input {...register('district')} placeholder="Beşiktaş" className={inputCls} />
                </Field>
                <Field label="Posta Kodu" error={errors.postalCode?.message}>
                  <input {...register('postalCode')} placeholder="34000" className={inputCls} />
                </Field>
              </div>
              {/* UI-only checkbox */}
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-brown-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line accent-rose"
                />
                Bu adresi bir sonraki alışveriş için kaydet
              </label>
            </CheckoutSection>

            {/* 3. Kargo Yöntemi */}
            <CheckoutSection
              num={3}
              title="Kargo Yöntemi"
              subtitle="Siparişinizin nasıl teslim edileceğini seçin."
            >
              <ShippingMethodSelector
                selected={shipping}
                onChange={setShipping}
              />
              <p className="mt-3 text-[11.5px] text-muted">
                * Kargo fiyatları gösterim amaçlıdır. Gerçek kargo ücreti sipariş oluşturulduğunda backend tarafından hesaplanır.
              </p>
            </CheckoutSection>

            {/* 4. Ödeme */}
            <CheckoutSection
              num={4}
              title="Ödeme"
              subtitle="Tüm işlemler güvenli ve şifreli."
            >
              <div className="flex flex-col items-center gap-3 rounded-[14px] border border-line bg-cream-3 px-5 py-7 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-cream-2 text-muted">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="5" width="20" height="14" rx="3" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <p className="text-[13.5px] font-semibold text-brown-2">
                  Ödeme bilgilerinizi bir sonraki adımda girebileceksiniz.
                </p>
                <p className="text-[12px] text-muted">
                  Visa, Mastercard, Amex ve daha fazlası desteklenmektedir.
                </p>
              </div>
            </CheckoutSection>

            {/* Sipariş notu */}
            <div className="rounded-[18px] border border-line bg-white p-5">
              <Field label="Sipariş Notu" error={errors.notes?.message}>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Teslimat hakkında özel notunuz var mı?"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Submit error */}
            {submitError && (
              <p className="rounded-[12px] border border-rose-soft bg-rose-tint px-4 py-3 text-[13px] font-semibold text-rose-dk">
                {submitError}
              </p>
            )}

            {/* Mobile CTA — sadece küçük ekranda görünür, sağ panel gizlendiğinde */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[14px] bg-rose py-4 text-[15px] font-bold text-white transition-colors hover:bg-rose-dk disabled:opacity-60 lg:hidden"
            >
              {isSubmitting ? 'Sipariş Oluşturuluyor...' : 'Siparişi Tamamla'}
            </button>
          </form>

          {/* SAĞ: sipariş özeti ──────────────────────────────────────────── */}
          <div className="max-[980px]:order-first">
            <CheckoutOrderSummary isSubmitting={isSubmitting} />
          </div>

        </div>
      </main>
    </div>
  )
}

// ─── Alt görünümler ───────────────────────────────────────────────────────────

function OrderConfirmation({ order }: { order: OrderResponse }) {
  return (
    <div className="min-h-screen bg-cream-3 px-5 py-14">
      <div className="mx-auto max-w-[560px] rounded-panel border border-line bg-white px-8 py-10 text-center shadow-card">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[#E2EAD8] text-sage">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-rose">
          Sipariş Alındı
        </p>
        <h1 className="mt-2 font-serif text-[30px] font-semibold text-brown">
          Teşekkürler!
        </h1>
        <p className="mx-auto mt-3 max-w-[420px] text-[13.5px] leading-relaxed text-muted">
          Siparişiniz başarıyla oluşturuldu. Ödeme entegrasyonu tamamlandığında bu adım ödeme sayfasına yönlendirecek.
        </p>

        <div className="mt-6 divide-y divide-line rounded-[14px] border border-line bg-cream-3 text-left">
          {[
            { label: 'Sipariş No', value: order.orderNumber },
            { label: 'Durum',      value: order.status },
            { label: 'Toplam',     value: formatPrice(order.totalAmount, order.currency) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4 px-5 py-3 text-[13px]">
              <span className="text-muted">{label}</span>
              <span className="font-bold text-brown">{value}</span>
            </div>
          ))}
        </div>

        <Link
          href="/products"
          className="mt-8 inline-flex rounded-[14px] bg-rose px-8 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
        >
          Alışverişe Devam Et
        </Link>
      </div>
    </div>
  )
}

function CartNotReady() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-5 text-center">
      <h1 className="font-serif text-[26px] font-semibold text-brown">
        Sepetiniz hazır değil
      </h1>
      <p className="max-w-[420px] text-[13.5px] leading-relaxed text-muted">
        Sipariş oluşturmak için önce sepete ürün ekleyin.
      </p>
      <Link
        href="/products"
        className="rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
      >
        Ürünleri Keşfet
      </Link>
    </div>
  )
}
