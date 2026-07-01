const items = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
    ),
    title: 'Güvenli Ödeme',
    subtitle: '%100 korumalı',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
    <div className="mt-[34px] rounded-card border border-line bg-cream-3 max-[680px]:mt-[26px]">
      <div className="grid grid-cols-3 divide-x divide-line max-[680px]:grid-cols-1 max-[680px]:divide-x-0 max-[680px]:divide-y">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-center gap-3 px-4 py-5"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-tint text-rose-dk">
              {item.icon}
            </div>
            <div className="text-left">
              <div className="text-[13px] font-extrabold text-brown">{item.title}</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{item.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
