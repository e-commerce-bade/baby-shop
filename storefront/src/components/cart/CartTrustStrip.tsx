const ITEMS = [
  {
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 4v4h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    label: '₺1.500 üzeri ücretsiz kargo',
  },
  {
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 12a8 8 0 0114-5" /><path d="M20 12a8 8 0 01-14 5" />
        <path d="M18 3v4h-4" /><path d="M6 21v-4h4" />
      </svg>
    ),
    label: '30 gün içinde kolay iade',
  },
  {
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
    ),
    label: 'Güvenli ödeme',
  },
]

interface Props {
  /** 'strip' — yatay bant (full page). 'row' — ikon + kısa etiket (drawer alt). */
  variant?: 'strip' | 'row'
}

export default function CartTrustStrip({ variant = 'strip' }: Props) {
  if (variant === 'row') {
    return (
      <div className="flex justify-around pt-3 border-t border-line">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1 text-center">
            <span className="text-muted">{item.icon}</span>
            <span className="text-[10px] font-semibold leading-tight text-muted max-w-[64px]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 divide-x divide-line rounded-panel border border-line bg-cream-3">
      {ITEMS.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center gap-1.5 px-3 py-3.5 text-center"
        >
          <span className="text-muted">{item.icon}</span>
          <span className="text-[11.5px] font-semibold leading-tight text-brown-2">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
