'use client'

import { useMemo, useState } from 'react'
import { getColorHex } from '@/lib/colors'
import { PRICE_INPUT_HINT, STOCK_INPUT_HINT, parsePriceInput, parseStockInput } from '@/lib/numberInput'
import { compareSizeLabels, sameSizeRange } from '@/lib/sizes'
import { foldForSearch } from '@/lib/utils'

// Yeni urun eklerken secilen beden x renk kombinasyonlari. Varyant satirlari bu durumdan turetilir:
// ortak fiyat/stok her satira uygulanir, satirda elle yapilan degisiklik `overrides`ta tutulur ve
// beden ya da renk eklenip cikarilsa da kaybolmaz.
export interface NewVariantsState {
  sizes: string[]
  colors: string[]
  price: string
  compareAtPrice: string
  stock: string
  currency: string
  overrides: Record<string, { price?: string; stock?: string }>
  // Olusturulmayacak kombinasyonlar (orn. bir rengin bir bedeni yoksa).
  removed: string[]
}

export const EMPTY_NEW_VARIANTS: NewVariantsState = {
  sizes: [],
  colors: [],
  price: '',
  compareAtPrice: '',
  stock: '0',
  currency: 'TRY',
  overrides: {},
  removed: [],
}

export interface NewVariant {
  key: string
  sizeLabel: string
  colorName: string
  price: string
  stock: string
}

function variantKey(sizeLabel: string, colorName: string) {
  return `${sizeLabel}|${colorName}`
}

// Urunde zaten olan beden/renk kombinasyonlari (mevcut urune ekleme yapilirken atlanirlar).
export function existingComboKeys(variants: Array<{ sizeLabel: string; colorName: string }>): ReadonlySet<string> {
  return new Set(variants.map((variant) => variantKey(variant.sizeLabel, variant.colorName)))
}

export function buildNewVariants(state: NewVariantsState, existing?: ReadonlySet<string>): NewVariant[] {
  const removed = new Set(state.removed)
  return [...state.sizes]
    .sort(compareSizeLabels)
    .flatMap((sizeLabel) => state.colors.map((colorName) => {
      const key = variantKey(sizeLabel, colorName)
      const override = state.overrides[key]
      return {
        key,
        sizeLabel,
        colorName,
        price: override?.price ?? state.price,
        stock: override?.stock ?? state.stock,
      }
    }))
    .filter((variant) => !removed.has(variant.key) && !existing?.has(variant.key))
}

export function newVariantProblem(variant: NewVariant): { field: 'price' | 'stock'; message: string } | null {
  if (Number.isNaN(parsePriceInput(variant.price))) return { field: 'price', message: PRICE_INPUT_HINT }
  if (Number.isNaN(parseStockInput(variant.stock))) return { field: 'stock', message: STOCK_INPUT_HINT }
  return null
}

const inputClass =
  'h-9 w-full rounded-[9px] border bg-white px-2.5 text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20'
const fieldClass =
  'w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none'

// Satir kolonlari: secim, renk, fiyat, stok, cikar.
// Dar ekranda (telefon) renk adi kesilmesin diye satir ikiye bolunur: ustte secim + renk + cikar,
// altta fiyat + stok.
const rowGridClass = 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_76px_60px_auto]'
const cellPlacement = {
  select: 'col-start-1 row-start-1',
  name: 'col-span-2 col-start-2 row-start-1 sm:col-span-1',
  price: 'col-start-2 row-start-2 sm:col-start-3 sm:row-start-1',
  stock: 'col-start-3 row-start-2 sm:col-start-4 sm:row-start-1',
  remove: 'col-start-4 row-start-1 sm:col-start-5',
}
const mobileCaptionClass = 'mb-0.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#C4B5A5] sm:hidden'

/**
 * Yeni urunun "Varyant & Stok" adimi: beden sabit listeden, renk yazilarak secilir; her beden x renk
 * icin satir kendiliginden olusur. Stok/fiyat satirda tek tek ya da secilen satirlara toplu verilir.
 * `existing` verilirse mevcut bir urune beden/renk eklenir: urunde olan kombinasyonlar atlanir, urunun
 * renkleri hizli secim olarak sunulur ve para birimi urunden alindigi icin sorulmaz.
 */
