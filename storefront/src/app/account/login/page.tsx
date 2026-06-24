'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/components/auth/AuthProvider'

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

// The Google OAuth *client id* is a public identifier (it ships to the browser),
// so we default to it when the env override isn't set — this lets the button work
// without requiring a build-time env var on every deploy.
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  '708355217675-6c6mv60vqi8kuj4mui3c65kevgpshf2j.apps.googleusercontent.com'

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
  const { refresh } = useAuth()
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
      await refresh()
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
        await refresh()
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
  }, [router, nextPath, refresh])

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

            {/* Google ile giriş */}
            <div ref={googleButtonRef} className="flex min-h-[44px] justify-center [color-scheme:light]" />

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
