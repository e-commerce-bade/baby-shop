import Link from 'next/link'

const shopLinks = [
  { label: 'Yeni Gelenler', href: '/products' },
  { label: 'Çok Satanlar', href: '/products?sort=best-sellers' },
  { label: 'Hediye', href: '/products' },
  { label: 'İndirim', href: '/products?sort=price-desc' },
]

const supportLinks = [
  { label: 'İletişim', href: '#' },
  { label: 'Kargo & Teslimat', href: '#' },
  { label: 'İade & Değişim', href: '#' },
  { label: 'Beden Rehberi', href: '#' },
  { label: 'S.S.S.', href: '#' },
]

const aboutLinks = [
  { label: 'Hikayemiz', href: '#' },
  { label: 'Sürdürülebilirlik', href: '#' },
  { label: 'Kumaş & Bakım', href: '#' },
  { label: 'Blog', href: '#' },
]

export default function Footer() {
  return (
    <footer className="mt-[34px] border-t border-line bg-cream-3 px-[38px] pb-6 pt-[42px] max-[980px]:px-6 max-[680px]:px-5">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr] gap-[30px] max-[980px]:grid-cols-2 max-[680px]:grid-cols-1">
        <div>
          <div className="flex items-center gap-1.5 font-serif text-2xl font-semibold text-brown">
            Bade Bebe
            <svg className="text-sage" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 21V9" />
              <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5z" />
              <path d="M12 11c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4z" />
            </svg>
          </div>
          <p className="mb-[18px] mt-3.5 max-w-[230px] text-[13px] leading-relaxed text-brown-2">
            Küçükler için zamansız parçalar, sevgi ve özenle hazırlandı.
          </p>
          <div className="flex gap-3">
            <SocialLink href="https://www.instagram.com/badebebeadana/" label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
            </SocialLink>
          </div>
        </div>

        <FooterCol title="Alışveriş" links={shopLinks} />
        <FooterCol title="Müşteri Hizmetleri" links={supportLinks} />
        <FooterCol title="Hakkımızda" links={aboutLinks} />

        <div>
          <h4 className="mb-3.5 text-[13px] font-extrabold text-brown">
            Kabul edilen ödemeler
          </h4>
          <p className="text-[12px] leading-relaxed text-brown-2">
            iyzico ile güvenle ödemenizi yapabilirsiniz.
          </p>
        </div>
      </div>

      <div className="mt-[34px] flex items-center justify-between border-t border-line pt-[18px] text-xs text-muted max-[680px]:flex-col max-[680px]:gap-3">
        <span>© 2026 Bade Bebe. Tüm hakları saklıdır.</span>
        <div className="flex gap-[22px]">
          <Link href="#" className="transition-colors hover:text-rose-dk">
            Gizlilik Politikası
          </Link>
          <Link href="#" className="transition-colors hover:text-rose-dk">
            Kullanım Koşulları
          </Link>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h4 className="mb-3.5 text-[13px] font-extrabold uppercase tracking-[0.4px] text-brown">
        {title}
      </h4>
      {links.map((link) => (
        <Link
          key={`${title}-${link.label}`}
          href={link.href}
          className="mb-[9px] block text-[13px] text-brown-2 transition-all hover:pl-0.5 hover:text-rose-dk"
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="grid h-[34px] w-[34px] place-items-center rounded-full border border-line bg-white text-brown-2 transition-all hover:-translate-y-[3px] hover:border-rose hover:bg-rose hover:text-white"
    >
      {children}
    </a>
  )
}