export default function NewProductVariants({
  state,
  onChange,
  sizeListLabel,
  sizeOptions,
  knownColors,
  existing,
  idPrefix = 'new-product',
}: {
  state: NewVariantsState
  onChange: (next: NewVariantsState) => void
  sizeListLabel: string
  sizeOptions: string[]
  // Katalogda kullanilan renk adlari (en cok kullanilan once): oneri olarak sunulur ve yazilan renk
  // bunlardan biriyle ayni ise ("pembe" = "Pembe") mevcut yazim kullanilir.
  knownColors: string[]
  existing?: Array<{ sizeLabel: string; colorName: string }>
  idPrefix?: string
}) {
  const [colorInput, setColorInput] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkStock, setBulkStock] = useState('')
  const [bulkPrice, setBulkPrice] = useState('')

  const addingToProduct = existing !== undefined
  const existingKeys = useMemo(() => existingComboKeys(existing ?? []), [existing])
  const existingSizes = useMemo(
    () => [...new Set((existing ?? []).map((variant) => variant.sizeLabel))].sort(compareSizeLabels),
    [existing],
  )
  const productColors = useMemo(
    () => [...new Set((existing ?? []).map((variant) => variant.colorName))].sort((a, b) => a.localeCompare(b, 'tr')),
    [existing],
  )
  // Mevcut urunde sabit listede olmayan eski yazimlar da secilebilir: urune yeni bir renk eklerken
  // bedenleri urundeki yazimla ayni kalir (magazada ayni yas iki ayri beden gibi gorunmez).
  const sizeChoices = useMemo(
    () => [...sizeOptions, ...existingSizes.filter((size) => !sizeOptions.includes(size))].sort(compareSizeLabels),
    [sizeOptions, existingSizes],
  )
  const variants = buildNewVariants(state, existingKeys)
  const variantKeys = new Set(variants.map((variant) => variant.key))
  // Beden/renk cikarilinca artik olmayan satirlar secimden de duser.
  const selected = new Set([...selectedKeys].filter((key) => variantKeys.has(key)))
  const totalStock = variants.reduce((sum, variant) => {
    const stock = parseStockInput(variant.stock)
    return sum + (Number.isInteger(stock) && stock > 0 ? stock : 0)
  }, 0)
  const combinationCount = state.sizes.length * state.colors.length
  const existingCount = state.sizes.reduce(
    (count, sizeLabel) => count + state.colors.filter((colorName) => existingKeys.has(variantKey(sizeLabel, colorName))).length,
    0,
  )
  const removedCount = combinationCount - existingCount - variants.length
  const colorInputId = `${idPrefix}-color`
  // Secilen beden urunde eski bir yazimla varsa ("3-4" ile "3-4 Yaş") magazada ayni yas iki ayri
  // beden gibi gorunur; bu yuzden uyarilir.
  const lookalikes = state.sizes.flatMap((size) => {
    if (!addingToProduct || existingSizes.includes(size)) return []
    const other = existingSizes.find((existingSize) => sameSizeRange(existingSize, size))
    return other ? [{ size, other }] : []
  })

  const groups = [...state.sizes].sort(compareSizeLabels).map((sizeLabel) => ({
    sizeLabel,
    rows: variants.filter((variant) => variant.sizeLabel === sizeLabel),
  })).filter((group) => group.rows.length > 0)

  function toggleSize(sizeLabel: string) {
    onChange({
      ...state,
      sizes: state.sizes.includes(sizeLabel)
        ? state.sizes.filter((item) => item !== sizeLabel)
        : [...state.sizes, sizeLabel],
    })
  }

  function addColors() {
    // Birden fazla renk virgulle ayrilarak tek seferde eklenebilir ("Siyah, Pembe, Beyaz").
    const next = [...state.colors]
    for (const part of colorInput.split(',')) {
      const typed = part.trim().replace(/\s+/g, ' ')
      if (!typed) continue
      const folded = foldForSearch(typed)
      if (next.some((color) => foldForSearch(color) === folded)) continue
      next.push(knownColors.find((color) => foldForSearch(color) === folded) ?? typed)
    }
    setColorInput('')
    if (next.length !== state.colors.length) onChange({ ...state, colors: next })
  }

  function removeColor(color: string) {
    onChange({ ...state, colors: state.colors.filter((item) => item !== color) })
  }

  function patchVariants(keys: Iterable<string>, patch: { price?: string; stock?: string }) {
    const overrides = { ...state.overrides }
    for (const key of keys) {
      const next = { ...overrides[key], ...patch }
      // Ortak degere geri donen alan ozel deger sayilmaz; ortak deger degisince onu izler.
      if (next.price === state.price) delete next.price
      if (next.stock === state.stock) delete next.stock
      if (Object.keys(next).length === 0) delete overrides[key]
      else overrides[key] = next
    }
    onChange({ ...state, overrides })
  }

  function removeVariants(keys: string[]) {
    onChange({ ...state, removed: [...new Set([...state.removed, ...keys])] })
  }

  function toggleSelected(keys: string[], checked: boolean) {
    const next = new Set(selected)
    keys.forEach((key) => (checked ? next.add(key) : next.delete(key)))
    setSelectedKeys(next)
  }

  function applyBulk() {
    const patch: { price?: string; stock?: string } = {}
    if (bulkStock.trim() !== '') patch.stock = bulkStock.trim()
    if (bulkPrice.trim() !== '') patch.price = bulkPrice.trim()
    if (Object.keys(patch).length === 0) return
    patchVariants(selected, patch)
    setBulkStock('')
    setBulkPrice('')
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-[12px] font-bold text-[#5B4839]">
            Beden / Yaş <span className="text-[#C07B5A]">*</span>
            <span className="ml-1.5 font-semibold text-[#B5A090]">({sizeListLabel})</span>
          </label>
          <div className="flex shrink-0 gap-3 whitespace-nowrap text-[11.5px] font-bold">
            {/* Mevcut urunde "tumu" yerine urunun kendi bedenleri secilir (yeni bir rengi hepsine eklemek icin). */}
            <button
              type="button"
              onClick={() => onChange({ ...state, sizes: addingToProduct ? existingSizes : sizeOptions })}
              className="text-[#C07B5A] hover:underline"
            >
              {addingToProduct ? 'Ürünün bedenleri' : 'Tümünü seç'}
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...state, sizes: [] })}
              disabled={state.sizes.length === 0}
              className="text-[#A89070] hover:text-[#5B4839] disabled:opacity-40"
            >
              Temizle
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizeChoices.map((size) => {
            const active = state.sizes.includes(size)
            const legacy = !sizeOptions.includes(size)
            return (
              <button
                key={size}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSize(size)}
                title={legacy ? 'Bu yazım sabit listede yok; üründe böyle kayıtlı.' : undefined}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  active
                    ? 'bg-[#C07B5A] text-white'
                    : legacy
                      ? 'border border-dashed border-[#C9B79F] bg-white text-[#7A6656] hover:bg-[#FFFDFC]'
                      : 'bg-white text-[#5B4839] ring-1 ring-[#ECE3D6] hover:bg-[#FFFDFC]'
                }`}
              >
                {size}
              </button>
            )
          })}
        </div>
        {addingToProduct && existingSizes.length > 0 ? (
          <p className="mt-2 text-[11.5px] text-[#9A8570]">
            Üründe olan bedenler: {existingSizes.join(', ')}
          </p>
        ) : null}
        {lookalikes.map(({ size, other }) => (
          <p key={size} className="mt-2 rounded-[9px] bg-[#FFF3E0] px-3 py-2 text-[11.5px] font-semibold text-[#9A5B20]">
            &quot;{size}&quot; bu üründe &quot;{other}&quot; yazımıyla zaten var; mağazada iki ayrı beden gibi görünmemesi için
            bunun yerine yukarıdaki listeden &quot;{other}&quot; bedenini &quot;{size}&quot; yapın.
          </p>
        ))}
      </div>

      <div>
        <label htmlFor={colorInputId} className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
          Renkler <span className="text-[#C07B5A]">*</span>
        </label>
        <div className="flex gap-2">
          <input
            id={colorInputId}
            type="text"
            list={`${colorInputId}-options`}
            placeholder="Örn. Krem (birden fazlaysa virgülle: Siyah, Pembe)"
            value={colorInput}
            onChange={(event) => setColorInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addColors()
              }
            }}
            className={`min-w-0 flex-1 ${fieldClass}`}
          />
          <datalist id={`${colorInputId}-options`}>
            {knownColors.map((color) => (
              <option key={color} value={color} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={addColors}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[12px] font-bold text-[#C07B5A] hover:bg-[#FFFDFC]"
          >
            Ekle
          </button>
        </div>
        {state.colors.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {state.colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => removeColor(color)}
                // Mevcut urunde bu dugme rengi urunden degil, yalnizca bu eklemeden cikarir.
                aria-label={addingToProduct ? `${color} rengini seçimden çıkar` : `${color} rengini kaldır`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F4EEE6] px-3 py-1.5 text-[12px] font-bold text-[#5B4839] hover:bg-[#ECE3D6]"
              >
                <span
                  className="h-3 w-3 rounded-full border border-white shadow-[0_0_0_1px_#D5C9BA]"
                  style={{ backgroundColor: getColorHex(color) }}
                />
                {color}
                <span className="text-[13px] leading-none text-[#A89070]">×</span>
              </button>
            ))}
          </div>
        ) : null}
        {addingToProduct && productColors.some((color) => !state.colors.includes(color)) ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-[#9A8570]">
            <span>Ürünün renkleri:</span>
            {productColors.filter((color) => !state.colors.includes(color)).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ ...state, colors: [...state.colors, color] })}
                aria-label={`${color} rengini seç`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-bold text-[#5B4839] ring-1 ring-[#ECE3D6] hover:bg-[#FFFDFC]"
              >
                <span className="text-[12px] leading-none text-[#C07B5A]">+</span>
                {color}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
              Fiyat <span className="text-[#C07B5A]">*</span>
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={state.price}
              onChange={(event) => onChange({ ...state, price: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Stok (her varyant için)</span>
            <input
              type="text"
              inputMode="numeric"
              value={state.stock}
              onChange={(event) => onChange({ ...state, stock: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">İndirimsiz fiyat (ops.)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Yoksa boş bırakın"
              value={state.compareAtPrice}
              onChange={(event) => onChange({ ...state, compareAtPrice: event.target.value })}
              className={fieldClass}
            />
          </label>
          {addingToProduct ? null : (
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Para birimi</span>
              <input
                type="text"
                maxLength={3}
                value={state.currency}
                onChange={(event) => onChange({ ...state, currency: event.target.value.toUpperCase() })}
                className={fieldClass}
              />
            </label>
          )}
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#B5A090]">
          Fiyat ve stok tüm varyantlara uygulanır. Farklı olanları aşağıda tek tek ya da seçerek toplu değiştirebilirsiniz.
        </p>
      </div>

      {combinationCount === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[#ECE3D6] bg-[#FAF6F1] px-4 py-3 text-[12.5px] text-[#9A8570]">
          {addingToProduct
            ? 'Eklemek istediğiniz bedeni (gerekirse rengi) seçin; üründe olmayan kombinasyonlar burada kendiliğinden oluşur.'
            : 'Beden ve renk seçtiğinizde varyantlar burada kendiliğinden oluşur.'}
        </p>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 text-[12px] text-[#7A6656]">
            <label className="flex cursor-pointer items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={variants.length > 0 && selected.size === variants.length}
                onChange={(event) => toggleSelected(variants.map((variant) => variant.key), event.target.checked)}
                className="rounded border-[#D5C9BA] accent-[#C07B5A]"
              />
              Tümünü seç
            </label>
            <span>
              {variants.length} varyant · toplam stok {totalStock}
            </span>
          </div>

          {existingCount > 0 ? (
            <p className="mt-2 rounded-[9px] bg-[#FAF6F1] px-3 py-2 text-[12px] text-[#7A6656]">
              Seçimdeki {existingCount} kombinasyon üründe zaten var; bunlar yeniden eklenmez.
            </p>
          ) : null}

          {selected.size > 0 ? (
            <div className="sticky top-0 z-10 -mx-1 mt-2 rounded-[12px] border border-[#E4D6C3] bg-[#FFF8EC] p-2.5 shadow-[0_8px_18px_-14px_rgba(91,72,57,.6)]">
              <div className="flex items-center gap-3">
                <p className="mr-auto text-[12px] font-bold text-[#5B4839]">{selected.size} varyant seçili</p>
                <button
                  type="button"
                  onClick={() => removeVariants([...selected])}
                  className="text-[11.5px] font-bold text-[#8A1A1A] hover:underline"
                >
                  Seçilenleri çıkar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKeys(new Set())}
                  className="text-[11.5px] font-semibold text-[#A89070] hover:text-[#5B4839]"
                >
                  Seçimi kaldır
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-[#5B4839]">Stok</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Seçilenlere verilecek stok"
                    value={bulkStock}
                    placeholder="değiştirme"
                    onChange={(event) => setBulkStock(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyBulk() } }}
                    className={`${inputClass} border-[#ECE3D6]`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-[#5B4839]">Fiyat</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Seçilenlere verilecek fiyat"
                    value={bulkPrice}
                    placeholder="değiştirme"
                    onChange={(event) => setBulkPrice(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyBulk() } }}
                    className={`${inputClass} border-[#ECE3D6]`}
                  />
                </label>
                <button
                  type="button"
                  onClick={applyBulk}
                  disabled={bulkStock.trim() === '' && bulkPrice.trim() === ''}
                  className="h-9 rounded-[9px] bg-[#5B4839] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#3D2B1F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Uygula
                </button>
              </div>
            </div>
          ) : null}

          <div className={`mt-3 hidden ${rowGridClass} gap-2 px-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#C4B5A5] sm:grid`}>
            <span className="w-[13px]" />
            <span>Renk</span>
            <span>Fiyat</span>
            <span>Stok</span>
            <span className="w-7" />
          </div>

          <div className="mt-1.5 space-y-2.5">
            {groups.map((group) => {
              const groupKeys = group.rows.map((variant) => variant.key)
              const selectedInGroup = groupKeys.filter((key) => selected.has(key)).length

              return (
                <div key={group.sizeLabel} className="overflow-hidden rounded-[10px] border border-[#ECE3D6]">
                  <div className="flex items-center gap-2 bg-[#FAF6F1] px-2.5 py-2">
                    <input
                      type="checkbox"
                      aria-label={`${group.sizeLabel} bedenindeki tüm varyantları seç`}
                      checked={selectedInGroup === groupKeys.length}
                      ref={(element) => {
                        if (element) element.indeterminate = selectedInGroup > 0 && selectedInGroup < groupKeys.length
                      }}
                      onChange={(event) => toggleSelected(groupKeys, event.target.checked)}
                      className="rounded border-[#D5C9BA] accent-[#C07B5A]"
                    />
                    <span className="text-[12.5px] font-bold text-[#3D2B1F]">{group.sizeLabel}</span>
                    <span className="ml-auto text-[11px] text-[#B5A090]">{group.rows.length} renk</span>
                  </div>

                  <div className="divide-y divide-[#F4EEE6]">
                    {group.rows.map((variant) => {
                      const label = `${variant.sizeLabel} / ${variant.colorName}`
                      const problem = newVariantProblem(variant)
                      // Fiyat henuz girilmemisken satirlar kirmiziya boyanmaz; uyari kayitta verilir.
                      const priceInvalid = problem?.field === 'price' && variant.price.trim() !== ''
                      const stockInvalid = problem?.field === 'stock'
                      const customised = state.overrides[variant.key] !== undefined

                      return (
                        <div
                          key={variant.key}
                          data-variant={label}
                          className={`grid ${rowGridClass} items-center gap-x-2 gap-y-1.5 px-2.5 py-2 ${customised ? 'bg-[#FFF8EC]' : ''}`}
                        >
                          <input
                            type="checkbox"
                            aria-label={`${label} seç`}
                            checked={selected.has(variant.key)}
                            onChange={(event) => toggleSelected([variant.key], event.target.checked)}
                            className={`${cellPlacement.select} rounded border-[#D5C9BA] accent-[#C07B5A]`}
                          />
                          <p
                            title={variant.colorName}
                            className={`${cellPlacement.name} flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-[#3D2B1F]`}
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-full border border-white shadow-[0_0_0_1px_#D5C9BA]"
                              style={{ backgroundColor: getColorHex(variant.colorName) }}
                            />
                            <span className="min-w-0 break-words sm:truncate">{variant.colorName}</span>
                          </p>
                          <label className={`${cellPlacement.price} block min-w-0`}>
                            <span className={mobileCaptionClass}>Fiyat</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`${label} fiyat`}
                              aria-invalid={priceInvalid || undefined}
                              value={variant.price}
                              placeholder="Fiyat"
                              onChange={(event) => patchVariants([variant.key], { price: event.target.value })}
                              className={`${inputClass} ${priceInvalid ? 'border-[#D9534F]' : 'border-[#ECE3D6]'}`}
                            />
                          </label>
                          <label className={`${cellPlacement.stock} block min-w-0`}>
                            <span className={mobileCaptionClass}>Stok</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              aria-label={`${label} stok`}
                              aria-invalid={stockInvalid || undefined}
                              value={variant.stock}
                              onChange={(event) => patchVariants([variant.key], { stock: event.target.value })}
                              className={`${inputClass} ${stockInvalid ? 'border-[#D9534F]' : 'border-[#ECE3D6]'}`}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeVariants([variant.key])}
                            title="Bu varyantı oluşturma"
                            aria-label={`${label} varyantını çıkar`}
                            className={`${cellPlacement.remove} flex h-7 w-7 items-center justify-center rounded-[7px] text-[15px] leading-none text-[#C4B5A5] transition-colors hover:bg-[#FEEAEA] hover:text-[#8A1A1A]`}
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {removedCount > 0 ? (
            <p className="mt-2 text-[12px] text-[#7A6656]">
              {removedCount} kombinasyon çıkarıldı.{' '}
              <button type="button" onClick={() => onChange({ ...state, removed: [] })} className="font-bold text-[#C07B5A] hover:underline">
                Geri ekle
              </button>
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
