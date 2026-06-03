export default function AnnouncementBar() {
  return (
    <div
      className="relative flex items-center justify-center gap-[18px] py-2.5 text-[13px] font-semibold tracking-[0.2px]"
      style={{ background: 'linear-gradient(90deg,#EDE6DC,#E5DDD0)', color: '#6B5A48' }}
    >
      <button
        className="absolute left-3.5 grid h-[26px] w-[26px] place-items-center rounded-full transition-colors duration-200 hover:bg-white/60"
        style={{ background: 'rgba(255,255,255,0.40)', color: '#7A5540' }}
        aria-label="Önceki duyuru"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span style={{ color: '#BF8060' }}>♥</span>
      <span>75 USD üzeri siparişlerde ücretsiz kargo</span>

      <button
        className="absolute right-3.5 grid h-[26px] w-[26px] place-items-center rounded-full transition-colors duration-200 hover:bg-white/60"
        style={{ background: 'rgba(255,255,255,0.40)', color: '#7A5540' }}
        aria-label="Sonraki duyuru"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}
