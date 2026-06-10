'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

// ─── Schema (değişmedi) ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().trim().email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-cream-3" />}>
      <LoginLayout />
    </Suspense>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function LoginLayout() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const nextPath = searchParams.get('next') || '/account'
  const googleButtonRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.message ?? 'Giriş yapılamadı.')
      if (payload?.role === 'ADMIN') {
        router.replace('/admin')
      } else {
        router.replace(nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/account')
      }
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Giriş yapılamadı.')
    }
  }

  // ── Google ile giriş (Google Identity Services) ─────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return

    async function handleCredential(response: { credential?: string }) {
      if (!response.credential) return
      setSubmitError(null)
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential }),
        })
        const payload = await res.json().catch(() => null)
        if (!res.ok) throw new Error(payload?.message ?? 'Google ile giriş yapılamadı.')
        if (payload?.role === 'ADMIN') {
          router.replace('/admin')
        } else {
          router.replace(nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/account')
        }
        router.refresh()
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Google ile giriş yapılamadı.')
      }
    }

    function init() {
      const gsi = window.google?.accounts?.id
      if (!gsi || !googleButtonRef.current) return
      gsi.initialize({ client_id: GOOGLE_CLIENT_ID as string, callback: handleCredential })
      googleButtonRef.current.replaceChildren()
      gsi.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        width: 360,
      })
    }

    const existing = document.getElementById('google-gsi-script')
    if (existing) {
      init()
      return
    }
    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = init
    document.body.appendChild(script)
  }, [router, nextPath])

  return (
    <div className="min-h-[70vh] bg-cream-3 px-[38px] py-12 max-[680px]:px-4 max-[680px]:py-8">
      {/* ── Ana kart ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[920px] overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
        <div className="grid grid-cols-[1fr_420px] max-[860px]:grid-cols-1">

          {/* ── Sol: marka paneli ────────────────────────────────────────── */}
          <div className="relative flex min-h-[500px] flex-col overflow-hidden bg-[#F0E8DE] max-[860px]:min-h-[220px]">
            {/*
              Buraya bebek görseli eklenecek:
              <Image src="/images/login-hero.jpg" alt="Bade Bebe" fill className="object-cover object-center" />
            */}

            {/* Gradient overlay — metin okunabilirliği */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(160deg, rgba(244,236,224,.92) 0%, rgba(244,236,224,.55) 50%, rgba(244,236,224,.1) 100%)',
              }}
            />

            {/* İçerik */}
            <div className="relative z-10 flex h-full flex-col justify-between p-9 max-[860px]:p-6">
              <div>
                <Link href="/" className="inline-flex items-center gap-2">
                  <span className="font-serif text-[26px] font-semibold text-brown">Bade Bebe</span>
                  <svg className="text-sage" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 21V9" /><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5z" />
                    <path d="M12 11c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4z" />
                  </svg>
                </Link>

                <div className="mt-10 max-[860px]:mt-4">
                  <p className="font-serif text-[36px] font-semibold leading-[1.1] text-brown max-[860px]:text-[24px]">
                    Tekrar hoş geldiniz,
                  </p>
                  <p className="font-serif text-[36px] font-semibold italic leading-[1.1] text-rose max-[860px]:text-[24px]">
                    Bade Bebe'ye.
                  </p>
                  <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-brown-2 max-[860px]:hidden">
                    Küçük anlar için zamansız parçalar, sevgi ve özenle hazırlandı.
                  </p>
                </div>
              </div>

              {/* Alt güven etiketleri — yalnızca geniş ekran */}
              <div className="mt-8 hidden grid-cols-3 gap-2 max-[860px]:hidden lg:grid">
                {[
                  ['Kolay İade', '30 gün içinde'],
                  ['Güvenli Ödeme', 'HttpOnly oturum'],
                  ['Doğal Kumaşlar', 'Organik pamuk'],
                ].map(([title, sub]) => (
                  <div key={title} className="rounded-[12px] border border-line/60 bg-white/60 px-3 py-3 backdrop-blur-sm">
                    <p className="text-[11.5px] font-bold text-brown">{title}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sağ: form paneli ─────────────────────────────────────────── */}
          <div className="flex flex-col justify-center px-9 py-10 max-[680px]:px-6 max-[680px]:py-8">
            <h1 className="font-serif text-[30px] font-semibold text-brown">Giriş Yap</h1>
            <p className="mt-1 text-[13.5px] text-muted">Sizi görmekten mutluluk duyduk.</p>

            <form
              onSubmit={(e) => void handleSubmit(onSubmit)(e)}
              className="mt-7 space-y-4"
            >
              {/* E-posta */}
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-brown-2">
                  E-posta adresi
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                    <MailIcon />
                  </span>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="E-postanızı girin"
                    className="w-full rounded-[12px] border border-line bg-cream-3 py-3 pl-11 pr-4 text-[14px] text-brown outline-none transition-colors placeholder:text-muted focus:border-rose-soft focus:bg-white"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-[12px] font-semibold text-rose-dk">{errors.email.message}</p>
                )}
              </div>

              {/* Şifre */}
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-brown-2">
                  Şifre
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                    <LockIcon />
                  </span>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Şifrenizi girin"
                    className="w-full rounded-[12px] border border-line bg-cream-3 py-3 pl-11 pr-11 text-[14px] text-brown outline-none transition-colors placeholder:text-muted focus:border-rose-soft focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-brown"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-[12px] font-semibold text-rose-dk">{errors.password.message}</p>
                )}
              </div>

              {/* Beni hatırla + şifremi unuttum */}
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-brown-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line accent-rose"
                  />
                  Beni hatırla
                </label>
                <Link
                  href="#"
                  className="text-[13px] font-semibold text-rose transition-colors hover:text-rose-dk"
                >
                  Şifremi unuttum?
                </Link>
              </div>

              {/* Hata mesajı */}
              {submitError && (
                <p className="rounded-[12px] border border-rose-soft bg-rose-tint px-4 py-3 text-[13px] font-semibold text-rose-dk">
                  {submitError}
                </p>
              )}

              {/* Giriş yap */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[14px] bg-rose py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-rose-dk disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </button>

              {/* Hesap oluştur */}
              <Link
                href="/account/register"
                className="flex w-full items-center justify-center rounded-[14px] border border-line py-3.5 text-[15px] font-bold text-brown transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk"
              >
                Hesap Oluştur
              </Link>
            </form>

            {/* Ayraç */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[12.5px] font-semibold text-muted">veya</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            {/* Sosyal giriş */}
            <div className="space-y-2.5">
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleButtonRef} className="flex min-h-[44px] justify-center [color-scheme:light]" />
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-line py-3 text-[14px] font-semibold text-brown-2 opacity-60 transition-colors"
                  title="Yakında"
                >
                  <GoogleIcon />
                  Google ile devam et
                </button>
              )}
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-line py-3 text-[14px] font-semibold text-brown-2 opacity-60 transition-colors"
                title="Yakında"
              >
                <AppleIcon />
                Apple ile devam et
              </button>
            </div>

            {/* Güvenlik notu */}
            <div className="mt-5 flex items-start gap-2.5 rounded-[12px] bg-cream-3 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-muted">
                <ShieldIcon />
              </span>
              <p className="text-[12px] leading-relaxed text-muted">
                Verileriniz güvende. Güvenli ödeme ve hızlı sipariş takibi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alt güven bandı ──────────────────────────────────────────────── */}
      <div className="mx-auto mt-6 max-w-[920px]">
        <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[16px] border border-line bg-white max-[480px]:grid-cols-1 max-[480px]:divide-x-0 max-[480px]:divide-y">
          {[
            {
              icon: <ReturnIcon />,
              title: 'Kolay İade',
              sub: '30 gün içinde, zahmetsizce',
            },
            {
              icon: <SecureIcon />,
              title: 'Güvenli Ödeme',
              sub: '%100 korumalı ödeme',
            },
            {
              icon: <FabricIcon />,
              title: 'Doğal Kumaşlar',
              sub: 'Cilde nazik, gezegene dost',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4 px-6 py-5 max-[480px]:px-5 max-[480px]:py-4">
              <span className="shrink-0 text-rose-soft">{item.icon}</span>
              <div>
                <p className="text-[13.5px] font-bold text-brown">{item.title}</p>
                <p className="mt-0.5 text-[12px] text-muted">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── İkonlar ──────────────────────────────────────────────────────────────────

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
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

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function ReturnIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 12a8 8 0 0114-5" /><path d="M20 12a8 8 0 01-14 5" />
      <path d="M18 3v4h-4" /><path d="M6 21v-4h4" />
    </svg>
  )
}

function SecureIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
      <path d="M12 15v2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function FabricIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22V10" />
      <path d="M12 15c-3.5 0-6-2.5-6-6.5 3.5 0 6 2.5 6 6.5z" />
      <path d="M12 12c3 0 5-2 5-5.5-3 0-5 2-5 5.5z" />
      <path d="M12 10c0-3-1.5-5-4-6" />
    </svg>
  )
}
