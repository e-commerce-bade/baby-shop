'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ─── Slide verisi ─────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: 'hero',
    background: '#F4ECE0',
    image: '/images/hero.jpg',
    eyebrow: 'Küçük anlar için tasarlandı',
    title: 'Minik kıyafetler,',
    titleAccent: 'büyük anılar',
    desc: 'Her küçük macera için özenle tasarlanmış parçalar.',
    primaryCta: { label: 'Yeni Gelenleri Keşfet', href: '/products' },
    secondaryCta: { label: 'Tüm Koleksiyonlar', href: '/products' },
    tags: [
      { label: 'Doğal kumaşlar', icon: 'leaf' },
      { label: 'Özenli detaylar', icon: 'heart' },
      { label: 'Zamansız stil', icon: 'clock' },
    ],
    accentColor: '#D2918D', // rose
  },
  {
    id: 'campaign',
    background: '#F6E6E2',
    image: '/images/hero_2.png',
    eyebrow: 'Özel Kampanya · Sınırlı Süre',
    badge: '%30\'a Varan İndirim',
    title: 'Büyük fırsatlar,',
    titleAccent: 'küçük fiyatlar',
    desc: 'Seçili koleksiyonlarda %30\'a varan indirim fırsatı. Stoklar tükenebilir, kaçırmayın!',
    primaryCta: { label: 'İndirimleri Keşfet', href: '/products' },
    tags: [
      { label: 'Seçili ürünler', icon: 'tag' },
      { label: 'Sınırlı süre', icon: 'clock' },
      { label: 'Ücretsiz kargo', icon: 'truck' },
    ],
    accentColor: '#C57F7B', // rose-dk
  },
  {
    id: 'newborn',
    background: '#DCE7EE',
    image: '/images/hero_3.png',
    eyebrow: 'Yeni Doğanlar Koleksiyonu · 0–24 Ay',
    title: 'En küçük kalpler',
    titleAccent: 'için tasarlandı',
    desc: '0–24 ay arası bebekler için yumuşak, nefes alabilir organik pamuk koleksiyonu.',
    primaryCta: { label: 'Yeni Doğan Koleksiyonu', href: '/products' },
    tags: [
      { label: '0–24 Ay', icon: 'leaf' },
      { label: 'Organik Pamuk', icon: 'heart' },
      { label: 'OEKO-TEX® Sertifikalı', icon: 'clock' },
    ],
    accentColor: '#6E9EBA', // blue-soft tonu
  },
] as const

// ─── SVG ikonlar ──────────────────────────────────────────────────────────────

const ICONS = {
  leaf: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20V8" />
      <path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5z" />
    </svg>
  ),
  heart: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  ),
  tag: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  ),
  truck: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 4v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeroSection() {
  const [current, setCurrent] = useState(0)
  const count = SLIDES.length

  /* 5 saniyede bir ilerle; current değişince timer sıfırlanır */
  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % count), 5000)
    return () => clearInterval(id)
  }, [current, count])

  function goTo(i: number) {
    setCurrent((i + count) % count)
  }

  return (
    <section
      className="relative min-h-[420px] overflow-hidden rounded-panel max-[680px]:min-h-[340px]"
      aria-label="Öne çıkan koleksiyonlar"
    >
      {/* ── Slides ──────────────────────────────────────────────────────── */}
      {SLIDES.map((slide, i) => {
        const isActive = i === current
        return (
          <div
            key={slide.id}
            aria-hidden={!isActive}
            className="absolute inset-0 flex items-center"
            style={{
              background: slide.background,
              opacity: isActive ? 1 : 0,
              transform: `translateX(${isActive ? 0 : i < current ? -24 : 24}px)`,
              transition: 'opacity 600ms ease, transform 600ms ease',
              pointerEvents: isActive ? 'auto' : 'none',
            }}
          >
            {/* Arka plan görseli — yalnızca image alanı olan slide'larda */}
            {'image' in slide && slide.image && (
              <>
                <Image
                  src={slide.image}
                  alt="MiniMori koleksiyon"
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover object-center"
                />
                {/* Sol→sağ scrim — metin okunabilirliği */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(244,236,224,.96) 0%, rgba(244,236,224,.85) 32%, rgba(244,236,224,.35) 55%, rgba(244,236,224,0) 78%)',
                  }}
                />
              </>
            )}

            {/* Sol metin alanı */}
            <div className="relative z-10 flex max-w-[560px] flex-col justify-center px-14 py-[46px] max-[680px]:px-6 max-[680px]:py-8">

              {/* Kampanya badge */}
              {'badge' in slide && slide.badge && (
                <span
                  className="mb-3 inline-block w-fit rounded-[20px] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.5px] text-white"
                  style={{ background: slide.accentColor }}
                >
                  {slide.badge}
                </span>
              )}

              {/* Eyebrow */}
              <p className="mb-3 text-[13px] font-bold tracking-[0.4px] text-muted">
                {slide.eyebrow}
              </p>

              {/* Başlık */}
              <h1 className="font-serif text-[52px] font-semibold leading-[1.03] tracking-[-0.5px] text-brown max-[680px]:text-[38px]">
                {slide.title}
                <em
                  className="mt-0.5 block font-medium not-italic"
                  style={{ color: slide.accentColor, fontStyle: 'italic' }}
                >
                  {slide.titleAccent}
                </em>
              </h1>

              <p className="mb-7 mt-5 max-w-[340px] text-[15px] leading-relaxed text-brown-2">
                {slide.desc}
              </p>

              {/* CTA'lar */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={slide.primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-pill px-[26px] py-[13px] text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(91,72,57,.35)] transition-[transform,background-color] duration-[220ms] hover:-translate-y-0.5"
                  style={{ background: slide.accentColor }}
                >
                  {slide.primaryCta.label}
                </Link>
                {'secondaryCta' in slide && slide.secondaryCta && (
                  <Link
                    href={slide.secondaryCta.href}
                    className="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-[26px] py-[13px] text-sm font-bold text-brown transition-[transform,background-color] duration-[220ms] hover:-translate-y-0.5 hover:bg-cream-2"
                  >
                    {slide.secondaryCta.label}
                  </Link>
                )}
              </div>

              {/* Etiketler */}
              <div className="mt-7 flex flex-wrap gap-5 max-[680px]:gap-4">
                {slide.tags.map((tag) => (
                  <div key={tag.label} className="flex items-center gap-2 text-[13px] font-semibold text-brown-2">
                    <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-white text-muted">
                      {ICONS[tag.icon]}
                    </span>
                    {tag.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* ── Önceki / Sonraki okları ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => goTo(current - 1)}
        aria-label="Önceki slayt"
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/75 text-brown-2 backdrop-blur-sm transition-colors hover:bg-white hover:text-brown max-[680px]:h-8 max-[680px]:w-8"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => goTo(current + 1)}
        aria-label="Sonraki slayt"
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/75 text-brown-2 backdrop-blur-sm transition-colors hover:bg-white hover:text-brown max-[680px]:h-8 max-[680px]:w-8"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* ── Nokta indikatörleri ──────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${i + 1}. slayta git`}
            aria-current={i === current ? 'true' : undefined}
            className="transition-all duration-300"
            style={{
              height: 8,
              width: i === current ? 24 : 8,
              borderRadius: 9999,
              background: i === current
                ? SLIDES[current].accentColor
                : 'rgba(255,255,255,0.55)',
            }}
          />
        ))}
      </div>
    </section>
  )
}
