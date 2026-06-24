import Link from 'next/link'

interface Props {
  /** 0-tabanli mevcut sayfa */
  page: number
  totalPages: number
  /** Mevcut filtre/siralama searchParam'lari (page haric); link'lerde korunur. */
  baseParams: Record<string, string | undefined>
}

function hrefFor(page: number, baseParams: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(baseParams)) {
    if (value) params.set(key, value)
  }
  if (page > 0) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/products?${qs}` : '/products'
}

// Mevcut sayfa cevresinde sayfa numaralari (1-tabanli gosterim) penceresi olustur.
function pageWindow(current: number, total: number): number[] {
  const windowSize = 5
  let start = Math.max(0, current - Math.floor(windowSize / 2))
  const end = Math.min(total, start + windowSize)
  start = Math.max(0, end - windowSize)
  const pages: number[] = []
  for (let i = start; i < end; i++) pages.push(i)
  return pages
}

export default function Pagination({ page, totalPages, baseParams }: Props) {
  if (totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)
  const linkClass =
    'grid h-9 min-w-9 place-items-center rounded-[10px] border px-3 text-[13px] font-semibold transition-colors'
  const inactive = 'border-line text-brown-2 hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk'
  const active = 'border-rose bg-rose text-white'
  const disabled = 'pointer-events-none border-line text-muted opacity-40'

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Sayfalama">
      <Link
        href={hrefFor(page - 1, baseParams)}
        aria-label="Önceki sayfa"
        aria-disabled={page <= 0}
        className={`${linkClass} ${page <= 0 ? disabled : inactive}`}
      >
        ‹
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p, baseParams)}
          aria-current={p === page ? 'page' : undefined}
          className={`${linkClass} ${p === page ? active : inactive}`}
        >
          {p + 1}
        </Link>
      ))}

      <Link
        href={hrefFor(page + 1, baseParams)}
        aria-label="Sonraki sayfa"
        aria-disabled={page >= totalPages - 1}
        className={`${linkClass} ${page >= totalPages - 1 ? disabled : inactive}`}
      >
        ›
      </Link>
    </nav>
  )
}
