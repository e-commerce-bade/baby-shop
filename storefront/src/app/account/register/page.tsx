'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const registerSchema = z
  .object({
    firstName: z.string().trim().max(100, 'Ad en fazla 100 karakter olabilir.').optional(),
    lastName: z.string().trim().max(100, 'Soyad en fazla 100 karakter olabilir.').optional(),
    phoneNumber: z.string().trim().max(30, 'Telefon en fazla 30 karakter olabilir.').optional(),
    email: z.string().trim().email('Geçerli bir e-posta adresi girin.'),
    password: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalıdır.')
      .max(255, 'Şifre en fazla 255 karakter olabilir.'),
    confirmPassword: z.string().min(1, 'Şifre tekrarını girin.'),
    acceptsTerms: z.boolean().refine((value) => value, {
      message: 'Devam etmek için kullanım koşullarını kabul edin.',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function AccountRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-cream-3" />}>
      <RegisterLayout />
    </Suspense>
  )
}

function RegisterLayout() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const nextPath = searchParams.get('next') || '/account'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptsTerms: false,
    },
  })

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          firstName: optionalValue(values.firstName),
          lastName: optionalValue(values.lastName),
          phoneNumber: optionalValue(values.phoneNumber),
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Hesap oluşturulamadı.')
      }

      router.replace(nextPath.startsWith('/') ? nextPath : '/account')
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Hesap oluşturulamadı.')
    }
  }

  return (
    <div className="min-h-[70vh] bg-cream-3 px-[38px] py-12 max-[680px]:px-4 max-[680px]:py-8">
      <div className="mx-auto max-w-[980px] overflow-hidden rounded-[22px] border border-line bg-white shadow-card">
        <div className="grid grid-cols-[420px_1fr] max-[900px]:grid-cols-1">
          <section className="relative overflow-hidden bg-[#F4E9DF] px-9 py-10 max-[680px]:px-6 max-[680px]:py-8">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose/10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-sage/10"
              aria-hidden="true"
            />

            <Link href="/" className="relative z-10 inline-flex items-center gap-2">
              <span className="font-serif text-[27px] font-semibold text-brown">MiniMori</span>
              <svg className="text-sage" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 21V9" />
                <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5z" />
                <path d="M12 11c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4z" />
              </svg>
            </Link>

            <div className="relative z-10 mt-12 max-w-[310px] max-[900px]:mt-7 max-[900px]:max-w-none">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-rose">
                MiniMori ailesi
              </p>
              <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.08] text-brown max-[680px]:text-[30px]">
                Küçük anlar için hesabınızı oluşturun
              </h1>
              <p className="mt-4 text-[14px] leading-relaxed text-brown-2">
                Siparişlerinizi takip edin, adres bilgilerinizi saklayın ve minikler için
                seçtiğiniz parçaları daha hızlı tamamlayın.
              </p>
            </div>

            <div className="relative z-10 mt-10 grid gap-3">
              {[
                ['Sipariş takibi', 'Oluşturduğunuz siparişleri hesabınızdan görün.'],
                ['Daha hızlı checkout', 'İleride adres defteriyle daha kısa alışveriş.'],
                ['Güvenli oturum', 'Token tarayıcı JS’ine açılmadan saklanır.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[14px] border border-line bg-white/70 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[13px] font-extrabold text-brown">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="px-9 py-10 max-[680px]:px-6 max-[680px]:py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-rose">
                  Hesap Oluştur
                </p>
                <h2 className="mt-2 font-serif text-[30px] font-semibold text-brown">
                  Hoş geldiniz
                </h2>
              </div>
              <Link
                href="/account/login"
                className="rounded-[12px] border border-line px-4 py-2 text-[12px] font-bold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk"
              >
                Giriş Yap
              </Link>
            </div>

            <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-7 space-y-4">
              <div className="grid grid-cols-2 gap-4 max-[620px]:grid-cols-1">
                <Field label="Ad" error={errors.firstName?.message}>
                  <input {...register('firstName')} autoComplete="given-name" className={inputClassName} placeholder="Adınız" />
                </Field>
                <Field label="Soyad" error={errors.lastName?.message}>
                  <input {...register('lastName')} autoComplete="family-name" className={inputClassName} placeholder="Soyadınız" />
                </Field>
              </div>

              <Field label="E-posta" required error={errors.email?.message}>
                <input {...register('email')} type="email" autoComplete="email" className={inputClassName} placeholder="ornek@email.com" />
              </Field>

              <Field label="Telefon" error={errors.phoneNumber?.message}>
                <input {...register('phoneNumber')} type="tel" autoComplete="tel" className={inputClassName} placeholder="+90 555 000 00 00" />
              </Field>

              <div className="grid grid-cols-2 gap-4 max-[620px]:grid-cols-1">
                <Field label="Şifre" required error={errors.password?.message}>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`${inputClassName} pr-11`}
                      placeholder="En az 8 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-brown"
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </Field>
                <Field label="Şifre Tekrar" required error={errors.confirmPassword?.message}>
                  <input
                    {...register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={inputClassName}
                    placeholder="Şifrenizi tekrar girin"
                  />
                </Field>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-brown-2">
                <input
                  {...register('acceptsTerms')}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-rose"
                />
                <span>
                  Kullanım koşullarını ve gizlilik politikasını kabul ediyorum.
                  {errors.acceptsTerms ? (
                    <span className="mt-1 block text-[12px] font-semibold text-rose-dk">
                      {errors.acceptsTerms.message}
                    </span>
                  ) : null}
                </span>
              </label>

              {submitError ? (
                <p className="rounded-[12px] border border-rose-soft bg-rose-tint px-4 py-3 text-[13px] font-semibold text-rose-dk">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[14px] bg-rose py-4 text-[15px] font-bold text-white transition-colors hover:bg-rose-dk disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
              </button>
            </form>

            <p className="mt-5 text-center text-[12.5px] text-muted">
              Zaten hesabınız var mı?{' '}
              <Link href="/account/login" className="font-bold text-rose hover:text-rose-dk">
                Giriş yapın
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

function optionalValue(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

const inputClassName =
  'mt-1.5 w-full rounded-[12px] border border-line bg-cream-3 px-4 py-3 text-[14px] text-brown outline-none transition-colors placeholder:text-muted focus:border-rose-soft focus:bg-white'

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-brown-2">
        {label}
        {!required ? <span className="ml-1 font-normal text-muted">(Opsiyonel)</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-semibold text-rose-dk">{error}</span> : null}
    </label>
  )
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
