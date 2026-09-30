'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getColorHex } from '@/lib/colors'
import { PRICE_INPUT_HINT, STOCK_INPUT_HINT, parsePriceInput, parseStockInput } from '@/lib/numberInput'
import { compareSizeLabels } from '@/lib/sizes'
import { STOCK_CONFLICT_HINT, readStockConflicts, type StockConflict } from '@/lib/stockConflict'

export interface AdminVariant {
  id: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  price: number | string
  compareAtPrice: number | string | null
  currency: string
  active: boolean
}

// Bir varyant satiri: `saved` sunucudaki son hali, digerleri henuz kaydedilmemis taslak degerler.
// `staleStock`: kayit, stok bu arada degistigi icin reddedildiyse panelin o ana kadar gosterdigi stok.
interface Row {
  saved: AdminVariant
  sizeLabel: string
  price: string
  stock: string
  staleStock?: number
}

function toRow(variant: AdminVariant): Row {
  return {
    saved: variant,
    sizeLabel: variant.sizeLabel,
    price: String(variant.price),
    stock: String(variant.stockQuantity),
  }
}

const sizeChanged = (row: Row) => row.sizeLabel.trim() !== row.saved.sizeLabel
const stockChanged = (row: Row) => parseStockInput(row.stock) !== row.saved.stockQuantity
const priceChanged = (row: Row) => parsePriceInput(row.price) !== Number(row.saved.price)

function isDirty(row: Row) {
  return sizeChanged(row) || stockChanged(row) || priceChanged(row)
}

function rowProblem(row: Row): { field: 'size' | 'price' | 'stock'; message: string } | null {
  if (!row.sizeLabel.trim()) return { field: 'size', message: 'Beden seçilmeli.' }
  if (Number.isNaN(parsePriceInput(row.price))) return { field: 'price', message: PRICE_INPUT_HINT }
  if (Number.isNaN(parseStockInput(row.stock))) return { field: 'stock', message: STOCK_INPUT_HINT }
  return null
}

// Silindikten sonra urunde varyant kalmali; urunde satista (aktif) varyant varsa en az biri
// kalmali (backend ayni kurali uygular).
function leavesProductUnsellable(rows: Row[], deletingIds: Set<number>) {
  const remaining = rows.filter((row) => !deletingIds.has(row.saved.id))
  const hadActive = rows.some((row) => row.saved.active)
  return remaining.length === 0 || (hadActive && !remaining.some((row) => row.saved.active))
}

async function readApiError(res: Response, fallback: string) {
  try {
    const payload = await res.json()
    if (typeof payload?.message === 'string') return payload.message
  } catch {
    // Hata yanitlari govdesiz gelebilir.
  }
  return fallback
}

// Stok cakismasinda sunucunun bildirdigi guncel stoklar satirlara islenir; yazilan taslaklar korunur,
// boylece "Kaydet"e yeniden basmak yazilan degeri guncel stogun uzerine yazar.
function withCurrentStock(rows: Row[], conflicts: StockConflict[]): Row[] {
  const byId = new Map(conflicts.map((conflict) => [conflict.variantId, conflict]))
  return rows.map((row) => {
    const conflict = byId.get(row.saved.id)
    if (!conflict) return row
    return {
      ...row,
      saved: { ...row.saved, stockQuantity: conflict.currentStockQuantity },
      staleStock: conflict.expectedStockQuantity,
    }
  })
}

const inputClass =
  'h-9 w-full rounded-[9px] border bg-white px-2.5 text-[12.5px] text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20'

// Satir kolonlari (genis ekran): secim, renk, fiyat, stok, sil; baslik satiri ayni izgarayi kullanir.
// Telefonda renk adi kesilmesin diye satir ikiye bolunur: ustte secim + renk + sil, altta fiyat + stok.
const rowGridClass = 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_84px_68px_auto]'
const cellPlacement = {
  select: 'col-start-1 row-start-1',
  name: 'col-span-2 col-start-2 row-start-1 sm:col-span-1',
  price: 'col-start-2 row-start-2 sm:col-start-3 sm:row-start-1',
  stock: 'col-start-3 row-start-2 sm:col-start-4 sm:row-start-1',
  remove: 'col-start-4 row-start-1 sm:col-start-5',
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.6 8.5h6.8l.6-8.5M6.7 7v3.5M9.3 7v3.5" />
    </svg>
  )
}

