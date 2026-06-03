import Link from 'next/link'

export default function CheckoutHelpCard() {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-line bg-cream-2 px-5 py-5">
      {/* Decorative circle */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose/10"
        aria-hidden="true"
      />
      <p className="font-serif text-[16px] font-semibold leading-snug text-brown">
        Küçük anlar için<br />özenle hazırlandı.
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
        Yardıma mı ihtiyacınız var?
      </p>
      <Link
        href="mailto:destek@badebebe.com"
        className="mt-2.5 inline-block text-[12.5px] font-bold text-rose underline underline-offset-2 transition-colors hover:text-rose-dk"
      >
        Bize yazın
      </Link>
    </div>
  )
}
