'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z
    .string()
    .min(1, 'E-posta adresi gerekli')
    .email('Geçerli bir e-posta adresi gir'),
})

type FormData = z.infer<typeof schema>

export default function NewsletterBand() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (_data: FormData) => {
    // API entegrasyonu Faz 6'da: POST /api/v1/newsletter veya benzer endpoint
    await new Promise((r) => setTimeout(r, 600))
    reset()
  }

  return (
    <div className="mx-auto mt-[18px] max-w-[640px] rounded-panel border border-line bg-cream-2 px-[34px] py-[34px] text-center max-[680px]:px-[22px] max-[680px]:py-[26px]">
      {/* Bear icon */}
      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-rose-tint text-rose-dk">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="currentColor">
          <circle cx="12" cy="11" r="5" />
          <circle cx="28" cy="11" r="5" />
          <circle cx="20" cy="22" r="13" />
          <circle cx="15" cy="19" r="1.8" fill="white" />
          <circle cx="25" cy="19" r="1.8" fill="white" />
          <circle cx="20" cy="24" r="2.4" fill="white" />
        </svg>
      </div>

      <h3 className="font-serif text-[23px] font-semibold text-brown">
        MiniMori Ailesine Katıl
      </h3>
      <p className="mx-auto mt-2 max-w-[340px] text-[13px] leading-[1.5] text-brown-2">
        İlk siparişinde %10 indirim kazan, yeni ürünler ve özel fırsatlardan
        ilk sen haberdar ol.
      </p>

      {isSubmitSuccessful ? (
        <p className="mt-4 text-sm font-semibold text-sage">
          ✓ Harika! Seni listeye ekledik.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-4"
        >
          <div className="mx-auto flex max-w-[420px] gap-2 rounded-pill border border-line bg-white py-1.5 pl-4 pr-1.5">
            <input
              {...register('email')}
              type="email"
              placeholder="E-posta adresini gir"
              className="flex-1 bg-transparent text-[13px] text-brown-text outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[24px] bg-rose px-[18px] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-rose-dk disabled:opacity-60"
            >
              {isSubmitting ? '...' : 'Katıl'}
            </button>
          </div>
          {errors.email && (
            <p className="mt-1.5 text-[12px] text-rose-dk">{errors.email.message}</p>
          )}
        </form>
      )}

      <p className="mt-[11px] flex items-center justify-center gap-1 text-[11px] text-muted">
        <span className="text-rose-soft">♥</span>
        Spam yok, sadece güzel şeyler.
      </p>
    </div>
  )
}
