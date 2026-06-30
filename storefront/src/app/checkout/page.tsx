'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCartStore, cartSubtotal } from '@/store/cartStore'
import CheckoutSteps from '@/components/checkout/CheckoutSteps'
import CheckoutSection from '@/components/checkout/CheckoutSection'
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary'

// ─── Schema (değiştirilmedi) ──────────────────────────────────────────────────

const checkoutSchema = z
  .object({
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
    createAccount: z.boolean().optional(),
    password:  z.string().max(255).optional(),
    saveAddress: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Hesap olusturma secildiyse sifre zorunlu (backend min 8 ile uyumlu).
    if (data.createAccount && (data.password ?? '').length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Şifre en az 8 karakter olmalı.',
      })
    }
  })

type CheckoutFormValues = z.infer<typeof checkoutSchema>

interface OrderResponse {
  orderNumber: string
  status: string
  totalAmount: number | string
  currency: string
}

interface PaymentResponse {
  paymentPageUrl: string | null
  checkoutFormContent: string | null
}

function optionalValue(value?: string) {
  const v = value?.trim()
  return v ? v : undefined
}

// iyzico Ödeme Formu'nun enjekte ettigi tum scriptleri ve global state'i kaldirir.
// Modal kapatilip tekrar acildiginda formun yeniden render olabilmesi icin sart;
// aksi halde bayat global state (iyziInit / dinamik checkoutform.js) yuzunden bos gorunur.
function cleanupIyzico() {
  document
    .querySelectorAll('script[data-iyzico="true"], script[src*="iyzipay"], script[src*="iyzico"]')
    .forEach((el) => el.remove())
  const container = document.getElementById('iyzipay-checkout-form')
  if (container) container.innerHTML = ''
  const w = window as unknown as { iyziInit?: unknown }
  w.iyziInit = undefined
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
  const [checkoutFormContent, setCheckoutFormContent] = useState<string | null>(null)
  // iyzico script'inin enjekte edilecegi React-yonetimli kapsayici (document.body yerine).
  const iyzicoContainerRef = useRef<HTMLDivElement>(null)

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: 'Türkiye' },
  })
  const createAccount = watch('createAccount')
  const saveAddress = watch('saveAddress')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/account/me', { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((res) => { if (active) setIsLoggedIn(res.ok) })
      .catch(() => { if (active) setIsLoggedIn(false) })
    return () => { active = false }
  }, [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !hasHydrated) return
    void refreshCheckoutSummary()
  }, [hasHydrated, mounted, refreshCheckoutSummary])

  // iyzico Ödeme Formu icerigini (script), document.body yerine React-yonetimli modal
  // kapsayicisina enjekte et: boylece kapanista React dugumleri kaldirir, body kirlenmez ve
  // form ust pencerede render olur (3DS / callback yonlendirmesi etkilenmez).
  // innerHTML script calistirmaz; createContextualFragment calistirilabilir script dugumleri uretir.
  useEffect(() => {
    if (!checkoutFormContent) return
    const target = iyzicoContainerRef.current
    if (!target) return
    // Modal viewport'a gore ortalanir; onceki scroll konumu kalintisi kalmasin diye basa al.
    window.scrollTo({ top: 0, left: 0 })

    // iyzico'nun dis kaynakli script'leri ve global state'inden kalan artiklari temizle.
    cleanupIyzico()

    const range = document.createRange()
    range.selectNode(target)
    const fragment = range.createContextualFragment(checkoutFormContent)
    // Script, #iyzipay-checkout-form'un kardesi olarak eklenir; iyzico render edince
    // yalnizca o div'in icerigini gunceller, script dugumu yerinde kalir.
    fragment.querySelectorAll('script').forEach((s) => s.setAttribute('data-iyzico', 'true'))
    target.appendChild(fragment)

    return () => {
      // React kapsayiciyi (ve bizim script'imizi) zaten kaldirir; iyzico'nun dis
      // script/global artiklarini burada temizleriz.
      cleanupIyzico()
    }
  }, [checkoutFormContent])

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null)
    try {
      // Hesap olustur seciliyse once kayit ol: basarili kayit auth cookie'sini set eder,
      // boylece asagidaki siparis bu yeni hesaba baglanir.
      if (values.createAccount) {
        const registerRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: values.customerEmail,
            password: values.password,
            firstName: optionalValue(values.customerFirstName),
            lastName: optionalValue(values.customerLastName),
            phoneNumber: optionalValue(values.customerPhone),
          }),
        })
        if (!registerRes.ok) {
          const regBody = (await registerRes.json().catch(() => null)) as { message?: string } | null
          const message = registerRes.status === 409
            ? 'Bu e-posta ile zaten bir hesap var. Giriş yapın ya da "hesap oluştur" seçeneğini kaldırıp misafir olarak devam edin.'
            : (regBody?.message ?? 'Hesap oluşturulamadı. Lütfen tekrar deneyin.')
          throw new Error(message)
        }
      }

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
        const message = payload?.message ?? `Sipariş oluşturulamadı (${res.status}).`
        // Sepet zaten siparise donusmus (CHECKED_OUT): yeni sepet baslat ki kullanici sikismasin.
        if (res.status === 400 && /not active for checkout/i.test(message)) {
          startNewCart()
          throw new Error('Bu sepet zaten işleme alınmış. Sepetinizi sıfırladık; lütfen ürünleri tekrar ekleyip yeniden deneyin.')
        }
        throw new Error(message)
      }
      const order = payload as OrderResponse

      // Adresi kaydet (best-effort): yalnizca oturum acik ya da bu checkout'ta hesap olusturulduysa
      // anlamli; basarisiz olursa siparisi engellemeden sessizce gecilir.
      if (values.saveAddress && (isLoggedIn || values.createAccount)) {
        try {
          await fetch('/api/account/addresses', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: 'Teslimat',
              recipientFirstName: values.customerFirstName?.trim() || '-',
              recipientLastName: values.customerLastName?.trim() || '-',
              phoneNumber: optionalValue(values.customerPhone),
              line1: values.line1,
              line2: optionalValue(values.line2),
              district: values.district,
              city: values.city,
              postalCode: optionalValue(values.postalCode),
              country: values.country,
              // Yeni hesapta ilk adres varsayilan olsun; mevcut kullanicinin varsayilanini degistirme.
              defaultAddress: Boolean(values.createAccount),
            }),
          })
        } catch {
          // sessizce gec
        }
      }

      // Başarı ekranında sipariş özetini gösterebilmek için sipariş no + e-postayı yalnızca bu
      // sekmede (sessionStorage) sakla. E-posta URL'e konmaz; success sayfası bunu okuyup özeti çeker.
      try {
        sessionStorage.setItem(
          'badebebe_last_order',
          JSON.stringify({ orderNumber: order.orderNumber, email: values.customerEmail }),
        )
      } catch { /* sessionStorage erisilemezse ozet gosterilemez, kritik degil */ }

      // Sipariş oluşturuldu; iyzico güvenli ödeme sayfasını başlat.
      const origin = window.location.origin
      const paymentRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          provider: 'IYZICO',
          successUrl: `${origin}/payment/success`,
          cancelUrl: `${origin}/payment/cancel`,
        }),
      })
      const paymentPayload = await paymentRes.json().catch(() => null)
      if (!paymentRes.ok) {
        throw new Error(paymentPayload?.message ?? `Ödeme başlatılamadı (${paymentRes.status}).`)
      }

      const payment = paymentPayload as PaymentResponse | null

      // Tercih: iyzico Ödeme Formu'nu sayfa icinde modalda goster (musteri sayfadan ayrilmaz).
      const formContent = payment?.checkoutFormContent
      if (formContent && formContent.trim()) {
        // Sepet kasitli korunur: odeme iptal/basarisiz olursa kullanici ayni sepetle
        // yeniden deneyebilir. Sepet, ancak odeme basarili olunca /payment/success'te sifirlanir.
        setCheckoutFormContent(formContent)
        return
      }

      // Yedek: form icerigi yoksa iyzico'nun barindirilan odeme sayfasina yonlendir.
      const paymentPageUrl = payment?.paymentPageUrl
      if (!paymentPageUrl) {
        throw new Error('Ödeme sayfası oluşturulamadı.')
      }
      window.location.href = paymentPageUrl
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Sipariş oluşturulamadı.')
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!mounted || !hasHydrated || isSyncing) {
    return <div className="min-h-[60vh]" />
  }

  // ── iyzico Ödeme Formu açık (sipariş oluşturuldu, sepet tüketildi) ─────────
  // Sepet durumundan bağımsız göster; aksi halde aşağıdaki boş-sepet guard'ı modalı gizler.
  if (checkoutFormContent) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-[480px] rounded-panel border border-line bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-[18px] font-semibold text-brown">Güvenli Ödeme</h2>
              <button
                type="button"
                onClick={() => setCheckoutFormContent(null)}
                aria-label="Kapat"
                className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-cream-2 hover:text-brown"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
              Kart bilgileriniz iyzico&apos;nun güvenli altyapısında işlenir. Ödeme tamamlanınca otomatik yönlendirileceksiniz.
            </p>
            <div ref={iyzicoContainerRef}>
              <div id="iyzipay-checkout-form" className="responsive" />
            </div>
          </div>
        </div>
      </div>
    )
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
              Bade Bebe
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
            <a href="mailto:destek@badebebe.com" className="text-rose underline underline-offset-2 hover:text-rose-dk">
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
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-brown-2">
                <input
                  type="checkbox"
                  {...register('createAccount')}
                  className="h-4 w-4 rounded border-line accent-rose"
                />
                Bir dahaki alışverişim için hesap oluştur
              </label>

              {createAccount && (
                <div className="mt-3">
                  <Field label="Şifre" required error={errors.password?.message}>
                    <input
                      {...register('password')}
                      type="password"
                      autoComplete="new-password"
                      placeholder="En az 8 karakter"
                      className={inputCls}
                    />
                  </Field>
                  <p className="mt-1.5 text-[12px] text-muted">
                    Hesabınız bu e-posta ile oluşturulur; siparişiniz hesabınıza kaydedilir.
                  </p>
                </div>
              )}
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
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-brown-2">
                <input
                  type="checkbox"
                  {...register('saveAddress')}
                  className="h-4 w-4 rounded border-line accent-rose"
                />
                Bu adresi bir sonraki alışveriş için kaydet
              </label>
              {saveAddress && !isLoggedIn && !createAccount && (
                <p className="mt-1.5 text-[12px] text-muted">
                  Adresi kaydetmek için yukarıdan hesap oluşturun veya giriş yapın.
                </p>
              )}
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
              {isSubmitting ? 'Hazırlanıyor...' : 'Ödemeye Geç'}
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