/**
 * Urunun varyantlarini beden gruplari halinde listeler. Degisiklikler satirlarda taslak olarak
 * durur ve tek "Kaydet" ile birlikte yazilir; kayit ya da silme listeyi yeniden yuklemez, bu yuzden
 * kaydirma konumu ve diger satirlardaki taslaklar korunur.
 */
export default function ProductVariantEditor({
  variants,
  sizeOptions,
  onChange,
  onDirtyChange,
}: {
  variants: AdminVariant[]
  sizeOptions: string[]
  onChange: (variants: AdminVariant[]) => void
  onDirtyChange?: (dirtyCount: number) => void
}) {
  const [rows, setRows] = useState<Row[]>(() => variants.map(toRow))
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkStock, setBulkStock] = useState('')
  const [bulkPrice, setBulkPrice] = useState('')
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Istek surerken listeye satir eklenebilir ("Beden / renk ekle"); ust bilesene bildirilen liste
  // her zaman son satirlardan kurulur.
  const rowsRef = useRef(rows)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
  }, [])

  // Panelin disinda eklenen varyantlar listeye katilir; mevcut satirlar ve taslaklari oldugu gibi kalir.
  useEffect(() => {
    setRows((current) => {
      const known = new Set(current.map((row) => row.saved.id))
      const added = variants.filter((variant) => !known.has(variant.id))
      return added.length > 0 ? [...current, ...added.map(toRow)] : current
    })
  }, [variants])

  function showNotice(message: string) {
    setNotice(message)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 4000)
  }

  // Gruplar kaydedilmis bedene gore kurulur; boylece beden degistirilirken grup yerinden oynamaz,
  // yeni sirasina ancak kaydedildikten sonra gecer.
  const groups = useMemo(() => {
    const bySize = new Map<string, Row[]>()
    for (const row of rows) {
      bySize.set(row.saved.sizeLabel, [...(bySize.get(row.saved.sizeLabel) ?? []), row])
    }
    return [...bySize.entries()]
      .sort(([a], [b]) => compareSizeLabels(a, b))
      .map(([savedSize, groupRows]) => ({
        savedSize,
        rows: groupRows.sort((a, b) => a.saved.colorName.localeCompare(b.saved.colorName, 'tr')),
      }))
  }, [rows])

  // Ayni beden + renk taslakta iki kez olusuyorsa (orn. "6 Yaş" grubu "5-6 Yaş" yapildiginda
  // o renkte zaten "5-6 Yaş" varsa) kaydetmeden once gosterilir.
  const clashingIds = useMemo(() => {
    const byCombo = new Map<string, number[]>()
    for (const row of rows) {
      const key = `${row.sizeLabel.trim()}|${row.saved.colorName}`
      byCombo.set(key, [...(byCombo.get(key) ?? []), row.saved.id])
    }
    return new Set([...byCombo.values()].filter((ids) => ids.length > 1).flat())
  }, [rows])

  const dirtyRows = rows.filter(isDirty)
  const dirtyCount = dirtyRows.length
  const totalStock = rows.reduce((sum, row) => sum + row.saved.stockQuantity, 0)
  const allSelected = rows.length > 0 && selected.size === rows.length

  useEffect(() => {
    onDirtyChange?.(dirtyCount)
  }, [dirtyCount, onDirtyChange])

  function patchRows(ids: Set<number>, patch: Partial<Pick<Row, 'sizeLabel' | 'price' | 'stock'>>) {
    setError(null)
    setRows((current) => current.map((row) => (ids.has(row.saved.id) ? { ...row, ...patch } : row)))
  }

  function toggleSelected(ids: number[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })
  }

  function applyBulk() {
    const patch: Partial<Pick<Row, 'price' | 'stock'>> = {}
    if (bulkStock.trim() !== '') patch.stock = bulkStock.trim()
    if (bulkPrice.trim() !== '') patch.price = bulkPrice.trim()
    if (Object.keys(patch).length === 0) return
    patchRows(selected, patch)
    setBulkStock('')
    setBulkPrice('')
  }

  function resetDrafts() {
    setError(null)
    setRows((current) => current.map((row) => toRow(row.saved)))
  }

  async function saveAll() {
    if (busy || dirtyCount === 0) return
    setNotice(null)

    const invalid = dirtyRows.find((row) => rowProblem(row))
    if (invalid) {
      setError(`${invalid.saved.sizeLabel} / ${invalid.saved.colorName}: ${rowProblem(invalid)?.message}`)
      return
    }
    const clashing = rows.find((row) => clashingIds.has(row.saved.id))
    if (clashing) {
      setError(`"${clashing.sizeLabel} / ${clashing.saved.colorName}" birden fazla kez var. Aynı beden ve renkten yalnızca bir varyant olabilir.`)
      return
    }

    setBusy('save')
    setError(null)
    const sent = new Map(dirtyRows.map((row) => [row.saved.id, row]))
    try {
      const res = await fetch('/api/admin/variants', {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        // Yalnizca degisen alanlar gonderilir: stoga dokunulmadiysa sunucudaki stok (bu arada bir
        // siparisle azalmis olabilir) panelin acildigi andaki degerle ezilmez. Stok degistiyse panelin
        // gordugu deger de gider; arada stok degismisse sunucu kaydi reddeder (asagida).
        body: JSON.stringify({
          variants: dirtyRows.map((row) => ({
            id: row.saved.id,
            ...(sizeChanged(row) ? { sizeLabel: row.sizeLabel.trim() } : {}),
            ...(stockChanged(row)
              ? { stockQuantity: parseStockInput(row.stock), expectedStockQuantity: row.saved.stockQuantity }
              : {}),
            ...(priceChanged(row) ? { price: parsePriceInput(row.price) } : {}),
          })),
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        const conflicts = res.status === 409 ? readStockConflicts(payload) : null
        if (!conflicts) {
          throw new Error(typeof payload?.message === 'string' && payload.message.trim() ? payload.message : 'Varyantlar kaydedilemedi.')
        }
        // Hicbir degisiklik yazilmadi: guncel stoklar gosterilir, taslaklar korunur.
        setRows((current) => withCurrentStock(current, conflicts))
        onChange(withCurrentStock(rowsRef.current, conflicts).map((row) => row.saved))
        setError(`${typeof payload?.message === 'string' ? payload.message : 'Stok bu arada değişti.'} ${STOCK_CONFLICT_HINT}`)
        return
      }

      const updated = new Map((payload as AdminVariant[]).map((variant) => [variant.id, variant]))
      // Yalnizca kaydedilen satirlar sunucu yanitiyla yenilenir. Istek surerken yazilmaya devam
      // edilen taslaklar (ayni satirda bile) korunur; o satir degisik olarak kalir.
      setRows((current) =>
        current.map((row) => {
          const saved = updated.get(row.saved.id)
          if (!saved) return row
          const sentRow = sent.get(row.saved.id)
          const untouched =
            sentRow !== undefined &&
            row.sizeLabel === sentRow.sizeLabel &&
            row.price === sentRow.price &&
            row.stock === sentRow.stock
          return untouched ? toRow(saved) : { ...row, saved, staleStock: undefined }
        }),
      )
      onChange(rowsRef.current.map((row) => updated.get(row.saved.id) ?? row.saved))
      showNotice(`${updated.size} varyant kaydedildi.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Varyantlar kaydedilemedi.')
    } finally {
      setBusy(null)
    }
  }

  async function deleteRows(ids: number[], description: string) {
    if (busy || ids.length === 0) return
    setNotice(null)
    if (leavesProductUnsellable(rows, new Set(ids))) {
      setError('Ürünün tüm varyantları silinemez; satışta en az bir varyant kalmalı. Ürünü kaldırmak için aşağıdaki "Kalıcı Olarak Sil"i kullanın.')
      return
    }
    const confirmed = window.confirm(
      `${description} kalıcı olarak silinecek.\n\nBu işlem geri alınamaz. Eski siparişler etkilenmez; sepetlerdeki ilgili satırlar temizlenir. Devam edilsin mi?`,
    )
    if (!confirmed) return

    setBusy('delete')
    setError(null)
    try {
      const res = await fetch('/api/admin/variants/delete', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Varyantlar silinemedi.'))

      const removed = new Set(ids)
      const nextRows = rowsRef.current.filter((row) => !removed.has(row.saved.id))
      setRows((current) => current.filter((row) => !removed.has(row.saved.id)))
      setSelected((current) => new Set([...current].filter((id) => !removed.has(id))))
      onChange(nextRows.map((row) => row.saved))
      showNotice(`${ids.length} varyant silindi.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Varyantlar silinemedi.')
    } finally {
      setBusy(null)
    }
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void saveAll()
    }
  }

  if (rows.length === 0) {
    return <p className="mt-3 text-[12.5px] text-[#B5A090]">Bu ürünün varyantı yok.</p>
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3 text-[12px] text-[#7A6656]">
        <label className="flex cursor-pointer items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => toggleSelected(rows.map((row) => row.saved.id), event.target.checked)}
            className="rounded border-[#D5C9BA] accent-[#C07B5A]"
          />
          Tümünü seç
        </label>
        <span>
          {rows.length} varyant · toplam stok {totalStock}
        </span>
      </div>

      {selected.size > 0 ? (
        <div className="sticky top-0 z-10 -mx-1 mt-2 rounded-[12px] border border-[#E4D6C3] bg-[#FFF8EC] p-2.5 shadow-[0_8px_18px_-14px_rgba(91,72,57,.6)]">
          <div className="flex items-center gap-3">
            <p className="mr-auto text-[12px] font-bold text-[#5B4839]">{selected.size} varyant seçili</p>
            <button
              type="button"
              onClick={() => void deleteRows([...selected], `Seçili ${selected.size} varyant`)}
              disabled={busy !== null}
              className="text-[11.5px] font-bold text-[#8A1A1A] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Seçilenleri sil
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
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
                value={bulkStock}
                placeholder="değiştirme"
                onChange={(event) => setBulkStock(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyBulk() } }}
                className={`${inputClass} border-[#ECE3D6] placeholder:text-[#C4B5A5]`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-[#5B4839]">Fiyat</span>
              <input
                type="text"
                inputMode="decimal"
                value={bulkPrice}
                placeholder="değiştirme"
                onChange={(event) => setBulkPrice(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyBulk() } }}
                className={`${inputClass} border-[#ECE3D6] placeholder:text-[#C4B5A5]`}
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
          const groupIds = group.rows.map((row) => row.saved.id)
          const selectedInGroup = groupIds.filter((id) => selected.has(id)).length
          const draftSize = group.rows[0].sizeLabel
          const options = sizeOptions.includes(group.savedSize) ? sizeOptions : [group.savedSize, ...sizeOptions]
          const renamed = draftSize !== group.savedSize

          return (
            <div key={group.savedSize} className="overflow-hidden rounded-[10px] border border-[#ECE3D6]">
              <div className={`flex items-center gap-2 px-2.5 py-2 ${renamed ? 'bg-[#FFF8EC]' : 'bg-[#FAF6F1]'}`}>
                <input
                  type="checkbox"
                  aria-label={`${group.savedSize} bedenindeki tüm varyantları seç`}
                  checked={selectedInGroup === groupIds.length}
                  ref={(element) => {
                    if (element) element.indeterminate = selectedInGroup > 0 && selectedInGroup < groupIds.length
                  }}
                  onChange={(event) => toggleSelected(groupIds, event.target.checked)}
                  className="rounded border-[#D5C9BA] accent-[#C07B5A]"
                />
                <select
                  aria-label={`${group.savedSize} bedenini değiştir`}
                  value={draftSize}
                  onChange={(event) => patchRows(new Set(groupIds), { sizeLabel: event.target.value })}
                  className="h-8 min-w-0 rounded-[8px] border border-[#ECE3D6] bg-white px-2 text-[12.5px] font-bold text-[#3D2B1F] outline-none focus:border-[#A89070]"
                >
                  {options.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                {!sizeOptions.includes(draftSize) ? (
                  <span
                    title="Bu beden sabit listede yok. Açılır listeden doğru aralığı seçip kaydedin veya bedeni silin."
                    className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10.5px] font-bold text-[#9A5B20]"
                  >
                    listede yok
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] text-[#B5A090]">{group.rows.length} renk</span>
                <button
                  type="button"
                  onClick={() => void deleteRows(groupIds, `"${group.savedSize}" bedeni (${groupIds.length} varyant)`)}
                  disabled={busy !== null}
                  title={`${group.savedSize} bedenini sil`}
                  aria-label={`${group.savedSize} bedenini sil`}
                  className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#B35A48] transition-colors hover:bg-[#FEEAEA] disabled:opacity-50"
                >
                  <TrashIcon />
                </button>
              </div>

              <div className="divide-y divide-[#F4EEE6]">
                {group.rows.map((row) => {
                  const id = row.saved.id
                  const label = `${row.saved.sizeLabel} / ${row.saved.colorName}`
                  const problem = isDirty(row) ? rowProblem(row) : null
                  const clashing = clashingIds.has(id)
                  const priceInvalid = problem?.field === 'price'
                  const stockInvalid = problem?.field === 'stock'

                  return (
                    <div
                      key={id}
                      data-variant={label}
                      className={`grid ${rowGridClass} items-center gap-x-2 gap-y-1.5 px-2.5 py-2 ${isDirty(row) ? 'bg-[#FFF8EC]' : ''}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${label} seç`}
                        checked={selected.has(id)}
                        onChange={(event) => toggleSelected([id], event.target.checked)}
                        className={`${cellPlacement.select} rounded border-[#D5C9BA] accent-[#C07B5A]`}
                      />
                      <div className={`${cellPlacement.name} min-w-0`}>
                        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3D2B1F]" title={row.saved.colorName}>
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-white shadow-[0_0_0_1px_#D5C9BA]"
                            style={{ backgroundColor: getColorHex(row.saved.colorName) }}
                          />
                          <span className="min-w-0 break-words sm:truncate">{row.saved.colorName}</span>
                          {row.saved.active ? null : <span className="shrink-0 text-[11px] font-semibold text-[#B5A090]">(Pasif)</span>}
                        </p>
                        {clashing ? (
                          <p className="mt-0.5 text-[11px] font-semibold text-[#8A1A1A]">Bu beden/renk zaten var</p>
                        ) : null}
                        {row.staleStock !== undefined ? (
                          <p className="mt-0.5 text-[11px] font-semibold text-[#9A5B20]">
                            Stok bu arada değişti: {row.staleStock} → {row.saved.stockQuantity}
                          </p>
                        ) : null}
                      </div>
                      <label className={`${cellPlacement.price} block min-w-0`}>
                        <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#C4B5A5] sm:hidden">Fiyat</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${label} fiyat`}
                          aria-invalid={priceInvalid || undefined}
                          value={row.price}
                          onChange={(event) => patchRows(new Set([id]), { price: event.target.value })}
                          onKeyDown={handleEnter}
                          className={`${inputClass} ${priceInvalid ? 'border-[#D9534F]' : 'border-[#ECE3D6]'}`}
                        />
                      </label>
                      <label className={`${cellPlacement.stock} block min-w-0`}>
                        <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#C4B5A5] sm:hidden">Stok</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${label} stok`}
                          aria-invalid={stockInvalid || undefined}
                          value={row.stock}
                          onChange={(event) => patchRows(new Set([id]), { stock: event.target.value })}
                          onKeyDown={handleEnter}
                          className={`${inputClass} ${stockInvalid ? 'border-[#D9534F]' : 'border-[#ECE3D6]'}`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void deleteRows([id], `"${label}" varyantı`)}
                        disabled={busy !== null}
                        title="Varyantı sil"
                        aria-label={`${label} varyantını sil`}
                        className={`${cellPlacement.remove} flex h-7 w-7 items-center justify-center rounded-[7px] text-[#C4B5A5] transition-colors hover:bg-[#FEEAEA] hover:text-[#8A1A1A] disabled:opacity-50`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {dirtyCount > 0 || error || notice ? (
        <div className="sticky bottom-0 z-10 -mx-1 mt-3 rounded-[12px] border border-[#ECE3D6] bg-white p-2.5 shadow-[0_-8px_18px_-14px_rgba(91,72,57,.6)]">
          {error ? (
            <div role="alert" className="mb-2 rounded-[9px] bg-[#FEEAEA] px-3 py-2 text-[12px] text-[#8A1A1A]">{error}</div>
          ) : null}
          {notice && dirtyCount === 0 ? (
            <div role="status" className="rounded-[9px] bg-[#EDF7F1] px-3 py-2 text-[12px] font-semibold text-[#1A6640]">{notice}</div>
          ) : null}
          {dirtyCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-[#5B4839]">{dirtyCount} değişiklik kaydedilmedi</p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={resetDrafts}
                  disabled={busy !== null}
                  className="h-9 whitespace-nowrap rounded-[9px] border border-[#ECE3D6] px-3 text-[12px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:opacity-50"
                >
                  Geri al
                </button>
                <button
                  type="button"
                  onClick={() => void saveAll()}
                  disabled={busy !== null}
                  className="h-9 whitespace-nowrap rounded-[9px] bg-[#C07B5A] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === 'save' ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
