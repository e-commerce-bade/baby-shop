'use client'

import { useEffect, useMemo, useState } from 'react'
import NewProductVariants, {
  EMPTY_NEW_VARIANTS,
  buildNewVariants,
  existingComboKeys,
  newVariantProblem,
  type NewVariantsState,
} from '@/components/admin/NewProductVariants'
import type { AdminVariant } from '@/components/admin/ProductVariantEditor'
import { parsePriceInput, parseStockInput } from '@/lib/numberInput'

// Yeni bedenlere onerilen fiyat: urunun satistaki varyantlarinda en sik gecen fiyat.
function commonPrice(variants: AdminVariant[]) {
  const counts = new Map<string, number>()
  for (const variant of variants) {
    const price = String(Number(variant.price))
    counts.set(price, (counts.get(price) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

// Panel acilirken: urunun renkleri secili gelir (yeni bir yas/beden tek dokunusla tum renklere
// eklenir), fiyat ve indirimsiz fiyat urunun mevcut degerlerinden onerilir, stok 0'dan baslar.
function initialState(variants: AdminVariant[]): NewVariantsState {
  const active = variants.filter((variant) => variant.active)
  const pool = active.length > 0 ? active : variants
  const compareAtPrices = new Set(
    pool.map((variant) => (variant.compareAtPrice == null ? '' : String(Number(variant.compareAtPrice)))),
  )
  return {
    ...EMPTY_NEW_VARIANTS,
    colors: [...new Set(variants.map((variant) => variant.colorName))].sort((a, b) => a.localeCompare(b, 'tr')),
    price: commonPrice(pool),
    compareAtPrice: compareAtPrices.size === 1 ? [...compareAtPrices][0] : '',
    currency: pool[0]?.currency ?? 'TRY',
  }
}

/**
 * Mevcut urune yeni beden/yas ve renk ekler. Secilen beden x renk kombinasyonlarindan urunde
 * olmayanlar satir olarak listelenir; "Ekle" hepsini tek istekte olusturur (biri gecersizse hicbiri).
 */
export default function AddVariantsPanel({
  productId,
  variants,
  sizeOptions,
  sizeListLabel,
  knownColors,
  onAdded,
  onPendingChange,
}: {
  productId: number
  // Urunun tum varyantlari (pasifler dahil): ayni beden/renk ikinci kez olusturulamaz.
  variants: AdminVariant[]
  sizeOptions: string[]
  sizeListLabel: string
  knownColors: string[]
  onAdded: (created: AdminVariant[]) => void
  onPendingChange?: (pendingCount: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<NewVariantsState>(EMPTY_NEW_VARIANTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const existing = useMemo(() => existingComboKeys(variants), [variants])
  const rows = useMemo(() => (open ? buildNewVariants(state, existing) : []), [open, state, existing])
  // Yazilan renk, urunun kendi yazimina (sonra katalogdakine) uyarlanir: "haki" -> "Haki".
  const colorSuggestions = useMemo(
    () => [...new Set([...variants.map((variant) => variant.colorName), ...knownColors])],
    [variants, knownColors],
  )

  useEffect(() => {
    onPendingChange?.(rows.length)
  }, [rows.length, onPendingChange])

  function openPanel() {
    setState(initialState(variants))
    setError(null)
    setNotice(null)
    setOpen(true)
  }

  function closePanel() {
    if (saving) return
    if (rows.length > 0 && !window.confirm(`Eklenmemiş ${rows.length} yeni varyant var. Vazgeçilsin mi?`)) return
    setError(null)
    setOpen(false)
  }

  function problem() {
    if (state.sizes.length === 0) return 'En az bir beden/yaş seçin.'
    if (state.colors.length === 0) return 'En az bir renk seçin.'
    if (rows.length === 0) return 'Seçilen kombinasyonların hepsi üründe zaten var ya da çıkarıldı.'
    if (state.price.trim() === '' && rows.some((row) => row.price.trim() === '')) return 'Fiyat girin.'
    const invalid = rows.find((row) => newVariantProblem(row))
    if (invalid) return `${invalid.sizeLabel} / ${invalid.colorName}: ${newVariantProblem(invalid)?.message}`
    if (state.compareAtPrice.trim() !== '' && Number.isNaN(parsePriceInput(state.compareAtPrice))) {
      return 'İndirimsiz fiyat geçerli bir tutar olmalı (en fazla 2 ondalık, örn. 499,90).'
    }
    return null
  }

  async function submit() {
    if (saving) return
    const message = problem()
    if (message) {
      setError(message)
      return
    }

    const compareAtPrice = state.compareAtPrice.trim() ? parsePriceInput(state.compareAtPrice) : null
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants/bulk`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: rows.map((row) => ({
            sizeLabel: row.sizeLabel,
            colorName: row.colorName,
            stockQuantity: parseStockInput(row.stock),
            price: parsePriceInput(row.price),
            compareAtPrice,
          })),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        // Sunucu hatalarinda govde bos ya da mesajsiz gelebilir.
        throw new Error(typeof payload?.message === 'string' && payload.message.trim() ? payload.message : 'Varyantlar eklenemedi.')
      }

      const created = payload as AdminVariant[]
      onAdded(created)
      setOpen(false)
      setNotice(`${created.length} varyant eklendi; yukarıdaki listede stok ve fiyatlarını değiştirebilirsiniz.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Varyantlar eklenemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-4 border-t border-[#F4EEE6] pt-4">
        {notice ? (
          <div role="status" className="mb-3 rounded-[9px] bg-[#EDF7F1] px-3 py-2 text-[12px] font-semibold text-[#1A6640]">
            {notice}
          </div>
        ) : null}
        <button
          type="button"
          onClick={openPanel}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#D5C9BA] bg-[#FAF6F1] px-4 py-2.5 text-[12.5px] font-bold text-[#C07B5A] transition-colors hover:bg-[#F4EEE6]"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Beden / renk ekle
        </button>
      </div>
    )
  }

  return (
    <section aria-label="Beden / renk ekle" className="mt-4 border-t border-[#F4EEE6] pt-4">
      <div className="mb-3">
        <h4 className="text-[13px] font-bold text-[#3D2B1F]">Beden / renk ekle</h4>
        <p className="mt-1 text-[12px] leading-5 text-[#7A6656]">
          Seçtiğiniz beden ve renklerden üründe olmayan kombinasyonlar eklenir; mevcut varyantlara dokunulmaz.
        </p>
      </div>

      <NewProductVariants
        state={state}
        onChange={(next) => {
          setError(null)
          setState(next)
        }}
        sizeListLabel={sizeListLabel}
        sizeOptions={sizeOptions}
        knownColors={colorSuggestions}
        existing={variants}
        idPrefix={`add-variant-${productId}`}
      />

      {error ? (
        <div role="alert" className="mt-3 rounded-[9px] bg-[#FEEAEA] px-3 py-2 text-[12px] text-[#8A1A1A]">{error}</div>
      ) : null}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={closePanel}
          disabled={saving}
          className="h-9 whitespace-nowrap rounded-[9px] border border-[#ECE3D6] px-3 text-[12px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:opacity-50"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || rows.length === 0}
          className="h-9 whitespace-nowrap rounded-[9px] bg-[#C07B5A] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Ekleniyor...' : rows.length > 0 ? `${rows.length} varyant ekle` : 'Varyant ekle'}
        </button>
      </div>
    </section>
  )
}
