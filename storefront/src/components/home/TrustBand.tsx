const items = [
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
    ),
    title: 'Güvenli Ödeme',
    subtitle: '%100 korumalı',
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12a8 8 0 0114-5" />
        <path d="M20 12a8 8 0 01-14 5" />
        <path d="M18 3v4h-4" />
        <path d="M6 21v-4h4" />
      </svg>
    ),
    title: 'Kolay İade',
    subtitle: '30 gün içinde',
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="7" width="12" height="9" rx="1" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="6" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </svg>
    ),
    title: 'Hızlı Teslimat',
    subtitle: '2–4 iş günü',
  },
]

export default function TrustBand() {
  return (
    <div className="mt-[26px] flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 rounded-card border border-line bg-cream-3 px-4 py-2.5 max-[680px]:mt-5 max-[680px]:gap-x-5">
      {items.map((item) => (
        <div key={item.title} className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-tint text-rose-dk">
            {item.icon}
          </span>
          <span className="text-[12px] font-bold text-brown">{item.title}</span>
          <span className="text-[11px] font-semibold text-muted">· {item.subtitle}</span>
        </div>
      ))}
    </div>
  )
}
