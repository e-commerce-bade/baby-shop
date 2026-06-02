import Image from 'next/image'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[420px] items-center overflow-hidden rounded-panel bg-cream-3 max-[680px]:min-h-[340px]">
      {/* Background image */}
      <Image
        src="/images/hero.jpg"
        alt="MiniMori koleksiyon"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Left-to-right scrim — text okunabilirliği */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(244,236,224,.96) 0%, rgba(244,236,224,.85) 32%, rgba(244,236,224,.35) 55%, rgba(244,236,224,0) 78%)',
        }}
      />

      {/* Text content */}
      <div className="relative z-10 flex max-w-[560px] flex-col justify-center px-14 py-[46px] max-[680px]:px-[26px] max-[680px]:py-[30px]">
        {/* Eyebrow */}
        <div className="mb-3.5 flex items-center gap-1.5 text-[13px] font-bold tracking-[0.5px] text-muted">
          Küçük anlar için tasarlandı
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--tw-text-opacity, currentColor)"
            strokeWidth="1.6"
            className="text-sage"
          >
            <path d="M12 20V10" />
            <path d="M12 14c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4z" />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-[54px] font-semibold leading-[1.02] tracking-[-0.5px] text-brown max-[680px]:text-[40px]">
          Minik kıyafetler,
          <em className="mt-0.5 block font-medium not-italic text-rose" style={{ fontStyle: 'italic' }}>
            büyük anılar
          </em>
        </h1>

        <p className="mb-[26px] mt-5 max-w-[330px] text-[15px] text-brown-2">
          Her küçük macera için özenle tasarlanmış parçalar.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3.5">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-pill bg-rose px-[26px] py-[13px] text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(197,127,123,.8)] transition-[transform,background-color] duration-[220ms] hover:-translate-y-0.5 hover:bg-rose-dk"
          >
            Yeni Gelenleri Keşfet
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-[26px] py-[13px] text-sm font-bold text-brown transition-[transform,background-color] duration-[220ms] hover:-translate-y-0.5 hover:bg-cream-2"
          >
            Tüm Koleksiyonlar
          </Link>
        </div>

        {/* Feature tags */}
        <div className="mt-7 flex flex-wrap gap-6">
          <FeatureTag
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20V8" />
                <path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5z" />
              </svg>
            }
            label="Doğal kumaşlar"
          />
          <FeatureTag
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
              </svg>
            }
            label="Özenli detaylar"
            iconClassName="text-rose"
          />
          <FeatureTag
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4l2.5 2" />
              </svg>
            }
            label="Zamansız stil"
          />
        </div>
      </div>

      {/* Carousel dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <span className="h-2 w-[22px] rounded-full bg-rose" />
        <span className="h-2 w-2 rounded-full bg-white/55" />
        <span className="h-2 w-2 rounded-full bg-white/55" />
        <span className="h-2 w-2 rounded-full bg-white/55" />
      </div>
    </section>
  )
}

function FeatureTag({
  icon,
  label,
  iconClassName,
}: {
  icon: React.ReactNode
  label: string
  iconClassName?: string
}) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-brown-2">
      <span
        className={`grid h-[26px] w-[26px] place-items-center rounded-full bg-white text-sage ${iconClassName ?? ''}`}
      >
        {icon}
      </span>
      {label}
    </div>
  )
}
