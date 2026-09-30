'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getColorSwatch } from '@/lib/colors'
import { cn } from '@/lib/utils'

// Galerideki bir kare: bir fotograf ya da fotografi olmayan bir renk icin yer tutucu
// (imageUrl null). Yer tutucu sayesinde her rengin seritte bir yeri olur; secili renk ile
// ekranda gorunen kare hic ayrismaz.
export interface GallerySlide {
  key: string
  imageUrl: string | null
  altText: string | null
  colorName: string | null
}

interface Props {
  slides: GallerySlide[]
  activeIndex: number
  // Kaydirma, ok ya da kucuk gorsel ile baska kareye gecildiginde cagrilir.
  onActiveIndexChange: (index: number) => void
  // Seridin o an gosterdigi kare (kaydirma yerine oturmadan once de guncel); sepete eklerken
  // ekranda gorunen rengin kullanilmasi icin.
  visibleIndexRef?: React.MutableRefObject<number | null>
  productName: string
  gradientFrom: string
  gradientTo: string
  isNew?: boolean
}

// Kaydirma bu kadar sure durunca kare "yerine oturmus" sayilir.
const SCROLL_SETTLE_MS = 110
// Serit bir karenin bu kadar yakinindaysa (kare genisligi cinsinden) oraya varmis sayilir.
const ARRIVED_TOLERANCE = 0.02
// Kodla baslatilan kaydirma bu surede hedefe varmazsa serit dogrudan hedefe alinir.
const PROGRAMMATIC_SCROLL_BASE_MS = 1200
const PROGRAMMATIC_SCROLL_PER_SLIDE_MS = 120
// Buyuk gorsel penceresinde parmakla onceki/sonraki kareye gecmek icin gereken yatay hareket.
const SWIPE_THRESHOLD_PX = 45

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

function Placeholder({ slide, large }: { slide: GallerySlide; large?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <span
        className={cn('rounded-full border-4 border-white shadow-[0_0_0_1.5px_#ECE3D6]', large ? 'h-28 w-28' : 'h-20 w-20')}
        style={{ background: getColorSwatch(slide.colorName ?? '') }}
      />
      <p className={cn('font-bold', large ? 'text-lg text-white' : 'text-[15px] text-brown')}>{slide.colorName}</p>
      <p className={cn('text-[12.5px]', large ? 'text-white/70' : 'text-muted')}>Bu renk için fotoğraf henüz eklenmedi.</p>
    </div>
  )
}

