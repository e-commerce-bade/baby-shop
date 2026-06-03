'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().min(1, 'E-posta adresi gerekli').email('Geçerli bir e-posta adresi gir'),
})
type FormData = z.infer<typeof schema>

export default function NewsletterBand() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/account/me', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false))
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (_data: FormData) => {
    await new Promise((r) => setTimeout(r, 600))
    reset()
  }

  if (loggedIn !== false) return null

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[14px] px-5 py-3 max-[680px]:px-4"
      style={{ background: 'linear-gradient(90deg,#EDE6DC,#E5DDD0)' }}
    >
      {/* Sol: ikon + metin */}
      <div className="flex items-center gap-3">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-rose-dk"
          style={{ background: 'rgba(255,255,255,0.55)' }}
        >
          <svg width="14" height="14" viewBox="0 0 40 40" fill="currentColor">
            <circle cx="12" cy="11" r="5" />
            <circle cx="28" cy="11" r="5" />
            <circle cx="20" cy="22" r="13" />
            <circle cx="15" cy="19" r="1.8" fill="white" />
            <circle cx="25" cy="19" r="1.8" fill="white" />
            <circle cx="20" cy="24" r="2.4" fill="white" />
          </svg>
        </span>
        <p className="text-[13px] font-semibold" style={{ color: '#6B5A48' }}>
          Bade Bebe ailesine katıl
          <span className="ml-1 font-normal" style={{ color: '#9A8878' }}>
            · İlk siparişinde %10 indirim kazan
          </span>
        </p>
      </div>

      {/* Sağ: form veya başarı */}
      {isSubmitSuccessful ? (
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-sage">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l3.5 3.5L13 5" />
          </svg>
          Harika! Seni listeye ekledik.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex items-center gap-2"
        >
          <div
            className="flex items-center gap-1.5 rounded-pill border px-3 py-1.5"
            style={{ background: 'rgba(255,255,255,0.75)', borderColor: 'rgba(180,160,140,0.35)' }}
          >
            <input
              {...register('email')}
              type="email"
              placeholder="E-posta adresin"
              className="w-[190px] bg-transparent text-[12.5px] outline-none placeholder:text-muted max-[480px]:w-[140px]"
              style={{ color: '#6B5A48' }}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-pill bg-rose px-4 py-1.5 text-[12.5px] font-bold text-white transition-colors hover:bg-rose-dk disabled:opacity-60"
          >
            {isSubmitting ? '...' : 'Katıl'}
          </button>
        </form>
      )}

      {errors.email && (
        <p className="w-full text-[11.5px] text-rose-dk">{errors.email.message}</p>
      )}
    </div>
  )
}
