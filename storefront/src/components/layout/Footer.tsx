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

const paymentMethods = [
  { label: 'VISA', color: '#1a3a8f' },
  { label: 'MC', color: '#c8472a' },
  { label: 'AMEX', color: '#1d6fc0' },
  { label: 'PayPal', color: '#264a8b' },
  { label: '⌘ Pay', color: '#222' },
  { label: 'shop', color: '#5a31f4' },
  { label: 'GPay', color: '#3a7d44' },
]

export default function Footer() {
  return (
    <footer className="mt-[34px] border-t border-line bg-cream-3 px-[38px] pb-6 pt-[42px] max-[980px]:px-6 max-[680px]:px-5">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr] gap-[30px] max-[980px]:grid-cols-2 max-[680px]:grid-cols-1">
        <div>
          <div className="flex items-center gap-1.5 font-serif text-2xl font-semibold text-brown">
            MiniMori
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
            <SocialLink href="#" label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
            </SocialLink>
            <SocialLink href="#" label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 9h3V6h-3c-2 0-3 1.3-3 3.2V11H9v3h2v6h3v-6h2.5l.5-3H14V9.5c0-.4.2-.5.6-.5z" />
              </svg>
            </SocialLink>
            <SocialLink href="#" label="Pinterest">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a9 9 0 00-3.3 17.4c-.1-.8-.1-2 .1-2.8l1-4.4s-.3-.5-.3-1.3c0-1.2.7-2.1 1.6-2.1.7 0 1.1.6 1.1 1.2 0 .8-.5 1.9-.7 3-.2.8.4 1.5 1.3 1.5 1.5 0 2.6-1.6 2.6-3.9 0-2-1.4-3.4-3.5-3.4a3.6 3.6 0 00-3.8 3.6c0 .7.3 1.5.6 1.9l-.3 1c0 .2-.2.2-.4.1-1-.5-1.6-2-1.6-3.2 0-2.6 1.9-4.9 5.4-4.9 2.9 0 5.1 2 5.1 4.8 0 2.9-1.8 5.2-4.3 5.2-.8 0-1.6-.5-1.9-1l-.5 2c-.2.7-.7 1.6-1 2.2A9 9 0 1012 3z" />
              </svg>
            </SocialLink>
            <SocialLink href="#" label="TikTok">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 4c.3 1.8 1.4 3.2 3.2 3.5V10c-1.2 0-2.3-.4-3.2-1v5.6c0 2.9-2.3 5.2-5.2 5.2S5.6 17.5 5.6 14.6 7.9 9.4 10.8 9.4c.3 0 .5 0 .8.1v2.6c-.3-.1-.5-.1-.8-.1-1.4 0-2.5 1.1-2.5 2.6S9.4 17 10.8 17s2.5-1.1 2.5-2.6V4z" />
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
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method.label}
                className="grid h-[30px] place-items-center rounded-[7px] border border-line bg-white px-[11px] text-[10px] font-extrabold tracking-[0.3px]"
                style={{ color: method.color }}
              >
                {method.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-[34px] flex items-center justify-between border-t border-line pt-[18px] text-xs text-muted max-[680px]:flex-col max-[680px]:gap-3">
        <span>© 2026 MiniMori. Tüm hakları saklıdır.</span>
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
      className="grid h-[34px] w-[34px] place-items-center rounded-full border border-line bg-white text-brown-2 transition-all hover:-translate-y-[3px] hover:border-rose hover:bg-rose hover:text-white"
    >
      {children}
    </a>
  )
}