export default function ProductGallery({
  slides,
  activeIndex,
  onActiveIndexChange,
  visibleIndexRef,
  productName,
  gradientFrom,
  gradientTo,
  isNew,
}: Props) {
  const [zoomed, setZoomed] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const prevArrowRef = useRef<HTMLButtonElement>(null)
  const nextArrowRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const dialogCloseRef = useRef<HTMLButtonElement>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Kodla baslatilan kaydirmanin hedefi: oraya varana kadar aradan gecilen kareler secilmis sayilmaz.
  const programmaticTarget = useRef<number | null>(null)
  const programmaticDeadline = useRef(0)
  // Seridin kendi bildirdigi (kullanicinin kaydirarak geldigi) kare.
  const reportedIndex = useRef<number | null>(null)
  // Parmak seritteyken secim degismez; birakinca kare yerine oturunca degisir.
  const touchActive = useRef(false)
  const mounted = useRef(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const count = slides.length
  const active = Math.min(Math.max(activeIndex, 0), Math.max(count - 1, 0))
  const activeSlide = slides[active]
  const latest = useRef({ active, onActiveIndexChange })

  useEffect(() => {
    latest.current = { active, onActiveIndexChange }
  })

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
  }, [])

  // Secili kare disaridan degistiyse (renk secimi, ok, kucuk gorsel) serit oraya kaydirilir.
  // Degisikligi seridin kendisi bildirdiyse (kullanici parmagiyla getirdi) serit zaten oradadir ya da
  // oraya oturmaktadir; kodla kaydirmak kullanicinin hareketiyle cakisirdi.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return
    const position = scroller.scrollLeft / scroller.clientWidth

    if (!mounted.current) {
      mounted.current = true
      // Sayfa etkilesime hazir olmadan kaydirilmissa (yavas telefon) o kare benimsenir; seridi
      // geri cevirmek kullanicinin hareketini bozardi.
      const index = Math.min(count - 1, Math.max(0, Math.round(position)))
      if (visibleIndexRef) visibleIndexRef.current = index
      if (index !== active) {
        reportedIndex.current = index
        latest.current.onActiveIndexChange(index)
      }
      return
    }

    if (reportedIndex.current === active) {
      reportedIndex.current = null
      return
    }
    reportedIndex.current = null
    if (Math.abs(position - active) < ARRIVED_TOLERANCE) return
    programmaticTarget.current = active
    programmaticDeadline.current = Date.now() + PROGRAMMATIC_SCROLL_BASE_MS
      + PROGRAMMATIC_SCROLL_PER_SLIDE_MS * Math.abs(active - Math.round(position))
    if (visibleIndexRef) visibleIndexRef.current = active
    scroller.scrollTo({ left: active * scroller.clientWidth, behavior: scrollBehavior() })
    // Serit aslinda hic kaymazsa (olay gelmezse) de hedefin tutuldugu dogrulansin.
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(settle, SCROLL_SETTLE_MS * 3)
    // settle, her cizimde yeniden olusur; son hali latest ref ve referanslar uzerinden okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Secili kucuk gorsel, sayfayi oynatmadan kendi seridinde gorunur tutulur.
  useEffect(() => {
    const strip = thumbsRef.current
    const thumb = strip?.children[active] as HTMLElement | undefined
    if (!strip || !thumb) return
    strip.scrollTo({
      left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2,
      top: thumb.offsetTop - (strip.clientHeight - thumb.offsetHeight) / 2,
      behavior: scrollBehavior(),
    })
  }, [active])

  // Ekran donunce/yeniden boyutlaninca serit secili karede kalsin.
  useEffect(() => {
    function realign() {
      const scroller = scrollerRef.current
      if (scroller) scroller.scrollTo({ left: latest.current.active * scroller.clientWidth, behavior: 'auto' })
    }
    window.addEventListener('resize', realign)
    return () => window.removeEventListener('resize', realign)
  }, [])

  function handleScroll() {
    const scroller = scrollerRef.current
    if (scroller && scroller.clientWidth > 0 && visibleIndexRef) {
      visibleIndexRef.current = Math.min(count - 1, Math.max(0, Math.round(scroller.scrollLeft / scroller.clientWidth)))
    }
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(settle, SCROLL_SETTLE_MS)
  }

  // Kaydirma durdugunda seridin uzerinde durdugu kare secili kare olur.
  function settle() {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return
    if (touchActive.current) {
      settleTimer.current = setTimeout(settle, SCROLL_SETTLE_MS)
      return
    }
    const position = scroller.scrollLeft / scroller.clientWidth

    const target = programmaticTarget.current
    if (target !== null) {
      // Kodla baslatilan kaydirma hedefine varmadan bitmis sayilmaz: tarayici yogunken kaydirma
      // olaylari gecikebilir ve aradaki bir kare yanlislikla secilmis gorunurdu.
      if (Math.abs(position - target) >= ARRIVED_TOLERANCE) {
        if (Date.now() >= programmaticDeadline.current) {
          // Suresinde varamadi (takilma, kesilen animasyon): dogrudan hedefe al.
          scroller.scrollTo({ left: target * scroller.clientWidth, behavior: 'auto' })
          programmaticDeadline.current = Date.now() + PROGRAMMATIC_SCROLL_BASE_MS
        }
        settleTimer.current = setTimeout(settle, SCROLL_SETTLE_MS)
        return
      }
      programmaticTarget.current = null
    }

    const index = Math.min(count - 1, Math.max(0, Math.round(position)))
    if (visibleIndexRef) visibleIndexRef.current = index
    if (index !== latest.current.active) {
      reportedIndex.current = index
      latest.current.onActiveIndexChange(index)
    }
  }

  // Kullanici seridi eline aldiysa kodla baslatilan kaydirma artik gecerli degildir.
  function handleUserScrollStart() {
    programmaticTarget.current = null
  }

  function goTo(index: number, from?: 'prev' | 'next') {
    if (index < 0 || index >= count) return
    onActiveIndexChange(index)
    // Uca gelince devre disi kalan okta odak kaybolmasin: odak diger oka gecer.
    if (from === 'next' && index === count - 1 && document.activeElement === nextArrowRef.current) {
      prevArrowRef.current?.focus()
    } else if (from === 'prev' && index === 0 && document.activeElement === prevArrowRef.current) {
      nextArrowRef.current?.focus()
    }
  }

  const showPrev = useCallback(() => {
    if (count > 1) onActiveIndexChange((active - 1 + count) % count)
  }, [active, count, onActiveIndexChange])

  const showNext = useCallback(() => {
    if (count > 1) onActiveIndexChange((active + 1) % count)
  }, [active, count, onActiveIndexChange])

  // Lightbox açıkken: sayfa kaydırmasını kilitle ve klavye ile gezinmeyi/kapatmayı bağla.
  useEffect(() => {
    if (!zoomed) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setZoomed(false)
      else if (event.key === 'ArrowLeft') showPrev()
      else if (event.key === 'ArrowRight') showNext()
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [zoomed, showPrev, showNext])

  // Buyuk gorsel acilinca odak pencereye tasinir ve Tab pencere icinde doner (arkadaki "Sepete Ekle"
  // klavyeyle tetiklenemez); kapaninca odak onceki yerine doner.
  useEffect(() => {
    if (!zoomed) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogCloseRef.current?.focus()

    function trapTab(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', trapTab)
    return () => {
      document.removeEventListener('keydown', trapTab)
      previouslyFocused?.focus?.()
    }
  }, [zoomed])

  function handleZoomTouchStart(event: React.TouchEvent) {
    // Iki parmak (yakinlastirma) kaydirma sayilmaz.
    touchStart.current = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null
  }

  function handleZoomTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    // Sayfa parmakla buyutulmusken yapilan surukleme, goruntuyu gezmek icindir; kare degistirmez.
    if ((window.visualViewport?.scale ?? 1) > 1.01) return
    const deltaX = event.changedTouches[0].clientX - start.x
    const deltaY = event.changedTouches[0].clientY - start.y
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return
    if (deltaX < 0) showNext()
    else showPrev()
  }

  function handleStripKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(active + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(active - 1)
    }
  }

  const counterText = `${activeSlide?.colorName ? `${activeSlide.colorName} · ` : ''}${active + 1} / ${count}`

  return (
    <div className="flex w-full max-w-[560px] gap-3 max-[980px]:mx-auto max-[680px]:flex-col-reverse">
      {count > 1 ? (
        // Kucuk gorseller: masaustunde buyuk gorselin yuksekligini asmayan dikey, mobilde yatay serit.
        <div className="relative w-[70px] shrink-0 max-[680px]:h-[68px] max-[680px]:w-full">
          <div
            ref={thumbsRef}
            className="absolute inset-0 flex flex-col gap-2 overflow-y-auto [scrollbar-width:none] max-[680px]:flex-row max-[680px]:overflow-x-auto max-[680px]:overflow-y-hidden [&::-webkit-scrollbar]:hidden"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => onActiveIndexChange(index)}
                aria-label={`Görsel ${index + 1}${slide.colorName ? ` – ${slide.colorName}` : ''}`}
                aria-current={active === index}
                className={cn(
                  'relative h-[82px] w-[70px] shrink-0 overflow-hidden rounded-thumb border-[1.5px] bg-cream-2 transition-colors duration-[180ms]',
                  active === index
                    ? 'border-rose'
                    : 'border-line-2 hover:border-rose-soft',
                  'max-[680px]:h-[68px] max-[680px]:w-[58px]',
                )}
              >
                {slide.imageUrl ? (
                  <Image
                    fill
                    src={slide.imageUrl}
                    alt={slide.altText ?? productName}
                    sizes="70px"
                    className="object-contain p-1"
                  />
                ) : (
                  <span
                    className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#ECE3D6]"
                    style={{ background: getColorSwatch(slide.colorName ?? '') }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="relative min-h-[430px] flex-1 overflow-hidden rounded-panel border border-line-2 max-[680px]:min-h-[360px]"
        style={{
          aspectRatio: '4/5',
          background:
            activeSlide?.imageUrl
              ? `linear-gradient(160deg, ${gradientFrom}55, ${gradientTo})`
              : `linear-gradient(160deg, ${gradientFrom}, ${gradientTo})`,
        }}
      >
        {/* Tum kareler yan yana; parmakla saga/sola kaydirilir ve her kaydirmada bir kare ilerler. */}
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          onTouchStart={() => {
            touchActive.current = true
            handleUserScrollStart()
          }}
          onTouchEnd={() => { touchActive.current = false }}
          onTouchCancel={() => { touchActive.current = false }}
          onWheel={(event) => {
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) handleUserScrollStart()
          }}
          onKeyDown={handleStripKeyDown}
          role="group"
          aria-roledescription="galeri"
          aria-label={`${productName} görselleri`}
          tabIndex={count > 1 ? 0 : -1}
          className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain outline-none [scrollbar-width:none] focus-visible:shadow-[inset_0_0_0_3px_rgba(168,144,112,.55)] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, index) => (
            <div
              key={slide.key}
              aria-hidden={index !== active}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              {slide.imageUrl ? (
                <Image
                  fill
                  priority={index === 0}
                  // Komsu kareler onceden yuklenir ki kaydirirken bos kare gorunmesin.
                  loading={index === 0 ? undefined : Math.abs(index - active) <= 1 ? 'eager' : 'lazy'}
                  src={slide.imageUrl}
                  alt={slide.altText ?? productName}
                  onClick={() => setZoomed(true)}
                  draggable={false}
                  sizes="(max-width: 680px) 90vw, 560px"
                  className="cursor-zoom-in object-contain p-7 max-[680px]:p-5"
                />
              ) : (
                <Placeholder slide={slide} />
              )}
            </div>
          ))}
        </div>

        {isNew ? (
          <span className="pointer-events-none absolute left-3.5 top-3.5 z-10 rounded-[20px] bg-rose px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.4px] text-white">
            Yeni
          </span>
        ) : null}

        {count > 1 ? (
          <>
            {/* Oklar fareyle kullanilan cihazlar icin; dokunmatik ekranda kaydirma yeterli. */}
            <button
              ref={prevArrowRef}
              type="button"
              onClick={() => goTo(active - 1, 'prev')}
              disabled={active === 0}
              aria-label="Önceki görsel"
              className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/85 text-brown-2 transition-colors hover:bg-white hover:text-rose-dk disabled:pointer-events-none disabled:opacity-0 [@media(hover:hover)]:grid"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              ref={nextArrowRef}
              type="button"
              onClick={() => goTo(active + 1, 'next')}
              disabled={active === count - 1}
              aria-label="Sonraki görsel"
              className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/85 text-brown-2 transition-colors hover:bg-white hover:text-rose-dk disabled:pointer-events-none disabled:opacity-0 [@media(hover:hover)]:grid"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <span
              aria-live="polite"
              aria-atomic="true"
              className="pointer-events-none absolute bottom-3.5 left-3.5 z-10 rounded-[20px] border border-line bg-white/85 px-2.5 py-1 text-[11.5px] font-bold text-brown-2"
            >
              {counterText}
            </span>
          </>
        ) : null}

        {activeSlide?.imageUrl ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Yakınlaştır"
            className="absolute bottom-3.5 right-3.5 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-white/85 text-brown-2 transition-colors hover:bg-white hover:text-rose-dk"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </button>
        ) : null}
      </div>

      {zoomed && activeSlide ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} — büyütülmüş görsel`}
          onClick={() => setZoomed(false)}
          onTouchStart={handleZoomTouchStart}
          onTouchEnd={handleZoomTouchEnd}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            ref={dialogCloseRef}
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Kapat"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {count > 1 ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); showPrev() }}
              aria-label="Önceki görsel"
              className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : null}

          {activeSlide.imageUrl ? (
            <img
              src={activeSlide.imageUrl}
              alt={activeSlide.altText ?? productName}
              onClick={(event) => event.stopPropagation()}
              draggable={false}
              className="max-h-[90vh] max-w-[90vw] cursor-zoom-out object-contain"
            />
          ) : (
            <div onClick={(event) => event.stopPropagation()} className="h-[60vh] w-[80vw] max-w-md">
              <Placeholder slide={activeSlide} large />
            </div>
          )}

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showNext() }}
                aria-label="Sonraki görsel"
                className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <span aria-live="polite" aria-atomic="true" className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-[20px] bg-white/10 px-3 py-1 text-[12.5px] font-bold text-white">
                {counterText}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
