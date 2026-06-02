const features = [
  {
    id: 'quality',
    title: 'Premium Kalite',
    subtitle: 'Özenle seçilmiş materyaller',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 20V8" /><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5z" />
        <path d="M12 10c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z" />
      </svg>
    ),
  },
  {
    id: 'safe',
    title: 'Güvenli & Nazik',
    subtitle: 'Zararlı kimyasal içermez',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
      </svg>
    ),
  },
  {
    id: 'loved',
    title: 'Ebeveynlerin Sevgilisi',
    subtitle: 'Binlerce 5 yıldızlı değerlendirme',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z" />
      </svg>
    ),
  },
]

export default function FeaturesPanel() {
  return (
    <div className="flex overflow-hidden rounded-panel border border-line bg-cream-2">
      {/* Text */}
      <div className="flex-1 px-7 py-[30px]">
        <h3 className="mb-5 font-serif text-[18px] font-semibold leading-[1.3] text-brown">
          Küçük anlar için<br />özenle üretildi
        </h3>
        <div className="space-y-4">
          {features.map((f) => (
            <div key={f.id} className="flex items-start gap-3">
              <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-rose-tint text-rose-dk">
                {f.icon}
              </div>
              <div>
                <div className="text-[13.5px] font-bold text-brown">{f.title}</div>
                <div className="mt-0.5 text-xs font-medium text-muted">{f.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Illustration */}
      <div
        className="flex w-[200px] shrink-0 items-end justify-center overflow-hidden max-[980px]:hidden"
        style={{ background: 'linear-gradient(160deg, #F4ECE0, #EBCFC9 80%)' }}
      >
        <svg viewBox="0 0 160 180" width="140" height="160" xmlns="http://www.w3.org/2000/svg" className="opacity-85">
          <ellipse cx="80" cy="90" rx="38" ry="46" fill="#F2D4CB" />
          <path d="M42 90 Q80 78 118 90 Q112 114 80 118 Q48 114 42 90Z" fill="#E6C8BE" opacity=".9" />
          <path d="M46 112 Q80 100 114 112 Q108 132 80 136 Q52 132 46 112Z" fill="#E6C8BE" opacity=".8" />
          <circle cx="80" cy="44" r="30" fill="#F5DDD4" />
          <path d="M52 36 Q60 18 80 16 Q100 18 108 36" fill="#C9A090" />
          <path d="M64 20 Q70 14 76 20 Q70 26 64 20Z" fill="#E6BFBA" />
          <path d="M84 20 Q90 14 96 20 Q90 26 84 20Z" fill="#E6BFBA" />
          <circle cx="80" cy="20" r="3" fill="#D4918D" />
          <circle cx="72" cy="46" r="3" fill="#8B6050" />
          <circle cx="88" cy="46" r="3" fill="#8B6050" />
          <circle cx="73" cy="46" r="1" fill="white" opacity=".7" />
          <circle cx="89" cy="46" r="1" fill="white" opacity=".7" />
          <path d="M74 56 Q80 62 86 56" stroke="#C09080" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="65" cy="52" r="5" fill="#E6BFBA" opacity=".4" />
          <circle cx="95" cy="52" r="5" fill="#E6BFBA" opacity=".4" />
          <ellipse cx="36" cy="98" rx="10" ry="20" fill="#F5DDD4" transform="rotate(-15 36 98)" />
          <ellipse cx="124" cy="98" rx="10" ry="20" fill="#F5DDD4" transform="rotate(15 124 98)" />
          <circle cx="80" cy="100" r="5" fill="#D4918D" opacity=".5" />
          <circle cx="80" cy="100" r="2.5" fill="#F2D4CB" />
        </svg>
      </div>
    </div>
  )
}
