'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

/**
 * Admin filtreleri icin coklu secim kutusu. Hicbir sey secili degilken `allLabel` ("Tüm Yaş/Beden")
 * gorunur ve filtre uygulanmaz; bir veya daha fazla secenek isaretlenince herhangi birine uyanlar listelenir.
 */
export default function MultiSelect({
  allLabel,
  options,
  selected,
  onChange,
}: {
  allLabel: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    // Esc odak nerede olursa olsun kapatir; odak listedeyse ya da kaybolduysa dugmeye geri verilir.
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      const focused = document.activeElement
      if (!focused || focused === document.body || containerRef.current?.contains(focused)) buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  // Secili bir secenek listeden kalkarsa (orn. o bedendeki son varyant silindi ya da yeniden
  // adlandirildi) filtrede kaldirilamayan, gorunmez bir kosul kalmasin diye secimden de dusurulur.
  // Layout effect: liste, eski filtreyle bir an bile bos cizilmeden duzelir.
  useLayoutEffect(() => {
    if (options.length > 0 && selected.some((item) => !options.includes(item))) {
      onChange(selected.filter((item) => options.includes(item)))
    }
  }, [options, selected, onChange])

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])
  }

  // Odak Tab ile kutunun disina cikinca liste kapanir. (Odagin hedefi yoksa, orn. odaktaki dugme
  // devre disi kaldiysa, liste acik kalir; disari tiklama ayrica yakalanir.)
  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null
    if (next && !containerRef.current?.contains(next)) setOpen(false)
  }

  const summary =
    selected.length === 0 ? allLabel : selected.length <= 2 ? selected.join(', ') : `${selected.length} seçili`

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={selected.length === 0 ? allLabel : `${allLabel}: ${selected.join(', ')}`}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-2 rounded-[10px] border bg-white px-3 py-2 text-left text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A89070]/40 ${
          selected.length > 0 ? 'border-[#C07B5A] font-semibold text-[#3D2B1F]' : 'border-[#ECE3D6] text-[#5B4839]'
        }`}
      >
        <span className="truncate">{summary}</span>
        <svg className={`h-3.5 w-3.5 shrink-0 text-[#5B4839] transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 4l3.5 3.5L9.5 4" />
        </svg>
      </button>

      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={allLabel}
          tabIndex={-1}
          // z-[35]: sayfanin altindaki sabit toplu islem cubugunun (z-30) ustunde, cekmecelerin (z-40+) altinda.
          className="absolute left-0 right-0 z-[35] mt-1 min-w-[180px] overflow-hidden rounded-[12px] border border-[#ECE3D6] bg-white shadow-[0_18px_42px_-22px_rgba(91,72,57,.45)] outline-none"
        >
          <div className="max-h-64 overflow-y-auto py-1.5">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-[12.5px] text-[#B5A090]">Seçenek yok</p>
            ) : (
              options.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] text-[#3D2B1F] hover:bg-[#FAF6F1] has-[:focus-visible]:bg-[#FAF6F1]"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="rounded border-[#D5C9BA] accent-[#C07B5A]"
                  />
                  <span className="truncate">{option}</span>
                </label>
              ))
            )}
          </div>
          {/* Liste uzun olsa da temizle/tamam her zaman gorunur kalir. */}
          <div className="flex items-center justify-between gap-2 border-t border-[#F4EEE6] px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onChange([])
                // Dugme simdi devre disi kalacak; odak listede kalsin.
                containerRef.current?.querySelector<HTMLInputElement>('input[type=checkbox]')?.focus()
              }}
              disabled={selected.length === 0}
              className="text-[12px] font-semibold text-[#C07B5A] hover:underline disabled:cursor-default disabled:text-[#C4B5A5] disabled:no-underline"
            >
              Seçimi temizle
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                buttonRef.current?.focus()
              }}
              className="rounded-[8px] bg-[#5B4839] px-3 py-1 text-[12px] font-bold text-white hover:bg-[#3D2B1F]"
            >
              Tamam
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
