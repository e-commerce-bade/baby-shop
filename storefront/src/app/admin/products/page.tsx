'use client'

import { Suspense, useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AddVariantsPanel from '@/components/admin/AddVariantsPanel'
import AdminShell from '@/components/admin/AdminShell'
import ImageLightbox, { type LightboxImage } from '@/components/admin/ImageLightbox'
import NewProductVariants, {
  EMPTY_NEW_VARIANTS,
  buildNewVariants,
  newVariantProblem,
  type NewVariantsState,
} from '@/components/admin/NewProductVariants'
import { parsePriceInput, parseStockInput } from '@/lib/numberInput'
import ProductVariantEditor, { type AdminVariant } from '@/components/admin/ProductVariantEditor'
import MultiSelect from '@/components/admin/MultiSelect'
import { compareSizeLabels, sizeOptionsForCategory } from '@/lib/sizes'
import { foldForSearch, formatPrice } from '@/lib/utils'
import { filterProductTypes } from '@/lib/mock/filterData'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface AdminProduct {
  id: number
  name: string
  active: boolean
  brand?: string | null
  productType?: string | null
  minPrice?: number | string | null
  currency?: string
  price?: number
  basePrice?: number
  stockQuantity?: number
  totalStock?: number
  categoryName?: string
  categorySlug?: string
  category?: { name: string }
  sku?: string
  thumbnailUrl?: string
  imageUrl?: string
  primaryImageUrl?: string | null
  updatedAt?: string
  variantCount?: number
  variants?: ProductVariant[]
}

interface ProductVariant {
  id: number
  sku: string | null
  sizeLabel: string
  colorName: string
  stockQuantity: number
  price: number | string
  currency: string
  active: boolean
}

interface AdminProductImage {
  id: number
  imageUrl: string
  altText: string | null
  colorName: string | null
  sortOrder: number
  primary: boolean
}

interface AdminCategory {
  id: number
  name: string
  active: boolean
}

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
type StatusFilter = 'all' | 'active' | 'inactive'
type VariantCountFilter = 'all' | 'single' | 'multiple'
type ProductDrawerTab = 'details' | 'variant' | 'media'

interface ColorImageDraft {
  imageUrl: string
  fileName: string
  altText: string
}

const drawerTabs: Array<{ id: ProductDrawerTab; label: string }> = [
  { id: 'details', label: 'Urun Detayi' },
  { id: 'variant', label: 'Varyant & Stok' },
  { id: 'media', label: 'Gorseller' },
]

// `token` urune ozeldir: bas harfleri, rengi ve bedeni ayni olan iki urunun SKU'lari cakismasin diye
// (SKU tekil olmak zorunda; cakisma urunun yarim kaydedilmesine yol aciyordu).
function generateSku(productName: string, colorName: string, sizeLabel: string, token: string) {
  const productPart = toSlug(productName)
    .split('-')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 5) || 'URN'
  const colorPart = toSlug(colorName).replace(/-/g, '').slice(0, 6) || 'renk'
  const sizePart = toSlug(sizeLabel).replace(/-/g, '').slice(0, 6) || 'beden'

  return `${productPart}-${colorPart}-${sizePart}-${token}`.toUpperCase()
}

function newSkuToken() {
  return Math.random().toString(36).slice(2, 6).padEnd(4, '0')
}

function toSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function readApiError(res: Response, fallback: string) {
  try {
    const payload = await res.json()
    if (typeof payload?.message === 'string') return payload.message
    if (typeof payload?.error === 'string') return payload.error
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      const first = payload.errors[0]
      if (typeof first === 'string') return first
      if (typeof first?.defaultMessage === 'string') return first.defaultMessage
      if (typeof first?.message === 'string') return first.message
    }
  } catch {
    // Validation responses can arrive without a JSON body.
  }
  return fallback
}

async function postJson<T>(url: string, body: unknown, fallbackError: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res, fallbackError))
  return (await res.json()) as T
}

async function loadAdminCatalog() {
  const [prodRes, categoriesRes] = await Promise.all([
    fetch('/api/admin/products', { cache: 'no-store', headers: { Accept: 'application/json' } }),
    fetch('/api/admin/categories', { cache: 'no-store', headers: { Accept: 'application/json' } }),
  ])
  if (!prodRes.ok) throw new Error('Urunler yuklenemedi.')
  if (!categoriesRes.ok) throw new Error('Kategoriler yuklenemedi.')
  return {
    products: (await prodRes.json()) as AdminProduct[],
    categories: (await categoriesRes.json()) as AdminCategory[],
  }
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StockBadge({ qty }: { qty: number | undefined }) {
  if (qty === undefined) return <span className="text-[#C4B5A5] text-[12px]">—</span>
  if (qty === 0) return <span className="rounded-full bg-[#FEEAEA] px-2.5 py-1 text-[11px] font-bold text-[#8A1A1A]">Tükendi</span>
  if (qty <= 5) return <span className="rounded-full bg-[#FFF8EC] px-2.5 py-1 text-[11px] font-bold text-[#9A7020]">Az Stok ({qty})</span>
  return <span className="rounded-full bg-[#EDF7F1] px-2.5 py-1 text-[11px] font-bold text-[#1A6640]">Stokta ({qty})</span>
}

// `onOpen` verilirse kucuk gorsel tiklanabilir olur ve buyuk onizlemeyi acar.
function ProductImage({ src, name, onOpen }: { src?: string; name: string; onOpen?: () => void }) {
  if (src && onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title="Görseli büyüt"
        aria-label={`${name} görselini büyüt`}
        className="shrink-0 cursor-zoom-in rounded-[8px] ring-[#C07B5A] transition-shadow hover:ring-2 focus-visible:outline-none focus-visible:ring-2"
      >
        <img src={src} alt={name} className="h-10 w-10 rounded-[8px] object-cover" />
      </button>
    )
  }
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-10 w-10 rounded-[8px] object-cover"
      />
    )
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F4EEE6]">
      <svg className="h-5 w-5 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M10 2L2 6v8l8 4 8-4V6L10 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function AddProductDrawer({
  categories,
  onClose,
}: {
  categories: AdminCategory[]
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <h2 className="text-[16px] font-bold text-[#3D2B1F]">Yeni Ürün Ekle</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#C4B5A5] hover:bg-[#FAF6F1] hover:text-[#5B4839]"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#ECE3D6] px-6">
          {['Ürün Detayı', 'Varyant & Stok', 'Görseller', 'SEO'].map((tab, i) => (
            <button
              key={tab}
              className={`mr-5 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
                i === 0
                  ? 'border-[#C07B5A] text-[#C07B5A]'
                  : 'border-transparent text-[#C4B5A5] hover:text-[#5B4839]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Image upload */}
          <div className="mb-5 rounded-[12px] border-2 border-dashed border-[#ECE3D6] bg-[#FAF6F1] p-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#F4EEE6]">
              <svg className="h-5 w-5 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 16l4-4 3 3 4-5 3 3" /><rect x="2" y="4" width="16" height="12" rx="2" /></svg>
            </div>
            <p className="text-[12.5px] font-semibold text-[#B5A090]">JPG, PNG – max 5MB</p>
            <button className="mt-2 text-[12px] font-bold text-[#C07B5A] hover:underline">Görsel Yükle</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                Ürün Adı <span className="text-[#C07B5A]">*</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Bebek Tulum"
                className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Açıklama</label>
              <textarea
                rows={3}
                placeholder="Ürün açıklaması..."
                className="w-full resize-none rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                Kategori <span className="text-[#C07B5A]">*</span>
              </label>
              <select className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] focus:border-[#A89070] focus:outline-none">
                <option value="">Kategori Seç</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.active ? '' : ' (Pasif)'}
                  </option>
                ))}
              </select>
              {categories.length === 0 ? (
                <p className="mt-1 text-[11.5px] text-[#C07B5A]">
                  Önce bir kategori ekleyin.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                  Satış Fiyatı <span className="text-[#C07B5A]">*</span>
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Maliyet Fiyatı</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[10px] border border-[#ECE3D6] px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[#3D2B1F]">Durum</p>
                <p className="text-[11.5px] text-[#C4B5A5]">Ürünü aktif yap</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-[#C07B5A] relative">
                <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#ECE3D6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[10px] border border-[#ECE3D6] py-2.5 text-[13px] font-bold text-[#5B4839] hover:bg-[#FAF6F1] transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            className="flex-1 rounded-[10px] bg-[#C07B5A] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849]"
          >
            Sonraki: Varyant & Stok
          </button>
        </div>
      </div>
    </>
  )
}

function WorkingAddProductDrawer({
  categories,
  knownColors,
  onSaved,
  onClose,
}: {
  categories: AdminCategory[]
  knownColors: string[]
  onSaved: () => Promise<void> | void
  onClose: () => void
}) {
  const [tab, setTab] = useState<ProductDrawerTab>('details')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [productType, setProductType] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [active, setActive] = useState(true)
  // Beden/renk secimi, ortak fiyat/stok ve satir bazli degisiklikler; varyantlar bundan turetilir.
  const [variantState, setVariantState] = useState<NewVariantsState>(EMPTY_NEW_VARIANTS)
  const [colorImages, setColorImages] = useState<Record<string, ColorImageDraft[]>>({})
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState(false)
  const [uploadingColor, setUploadingColor] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const skuToken = useRef(newSkuToken())

  const currentTabIndex = drawerTabs.findIndex((item) => item.id === tab)
  const selectedCategory = categories.find((category) => String(category.id) === categoryId)
  const sizePreset = sizeOptionsForCategory(selectedCategory?.name)
  const colors = variantState.colors
  const variants = useMemo(() => buildNewVariants(variantState), [variantState])

  function handleNameChange(value: string) {
    setName(value)
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value)
    // Bebek kategorilerinde ay, digerlerinde yas listesi gecerli; yeni listede olmayan secimler duser.
    const nextSizes = sizeOptionsForCategory(categories.find((category) => String(category.id) === value)?.name).sizes
    setVariantState((current) => ({ ...current, sizes: current.sizes.filter((size) => nextSizes.includes(size)) }))
  }

  function addColorImage(color: string, draft: ColorImageDraft) {
    setColorImages((prev) => ({
      ...prev,
      [color]: [...(prev[color] ?? []), draft],
    }))
  }

  function updateColorImageAt(color: string, index: number, patch: Partial<ColorImageDraft>) {
    setColorImages((prev) => ({
      ...prev,
      [color]: (prev[color] ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  function removeColorImageAt(color: string, index: number) {
    setColorImages((prev) => ({
      ...prev,
      [color]: (prev[color] ?? []).filter((_, i) => i !== index),
    }))
  }

  // "Varyant & Stok" adiminin eksigini soyler (yoksa null). Hem adim gecisinde hem kayitta kullanilir.
  function variantStepProblem() {
    if (variantState.sizes.length === 0) return 'En az bir beden/yaş seçin.'
    if (colors.length === 0) return 'En az bir renk ekleyin.'
    if (variants.length === 0) return 'Tüm kombinasyonlar çıkarılmış; en az bir varyant kalmalı.'
    if (variantState.currency.trim().length !== 3) return 'Para birimi 3 harf olmalı. Örnek: TRY'
    if (variantState.price.trim() === '' && variants.some((variant) => variant.price.trim() === '')) {
      return 'Fiyat girin.'
    }
    const invalid = variants.find((variant) => newVariantProblem(variant))
    if (invalid) {
      return `${invalid.sizeLabel} / ${invalid.colorName}: ${newVariantProblem(invalid)?.message}`
    }
    if (variantState.compareAtPrice.trim() !== '' && Number.isNaN(parsePriceInput(variantState.compareAtPrice))) {
      return 'İndirimsiz fiyat geçerli bir tutar olmalı (en fazla 2 ondalık, örn. 499,90).'
    }
    return null
  }

  async function handleColorImageUpload(color: string, files: FileList | null) {
    setFormError(null)
    if (!files || files.length === 0) return

    setUploadingColor(color)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/admin/uploads', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          throw new Error(await readApiError(res, 'Gorsel yuklenemedi.'))
        }

        const payload = (await res.json()) as { imageUrl: string }
        addColorImage(color, {
          imageUrl: payload.imageUrl,
          fileName: file.name,
          altText: `${name.trim() || file.name.replace(/\.[^.]+$/, '')} ${color}`.trim(),
        })
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Gorsel yuklenirken hata olustu.')
    } finally {
      setUploadingColor(null)
    }
  }

  async function handleSave() {
    setFormError(null)

    const trimmedName = name.trim()
    const generatedSlug = toSlug(trimmedName) || `urun-${Date.now()}`
    const numericCategoryId = Number(categoryId)

    if (!trimmedName) {
      setTab('details')
      setFormError('Urun adi zorunlu.')
      return
    }
    if (!numericCategoryId) {
      setTab('details')
      setFormError('Kategori secimi zorunlu.')
      return
    }
    if (!productType.trim()) {
      setTab('details')
      setFormError('Urun tipi zorunlu.')
      return
    }
    const variantProblem = variantStepProblem()
    if (variantProblem) {
      setTab('variant')
      setFormError(variantProblem)
      return
    }

    const compareAtPrice = variantState.compareAtPrice.trim() ? parsePriceInput(variantState.compareAtPrice) : null

    // SKU'nun renk parcasi kisaltildigi icin ayni harflerle baslayan iki renk ("Beyaz-Mavi",
    // "Beyaz-Mor") ayni bedende ayni SKU'yu uretebilir; urun icinde tekil olmasi saglanir.
    const usedSkus = new Set<string>()
    const skuFor = (colorName: string, sizeLabel: string) => {
      const base = generateSku(trimmedName, colorName, sizeLabel, skuToken.current)
      let sku = base
      for (let suffix = 2; usedSkus.has(sku); suffix++) sku = `${base}-${suffix}`
      usedSkus.add(sku)
      return sku
    }

    setSaving(true)
    let createdId: number | null = null
    try {
      // Urun once pasif olusturulur, varyant ve gorselleri tamamlaninca istenirse yayina alinir;
      // boylece yarim kalan bir kayit magazada hic gorunmez.
      const created = await postJson<{ id: number }>('/api/admin/products', {
        categoryId: numericCategoryId,
        name: trimmedName,
        slug: generatedSlug,
        description: description.trim() || null,
        brand: brand.trim() || null,
        productType: productType.trim(),
        active: false,
      }, 'Urun olusturulamadi.')
      createdId = created.id

      for (const variant of variants) {
        await postJson(`/api/admin/products/${created.id}/variants`, {
          sku: skuFor(variant.colorName, variant.sizeLabel),
          sizeLabel: variant.sizeLabel,
          colorName: variant.colorName,
          stockQuantity: parseStockInput(variant.stock),
          price: parsePriceInput(variant.price),
          compareAtPrice,
          currency: variantState.currency.trim().toUpperCase(),
          active: true,
        }, 'Urun varyanti olusturulamadi.')
      }

      const uploadedImages = colors.flatMap((color) =>
        (colorImages[color] ?? [])
          .filter((image) => image.imageUrl.trim())
          .map((image) => ({ color, image })),
      )

      for (const [index, item] of uploadedImages.entries()) {
        await postJson(`/api/admin/products/${created.id}/images`, {
          imageUrl: item.image.imageUrl.trim(),
          altText: item.image.altText.trim() || `${trimmedName} ${item.color}`,
          colorName: item.color,
          sortOrder: index + 1,
          primary: index === 0,
        }, 'Urun gorseli kaydedilemedi.')
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'Urun kaydedilirken hata olustu.'
      if (createdId === null) {
        setFormError(reason)
      } else {
        // Urun olustu ama varyant/gorsel adimi yarida kaldi: yarim urun kalmasin diye geri alinir;
        // form oldugu gibi durur, duzeltip yeniden kaydedilebilir.
        const rolledBack = await fetch(`/api/admin/products/${createdId}`, { method: 'DELETE' })
          .then((res) => res.ok)
          .catch(() => false)
        skuToken.current = newSkuToken()
        if (rolledBack) {
          setFormError(`${reason} Ürün kaydedilmedi; düzeltip yeniden deneyin.`)
        } else {
          setFormError(`${reason} Ürün eksik ve pasif olarak kaldı; listeden silip yeniden ekleyin.`)
          await Promise.resolve(onSaved()).catch(() => undefined)
        }
      }
      setSaving(false)
      return
    }

    // Buradan sonrasi urunu geri almaz: urun tamamen kaydedildi.
    let publishProblem: string | null = null
    if (active) {
      const published = await fetch(`/api/admin/products/${createdId}/active`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      }).then((res) => res.ok).catch(() => false)
      if (!published) publishProblem = 'Ürün kaydedildi ama yayına alınamadı; listeden açıp aktif yapın.'
    }
    // Liste yenilenemese de kayit yerindedir; bir sonraki yuklemede gorunur.
    await Promise.resolve(onSaved()).catch(() => undefined)
    setSaving(false)
    if (publishProblem) {
      // Cekmece acik kalir ki mesaj okunsun; ikinci bir kayit (mukerrer urun) engellenir.
      setFinished(true)
      setFormError(publishProblem)
      return
    }
    onClose()
  }

  // Kayit surerken cekmece kapatilamaz: yarida kalan bir kayit, sonucu gosterecek yer kalmadan
  // geri alinirdi.
  function requestClose() {
    if (saving) return
    onClose()
  }

  function validateDetailsStep() {
    if (!name.trim()) {
      setFormError('Urun adi zorunlu.')
      return false
    }
    if (!Number(categoryId)) {
      setFormError('Kategori secimi zorunlu.')
      return false
    }
    if (!productType.trim()) {
      setFormError('Urun tipi zorunlu.')
      return false
    }
    return true
  }

  function handlePrimaryAction() {
    if (finished) return
    setFormError(null)
    if (currentTabIndex < drawerTabs.length - 1) {
      // Adim atlamadan once o adimin zorunlu alanlarini dogrula.
      if (tab === 'details' && !validateDetailsStep()) return
      if (tab === 'variant') {
        const variantProblem = variantStepProblem()
        if (variantProblem) {
          setFormError(variantProblem)
          return
        }
      }
      setTab(drawerTabs[currentTabIndex + 1].id)
      return
    }
    void handleSave()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={requestClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <h2 className="text-[16px] font-bold text-[#3D2B1F]">Yeni Urun Ekle</h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#C4B5A5] hover:bg-[#FAF6F1] hover:text-[#5B4839] disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-[#ECE3D6] px-6">
          {drawerTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`mr-5 whitespace-nowrap border-b-2 py-3 text-[13px] font-semibold transition-colors ${
                tab === item.id
                  ? 'border-[#C07B5A] text-[#C07B5A]'
                  : 'border-transparent text-[#C4B5A5] hover:text-[#5B4839]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {formError ? (
            <div className="mb-4 rounded-[10px] border border-[#F2C7B8] bg-[#FFF6F2] px-4 py-3 text-[12.5px] font-semibold text-[#9A422D]">
              {formError}
            </div>
          ) : null}

          {tab === 'details' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                  Urun Adi <span className="text-[#C07B5A]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Orn: Bebek Tulum"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Marka</label>
                <input
                  type="text"
                  placeholder="MiniMori"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Aciklama</label>
                <textarea
                  rows={3}
                  placeholder="Urun aciklamasi..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                  Kategori <span className="text-[#C07B5A]">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] focus:border-[#A89070] focus:outline-none"
                >
                  <option value="">Kategori Sec</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}{category.active ? '' : ' (Pasif)'}
                    </option>
                  ))}
                </select>
                {categories.length === 0 ? (
                  <p className="mt-1 text-[11.5px] text-[#C07B5A]">Once bir kategori ekleyin.</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                  Urun Tipi <span className="text-[#C07B5A]">*</span>
                </label>
                <input
                  type="text"
                  list="admin-product-type-options"
                  placeholder="Pijama, Elbise, Gomlek..."
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                />
                <datalist id="admin-product-type-options">
                  {filterProductTypes.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11.5px] text-[#B5A090]">
                  Yeni bir tip yazarsan filtrelerde de kullanilabilir.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActive((value) => !value)}
                className="flex w-full items-center justify-between rounded-[10px] border border-[#ECE3D6] px-4 py-3 text-left"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#3D2B1F]">Durum</p>
                  <p className="text-[11.5px] text-[#C4B5A5]">Urunu aktif yap</p>
                </div>
                <span className={`relative h-6 w-11 rounded-full transition-colors ${active ? 'bg-[#C07B5A]' : 'bg-[#DDD2C4]'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </div>
          ) : null}

          {tab === 'variant' ? (
            <NewProductVariants
              state={variantState}
              onChange={(next) => {
                setFormError(null)
                setVariantState(next)
              }}
              sizeListLabel={sizePreset.label}
              sizeOptions={sizePreset.sizes}
              knownColors={knownColors}
            />
          ) : null}

          {tab === 'media' ? (
            <div className="space-y-4">
              {colors.length === 0 ? (
                <div className="rounded-[12px] border border-[#ECE3D6] bg-[#FAF6F1] px-4 py-3 text-[12.5px] font-semibold text-[#9A7020]">
                  Once Varyant & Stok adiminda renk ekleyin.
                </div>
              ) : (
                <>
                  <div className="rounded-[12px] border border-[#ECE3D6] bg-[#FAF6F1] px-4 py-3">
                    <p className="text-[12px] font-bold text-[#5B4839]">Renk bazli gorseller</p>
                    <p className="mt-1 text-[11.5px] text-[#B5A090]">
                      Her renk icin birden fazla gorsel yukleyebilirsiniz (on, arka/sirt baskisi vb.). Ilk yuklenen gorsel urunun ana gorseli olur.
                    </p>
                  </div>

                  {colors.map((color) => {
                    const images = colorImages[color] ?? []
                    const inputId = `product-image-upload-${toSlug(color)}`
                    return (
                      <div key={color} className="rounded-[12px] border border-[#ECE3D6] bg-white p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-bold text-[#3D2B1F]">{color}</p>
                            <p className="text-[11.5px] text-[#B5A090]">
                              {uploadingColor === color
                                ? 'Gorsel yukleniyor...'
                                : `${images.length} gorsel - JPG, PNG veya WEBP - max 5MB`}
                            </p>
                          </div>
                          <input
                            id={inputId}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              void handleColorImageUpload(color, e.target.files)
                              e.target.value = ''
                            }}
                          />
                          <label
                            htmlFor={inputId}
                            className="shrink-0 cursor-pointer rounded-[10px] bg-[#FAF6F1] px-3 py-2 text-[12px] font-bold text-[#C07B5A] ring-1 ring-[#ECE3D6] hover:bg-[#FFFDFC]"
                          >
                            {images.length > 0 ? 'Gorsel Ekle' : 'Sec'}
                          </label>
                        </div>

                        {images.length > 0 ? (
                          <div className="space-y-3">
                            {images.map((image, index) => (
                              <div key={`${color}-${index}`} className="rounded-[10px] border border-[#F0E8DD] bg-[#FFFDFC] p-2.5">
                                <div className="flex gap-3">
                                  <img
                                    src={image.imageUrl}
                                    alt={image.altText || `${name} ${color}`}
                                    className="h-24 w-24 shrink-0 rounded-[10px] object-cover"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                      <p className="truncate text-[11.5px] font-semibold text-[#5B4839]">{image.fileName}</p>
                                      <button
                                        type="button"
                                        onClick={() => removeColorImageAt(color, index)}
                                        className="shrink-0 text-[11.5px] font-bold text-[#C0392B] hover:underline"
                                      >
                                        Sil
                                      </button>
                                    </div>
                                    <label className="mb-1 block text-[11.5px] font-bold text-[#5B4839]">Alt Metin</label>
                                    <input
                                      type="text"
                                      value={image.altText}
                                      onChange={(e) => updateColorImageAt(color, index, { altText: e.target.value })}
                                      className="w-full rounded-[8px] border border-[#ECE3D6] bg-white px-3 py-2 text-[12.5px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-24 items-center justify-center rounded-[10px] border-2 border-dashed border-[#ECE3D6] bg-[#FAF6F1]">
                            <svg className="h-5 w-5 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 16l4-4 3 3 4-5 3 3" /><rect x="2" y="4" width="16" height="12" rx="2" /></svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          ) : null}

        </div>

        <div className="flex gap-3 border-t border-[#ECE3D6] px-6 py-4">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="flex-1 rounded-[10px] border border-[#ECE3D6] py-2.5 text-[13px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:opacity-50"
          >
            {finished ? 'Kapat' : 'Iptal'}
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={saving || finished || Boolean(uploadingColor)}
            className="flex-1 rounded-[10px] bg-[#C07B5A] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Kaydediliyor...' : finished ? 'Kaydedildi' : currentTabIndex < drawerTabs.length - 1 ? `Sonraki: ${drawerTabs[currentTabIndex + 1].label}` : 'Urunu Kaydet'}
          </button>
        </div>
      </div>
    </>
  )
}

function ProductManagementDrawer({
  product,
  categories,
  knownColors,
  busyAction,
  onClose,
  onToggleActive,
  onDelete,
  onImagesChanged,
  onUpdated,
  onVariantsChanged,
}: {
  product: AdminProduct
  categories: AdminCategory[]
  knownColors: string[]
  busyAction: 'active' | 'delete' | null
  onClose: () => void
  onToggleActive: (product: AdminProduct) => Promise<void> | void
  onDelete: (product: AdminProduct) => Promise<void> | void
  onImagesChanged: () => Promise<void> | void
  onUpdated: () => Promise<void> | void
  onVariantsChanged: (productId: number, variants: AdminVariant[]) => void
}) {
  const variants = product.variants ?? []
  const price = product.basePrice ?? product.price ?? product.minPrice
  const qty = product.stockQuantity ?? product.totalStock ?? variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
  const category = product.categoryName ?? product.category?.name
  const [images, setImages] = useState<AdminProductImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(true)
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageAltText, setImageAltText] = useState(product.name)
  const [imageColorName, setImageColorName] = useState('')
  // Buyuk onizlemede acilacak gorselin sirasi (null = kapali).
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // Urun cekirdek alanlari (ad/kategori/tip/marka/aciklama/slug) duzenleme formu.
  const [detailForm, setDetailForm] = useState({
    name: '', categoryId: '', productType: '', brand: '', description: '', slug: '',
  })
  const [detailLoading, setDetailLoading] = useState(true)
  const [savingDetail, setSavingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailNotice, setDetailNotice] = useState<string | null>(null)

  // Varyantlar (pasifler dahil) urun detayindan bir kez yuklenir; duzenleme ProductVariantEditor'da,
  // yeni beden/renk AddVariantsPanel'de yapilir. Iki bilesen de degisikligi buraya bildirir.
  const [detailVariants, setDetailVariants] = useState<AdminVariant[]>([])
  const [variantsLoaded, setVariantsLoaded] = useState(false)
  const [unsavedVariantCount, setUnsavedVariantCount] = useState(0)
  const [pendingNewVariantCount, setPendingNewVariantCount] = useState(0)
  const detailVariantsRef = useRef(detailVariants)
  useEffect(() => {
    detailVariantsRef.current = detailVariants
  }, [detailVariants])

  function handleVariantsEdited(next: AdminVariant[]) {
    setDetailVariants(next)
    onVariantsChanged(product.id, next)
  }

  function handleVariantsAdded(created: AdminVariant[]) {
    const next = [...detailVariantsRef.current, ...created]
    setDetailVariants(next)
    onVariantsChanged(product.id, next)
  }

  // Katalog yenilendiginde `categories` dizisi yeni bir referans olur. Detayi buna baglamak her
  // kayitta paneli bastan yukluyordu (liste kayboluyor, yazilanlar siliniyordu); bu yuzden guncel
  // liste ref'ten okunur ve detay yalnizca urun degisince yuklenir.
  const categoriesRef = useRef(categories)
  useEffect(() => {
    categoriesRef.current = categories
  }, [categories])

  useEffect(() => {
    let active = true

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const res = await fetch(`/api/admin/products/${product.id}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(await readApiError(res, 'Urun bilgileri yuklenemedi.'))
        const detail = (await res.json()) as {
          name?: string; slug?: string; description?: string | null; brand?: string | null
          productType?: string | null; categoryName?: string
          variants?: AdminVariant[]
        }
        // Kategori id'sini mevcut kategori adindan cozumle (AdminCategory'de slug yok).
        const categoryId = categoriesRef.current.find((category) => category.name === detail.categoryName)?.id
        if (active) {
          setDetailForm({
            name: detail.name ?? '',
            categoryId: categoryId != null ? String(categoryId) : '',
            productType: detail.productType ?? '',
            brand: detail.brand ?? '',
            description: detail.description ?? '',
            slug: detail.slug ?? '',
          })
          setDetailVariants(detail.variants ?? [])
          setVariantsLoaded(true)
        }
      } catch (e) {
        if (active) setDetailError(e instanceof Error ? e.message : 'Urun bilgileri yuklenemedi.')
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    void loadDetail()
    return () => { active = false }
  }, [product.id])

  function handleClose() {
    const pending = [
      unsavedVariantCount > 0 ? `Varyantlarda kaydedilmemiş ${unsavedVariantCount} değişiklik` : null,
      pendingNewVariantCount > 0 ? `eklenmemiş ${pendingNewVariantCount} yeni varyant` : null,
    ].filter(Boolean).join(' ve ')
    if (pending && !window.confirm(
      `${pending.charAt(0).toLocaleUpperCase('tr-TR')}${pending.slice(1)} var. Kaydetmeden kapatılsın mı?`
    )) return
    onClose()
  }

  // Kaydedilmemis varyant degisikligi ya da eklenmemis yeni varyant varken sayfa yenilenir ya da
  // kapatilirsa tarayici uyarir.
  const hasPendingVariantWork = unsavedVariantCount > 0 || pendingNewVariantCount > 0
  useEffect(() => {
    if (!hasPendingVariantWork) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasPendingVariantWork])

  const selectedCategoryName = categories.find((item) => String(item.id) === detailForm.categoryId)?.name ?? category

  async function handleSaveDetail() {
    setDetailError(null)
    setDetailNotice(null)
    if (!detailForm.name.trim()) { setDetailError('Urun adi zorunludur.'); return }
    if (!detailForm.categoryId) { setDetailError('Kategori secimi zorunludur.'); return }
    if (!detailForm.slug.trim()) { setDetailError('Slug zorunludur.'); return }

    setSavingDetail(true)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: Number(detailForm.categoryId),
          name: detailForm.name.trim(),
          slug: detailForm.slug.trim(),
          description: detailForm.description.trim() || null,
          brand: detailForm.brand.trim() || null,
          productType: detailForm.productType.trim() || null,
          // Yayin durumu ayri toggle ile yonetilir; mevcut degeri koru.
          active: product.active,
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Urun guncellenemedi.'))
      setDetailNotice('Urun bilgileri kaydedildi.')
      await onUpdated()
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Urun guncellenemedi.')
    } finally {
      setSavingDetail(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadImages() {
      setImagesLoading(true)
      setImageError(null)
      try {
        const res = await fetch(`/api/admin/products/${product.id}/images`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(await readApiError(res, 'Urun gorselleri yuklenemedi.'))
        const payload = (await res.json()) as AdminProductImage[]
        if (active) setImages(payload)
      } catch (e) {
        if (active) setImageError(e instanceof Error ? e.message : 'Urun gorselleri yuklenemedi.')
      } finally {
        if (active) setImagesLoading(false)
      }
    }

    void loadImages()
    return () => { active = false }
  }, [product.id])

  async function refreshImages() {
    const res = await fetch(`/api/admin/products/${product.id}/images`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(await readApiError(res, 'Urun gorselleri yenilenemedi.'))
    setImages((await res.json()) as AdminProductImage[])
    await onImagesChanged()
  }

  async function handleImageUpload(file: File | null) {
    setImageError(null)
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/admin/uploads', {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error(await readApiError(uploadRes, 'Gorsel yuklenemedi.'))

      const uploadPayload = (await uploadRes.json()) as { imageUrl: string }
      const nextSortOrder = Math.max(0, ...images.map((image) => image.sortOrder)) + 1

      await postJson<AdminProductImage>(`/api/admin/products/${product.id}/images`, {
        imageUrl: uploadPayload.imageUrl,
        altText: imageAltText.trim() || product.name,
        colorName: imageColorName.trim() || null,
        sortOrder: nextSortOrder,
        primary: images.length === 0,
      }, 'Urun gorseli kaydedilemedi.')

      setImageAltText(product.name)
      setImageColorName('')
      await refreshImages()
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Gorsel yuklenemedi.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function updateImage(image: AdminProductImage, patch: Partial<AdminProductImage>) {
    setImageError(null)
    try {
      await fetch(`/api/admin/products/${product.id}/images/${image.id}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: (patch.imageUrl ?? image.imageUrl).trim(),
          altText: patch.altText ?? image.altText,
          colorName: patch.colorName ?? image.colorName,
          sortOrder: patch.sortOrder ?? image.sortOrder,
          primary: patch.primary ?? image.primary,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await readApiError(res, 'Gorsel guncellenemedi.'))
      })
      await refreshImages()
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Gorsel guncellenemedi.')
    }
  }

  async function deleteImage(image: AdminProductImage) {
    setImageError(null)
    try {
      const res = await fetch(`/api/admin/products/${product.id}/images/${image.id}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Gorsel silinemedi.'))
      await refreshImages()
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Gorsel silinemedi.')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#3D2B1F]">Urun Detayi</h2>
            <p className="mt-0.5 text-[12px] text-[#B5A090]">Yayin durumu ve silme islemleri</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#C4B5A5] hover:bg-[#FAF6F1] hover:text-[#5B4839]"
            aria-label="Paneli kapat"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-[14px] border border-[#ECE3D6] bg-[#FAF6F1] p-4">
            <div className="flex items-start gap-3">
              <ProductImage
                src={product.thumbnailUrl ?? product.imageUrl ?? product.primaryImageUrl ?? undefined}
                name={product.name}
                onOpen={images.length > 0 ? () => setPreviewIndex(Math.max(0, images.findIndex((image) => image.primary))) : undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[#3D2B1F]">{product.name}</p>
                <p className="mt-0.5 text-[12px] text-[#B5A090]">
                  {product.sku ?? `MM-${String(product.id).padStart(3, '0')}`}
                  {category ? ` - ${category}` : ''}
                  {product.productType ? ` - ${product.productType}` : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${product.active ? 'bg-[#EDF7F1] text-[#1A6640]' : 'bg-white text-[#B5A090]'}`}>
                {product.active ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[10px] bg-white px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-[#C4B5A5]">Fiyat</p>
                <p className="mt-1 text-[13px] font-bold text-[#3D2B1F]">{price !== undefined && price !== null ? formatPrice(price, product.currency ?? 'TRY') : '-'}</p>
              </div>
              <div className="rounded-[10px] bg-white px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-[#C4B5A5]">Stok</p>
                <p className="mt-1 text-[13px] font-bold text-[#3D2B1F]">{qty ?? '-'}</p>
              </div>
              <div className="rounded-[10px] bg-white px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-[#C4B5A5]">Varyant</p>
                <p className="mt-1 text-[13px] font-bold text-[#3D2B1F]">{product.variantCount ?? variants.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[14px] border border-[#ECE3D6] bg-white p-4">
            <h3 className="text-[13px] font-bold text-[#3D2B1F]">Urun bilgileri</h3>
            <p className="mt-1 text-[12.5px] leading-5 text-[#7A6656]">
              Ad, kategori, tip, marka, aciklama ve slug bilgilerini duzenleyin.
            </p>

            {detailLoading ? (
              <p className="mt-4 text-[12.5px] text-[#B5A090]">Yukleniyor...</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detailError ? (
                  <div className="rounded-[10px] bg-[#FEEAEA] px-3 py-2 text-[12px] text-[#8A1A1A]">{detailError}</div>
                ) : null}
                {detailNotice ? (
                  <div className="rounded-[10px] bg-[#EDF7F1] px-3 py-2 text-[12px] font-semibold text-[#1A6640]">{detailNotice}</div>
                ) : null}

                <div>
                  <label className="mb-1 block text-[12px] font-bold text-[#5B4839]">Urun Adi</label>
                  <input
                    type="text"
                    value={detailForm.name}
                    onChange={(event) => setDetailForm((form) => ({ ...form, name: event.target.value }))}
                    className="h-10 w-full rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-bold text-[#5B4839]">Kategori</label>
                  <select
                    value={detailForm.categoryId}
                    onChange={(event) => setDetailForm((form) => ({ ...form, categoryId: event.target.value }))}
                    className="h-10 w-full rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[12.5px] text-[#3D2B1F] outline-none focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                  >
                    <option value="">Kategori Sec</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}{category.active ? '' : ' (Pasif)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-bold text-[#5B4839]">Urun Tipi</label>
                    <input
                      type="text"
                      value={detailForm.productType}
                      onChange={(event) => setDetailForm((form) => ({ ...form, productType: event.target.value }))}
                      placeholder="Orn. Pijama"
                      className="h-10 w-full rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-bold text-[#5B4839]">Marka</label>
                    <input
                      type="text"
                      value={detailForm.brand}
                      onChange={(event) => setDetailForm((form) => ({ ...form, brand: event.target.value }))}
                      placeholder="Opsiyonel"
                      className="h-10 w-full rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-bold text-[#5B4839]">Slug</label>
                  <input
                    type="text"
                    value={detailForm.slug}
                    onChange={(event) => setDetailForm((form) => ({ ...form, slug: event.target.value }))}
                    className="h-10 w-full rounded-[9px] border border-[#ECE3D6] bg-white px-3 font-mono text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                  />
                  <p className="mt-1 text-[11px] text-[#C4B5A5]">URL'de kullanilir; degistirmek eski baglantilari bozabilir.</p>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-bold text-[#5B4839]">Aciklama</label>
                  <textarea
                    rows={3}
                    value={detailForm.description}
                    onChange={(event) => setDetailForm((form) => ({ ...form, description: event.target.value }))}
                    placeholder="Urun aciklamasi..."
                    className="w-full resize-none rounded-[9px] border border-[#ECE3D6] bg-white px-3 py-2 text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleSaveDetail()}
                  disabled={savingDetail}
                  className="w-full rounded-[10px] bg-[#C07B5A] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingDetail ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[14px] border border-[#ECE3D6] bg-white p-4">
            <h3 className="text-[13px] font-bold text-[#3D2B1F]">Varyantlar</h3>
            <p className="mt-1 text-[12.5px] leading-5 text-[#7A6656]">
              Fiyat ve stokları değiştirip tek seferde kaydedin. Birden fazla varyantı işaretleyerek toplu stok/fiyat
              verebilir veya silebilirsiniz; bedeni değiştirmek için beden başlığındaki listeyi kullanın.
            </p>

            {detailLoading ? (
              <p className="mt-3 text-[12.5px] text-[#B5A090]">Yukleniyor...</p>
            ) : (
              <>
                <ProductVariantEditor
                  key={product.id}
                  variants={detailVariants}
                  sizeOptions={sizeOptionsForCategory(selectedCategoryName).sizes}
                  onChange={handleVariantsEdited}
                  onDirtyChange={setUnsavedVariantCount}
                />
                {variantsLoaded ? (
                  <AddVariantsPanel
                    key={`add-${product.id}`}
                    productId={product.id}
                    variants={detailVariants}
                    sizeOptions={sizeOptionsForCategory(selectedCategoryName).sizes}
                    sizeListLabel={sizeOptionsForCategory(selectedCategoryName).label}
                    knownColors={knownColors}
                    onAdded={handleVariantsAdded}
                    onPendingChange={setPendingNewVariantCount}
                  />
                ) : null}
              </>
            )}
          </div>

          <div className="mt-4 rounded-[14px] border border-[#ECE3D6] bg-white p-4">
            <h3 className="text-[13px] font-bold text-[#3D2B1F]">Yayin durumu</h3>
            <p className="mt-1 text-[12.5px] leading-5 text-[#7A6656]">
              Pasife cekilen urun magazada gorunmez, ancak admin panelde kaydi, gorselleri ve varyantlari korunur.
            </p>
            <button
              type="button"
              onClick={() => void onToggleActive(product)}
              disabled={busyAction !== null}
              className="mt-4 w-full rounded-[10px] border border-[#D8CABB] bg-white px-4 py-2.5 text-[13px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'active' ? 'Guncelleniyor...' : product.active ? 'Pasife Cek' : 'Aktife Al'}
            </button>
          </div>

          <div className="mt-4 rounded-[14px] border border-[#ECE3D6] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-bold text-[#3D2B1F]">Urun gorselleri</h3>
                <p className="mt-1 text-[12px] text-[#B5A090]">JPG, PNG veya WEBP - max 5MB</p>
              </div>
              {images.length > 0 ? (
                <span className="rounded-full bg-[#FAF6F1] px-2.5 py-1 text-[11px] font-bold text-[#A89070]">
                  {images.length} gorsel
                </span>
              ) : null}
            </div>

            {imageError ? (
              <div className="mb-3 rounded-[10px] bg-[#FEEAEA] px-3 py-2 text-[12px] text-[#8A1A1A]">{imageError}</div>
            ) : null}

            <div className="rounded-[12px] border border-dashed border-[#D5C9BA] bg-[#FAF6F1] p-3">
              <div className="grid grid-cols-[1fr_112px] gap-2">
                <input
                  type="text"
                  value={imageAltText}
                  onChange={(event) => setImageAltText(event.target.value)}
                  placeholder="Alt metin"
                  className="h-10 rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                />
                <input
                  type="text"
                  value={imageColorName}
                  onChange={(event) => setImageColorName(event.target.value)}
                  placeholder="Renk"
                  className="h-10 rounded-[9px] border border-[#ECE3D6] bg-white px-3 text-[12.5px] text-[#3D2B1F] outline-none placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:ring-2 focus:ring-[#A89070]/20"
                />
              </div>

              <input
                id={`product-image-upload-${product.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor={`product-image-upload-${product.id}`}
                className={`mt-3 flex h-11 cursor-pointer items-center justify-center rounded-[10px] bg-[#C07B5A] text-[13px] font-bold text-white transition-colors hover:bg-[#A86849] ${uploadingImage ? 'pointer-events-none opacity-70' : ''}`}
              >
                {uploadingImage ? 'Gorsel yukleniyor...' : 'Gorsel Yukle'}
              </label>
            </div>

            <div className="mt-3 space-y-2">
              {imagesLoading ? (
                <div className="rounded-[10px] border border-[#F4EEE6] px-3 py-4 text-center text-[12.5px] text-[#B5A090]">
                  Gorseller yukleniyor...
                </div>
              ) : images.length === 0 ? (
                <div className="rounded-[10px] border border-[#F4EEE6] px-3 py-4 text-center text-[12.5px] text-[#B5A090]">
                  Bu urun icin henuz gorsel yok.
                </div>
              ) : (
                images.map((image, imageIndex) => (
                  <div key={image.id} className="rounded-[12px] border border-[#F4EEE6] p-2.5">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(imageIndex)}
                        title="Görseli büyüt"
                        aria-label={`${image.colorName || image.altText || product.name} görselini büyüt`}
                        className="shrink-0 cursor-zoom-in rounded-[10px] ring-[#C07B5A] transition-shadow hover:ring-2 focus-visible:outline-none focus-visible:ring-2"
                      >
                        <img src={image.imageUrl} alt={image.altText ?? product.name} className="h-20 w-20 rounded-[10px] object-cover" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-bold text-[#3D2B1F]">{image.altText || product.name}</p>
                            <p className="mt-0.5 text-[11.5px] text-[#B5A090]">
                              {image.colorName || 'Renk yok'} - Sira {image.sortOrder}
                            </p>
                          </div>
                          {image.primary ? (
                            <span className="shrink-0 rounded-full bg-[#EDF7F1] px-2 py-1 text-[10.5px] font-bold text-[#1A6640]">Ana</span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={image.primary}
                            onClick={() => void updateImage(image, { primary: true })}
                            className="rounded-[8px] border border-[#ECE3D6] px-2.5 py-1.5 text-[11.5px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Ana yap
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteImage(image)}
                            className="rounded-[8px] bg-[#FEEAEA] px-2.5 py-1.5 text-[11.5px] font-bold text-[#8A1A1A] transition-colors hover:bg-[#FAD4D4]"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 rounded-[14px] border border-[#F0B9B1] bg-[#FFF7F5] p-4">
            <h3 className="text-[13px] font-bold text-[#8A1A1A]">Kalici silme</h3>
            <p className="mt-1 text-[12.5px] leading-5 text-[#8A4A3E]">
              Bu islem urunu, urune ait varyantlari ve gorsel kayitlarini geri alinamayacak sekilde siler. Sepetlerdeki ilgili satirlar da temizlenir.
            </p>
            <button
              type="button"
              onClick={() => void onDelete(product)}
              disabled={busyAction !== null}
              className="mt-4 w-full rounded-[10px] bg-[#B73B35] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#9F2F2A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction === 'delete' ? 'Siliniyor...' : 'Kalici Olarak Sil'}
            </button>
          </div>
        </div>
      </div>

      {previewIndex !== null && images.length > 0 ? (
        <ImageLightbox
          images={images.map((image) => ({
            src: image.imageUrl,
            alt: image.altText ?? product.name,
            caption: image.colorName,
          }))}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      ) : null}
    </>
  )
}

// useSearchParams kullanan icerik, statik on-isleme icin Suspense siniri icinde olmalidir.
export default function AdminProductsPage() {
  return (
    <Suspense fallback={null}>
      <AdminProductsContent />
    </Suspense>
  )
}

function AdminProductsContent() {
  const router = useRouter()
  // Ust cubuktaki genel aramadan gelinir: ?q=... arama kutusunu doldurur, ?open=<id> o urunun
  // panelini acar.
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const urlOpenId = searchParams.get('open')
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(urlQuery)
  const [lightbox, setLightbox] = useState<LightboxImage[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  // Coklu secim filtreleri: bos dizi = filtre yok; doluysa secilenlerden herhangi birine uyanlar.
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [productTypeFilter, setProductTypeFilter] = useState<string[]>([])
  const [ageFilter, setAgeFilter] = useState<string[]>([])
  const [colorFilter, setColorFilter] = useState<string[]>([])
  const [brandFilter, setBrandFilter] = useState<string[]>([])
  const [variantCountFilter, setVariantCountFilter] = useState<VariantCountFilter>('all')
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [managingProduct, setManagingProduct] = useState<AdminProduct | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busyAction, setBusyAction] = useState<'active' | 'delete' | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/account/me', { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' } })
        if (res.status === 401) { router.replace('/account/login?next=/admin'); return }
        if (!res.ok) { setForbidden(true); return }
        const p = (await res.json()) as AdminProfile
        if (!p.roles?.includes('ADMIN')) { setForbidden(true); return }
        if (!active) return
        setProfile(p)

        const catalog = await loadAdminCatalog()
        if (!active) return
        setProducts(catalog.products)
        setCategories(catalog.categories)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Hata oluştu.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [router])

  // Genel aramadan gelen parametre bir kez uygulanip adres cubugundan silinir: ayni sonuca yeniden
  // tiklanabilsin, sayfa yenilenince ya da geri gelinince panel kendiliginden acilmasin.
  const dropSearchParam = useCallback((name: string) => {
    const params = new URLSearchParams(window.location.search)
    params.delete(name)
    const query = params.toString()
    router.replace(`${window.location.pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }, [router])

  useEffect(() => {
    if (!urlQuery) return
    setSearch(urlQuery)
    dropSearchParam('q')
  }, [urlQuery, dropSearchParam])

  const handledOpenId = useRef<string | null>(null)
  useEffect(() => {
    if (!urlOpenId || products.length === 0 || handledOpenId.current === urlOpenId) return
    handledOpenId.current = urlOpenId
    const target = products.find((product) => String(product.id) === urlOpenId)
    if (target) setManagingProduct(target)
    dropSearchParam('open')
  }, [urlOpenId, products, dropSearchParam])

  // Ayni urun genel aramadan yeniden secilebilsin diye, parametre silinince isaret de sifirlanir.
  useEffect(() => {
    if (!urlOpenId) handledOpenId.current = null
  }, [urlOpenId])

  // Listedeki kucuk gorsele tiklaninca: once eldeki ana gorsel buyuk acilir, ardindan urunun tum
  // gorselleri (renk adlariyla) yuklenip ayni onizlemede gezilebilir hale gelir.
  async function openProductImages(product: AdminProduct) {
    const primaryUrl = product.thumbnailUrl ?? product.imageUrl ?? product.primaryImageUrl
    if (!primaryUrl) return
    const initial = [{ src: primaryUrl, alt: product.name }]
    setLightbox(initial)
    try {
      const res = await fetch(`/api/admin/products/${product.id}/images`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return
      const images = (await res.json()) as AdminProductImage[]
      if (images.length <= 1) return
      const ordered = [...images].sort((a, b) => Number(b.primary) - Number(a.primary) || a.sortOrder - b.sortOrder)
      // Bu arada onizleme kapatildiysa ya da baska urune gecildiyse dokunma.
      setLightbox((current) => current === initial
        ? ordered.map((image) => ({ src: image.imageUrl, alt: image.altText ?? product.name, caption: image.colorName }))
        : current)
    } catch {
      // Tek gorselle devam edilir.
    }
  }

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  const filterOptions = useMemo(() => {
    const categories = new Set<string>()
    const productTypes = new Set<string>()
    const ages = new Set<string>()
    const colors = new Set<string>()
    const brands = new Set<string>()

    products.forEach((product) => {
      const category = product.categoryName ?? product.category?.name
      if (category) categories.add(category)
      if (product.productType) productTypes.add(product.productType)
      if (product.brand) brands.add(product.brand)
      product.variants?.forEach((variant) => {
        if (variant.sizeLabel) ages.add(variant.sizeLabel)
        if (variant.colorName) colors.add(variant.colorName)
      })
    })

    return {
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b, 'tr')),
      productTypes: Array.from(productTypes).sort((a, b) => a.localeCompare(b, 'tr')),
      ages: Array.from(ages).sort(compareSizeLabels),
      colors: Array.from(colors).sort((a, b) => a.localeCompare(b, 'tr')),
      brands: Array.from(brands).sort((a, b) => a.localeCompare(b, 'tr')),
    }
  }, [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const variants = p.variants ?? []
      const category = p.categoryName ?? p.category?.name ?? ''
      const productType = p.productType ?? ''
      const qty = p.stockQuantity ?? p.totalStock ?? variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
      const price = Number(p.basePrice ?? p.price ?? p.minPrice ?? variants[0]?.price ?? NaN)

      if (search.trim()) {
        // Buyuk/kucuk harf ve Turkce karakter duyarsiz ("garnili" = "GARNİLİ", "kiz" = "Kız").
        const q = foldForSearch(search.trim())
        const searchable = foldForSearch([
          p.name,
          p.sku,
          p.brand,
          category,
          productType,
          ...variants.flatMap((variant) => [variant.sku, variant.sizeLabel, variant.colorName]),
        ].filter(Boolean).join(' '))

        if (!searchable.includes(q)) return false
      }
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'inactive' && p.active) return false
      if (stockFilter === 'in_stock' && qty === 0) return false
      if (stockFilter === 'out_of_stock' && qty > 0) return false
      if (stockFilter === 'low_stock' && (qty === 0 || qty > 5)) return false
      if (categoryFilter.length > 0 && !categoryFilter.includes(category)) return false
      if (productTypeFilter.length > 0 && !productTypeFilter.includes(productType)) return false
      if (ageFilter.length > 0 && !variants.some((variant) => ageFilter.includes(variant.sizeLabel))) return false
      if (colorFilter.length > 0 && !variants.some((variant) => colorFilter.includes(variant.colorName))) return false
      if (brandFilter.length > 0 && !brandFilter.includes(p.brand ?? '')) return false
      if (variantCountFilter === 'single' && variants.length !== 1) return false
      if (variantCountFilter === 'multiple' && variants.length <= 1) return false
      if (minPriceFilter && !Number.isNaN(price) && price < Number(minPriceFilter)) return false
      if (maxPriceFilter && !Number.isNaN(price) && price > Number(maxPriceFilter)) return false
      return true
    })
  }, [
    products,
    search,
    statusFilter,
    stockFilter,
    categoryFilter,
    productTypeFilter,
    ageFilter,
    colorFilter,
    brandFilter,
    variantCountFilter,
    minPriceFilter,
    maxPriceFilter,
  ])

  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'all' ||
    stockFilter !== 'all' ||
    categoryFilter.length > 0 ||
    productTypeFilter.length > 0 ||
    ageFilter.length > 0 ||
    colorFilter.length > 0 ||
    brandFilter.length > 0 ||
    variantCountFilter !== 'all' ||
    minPriceFilter ||
    maxPriceFilter,
  )

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setStockFilter('all')
    setCategoryFilter([])
    setProductTypeFilter([])
    setAgeFilter([])
    setColorFilter([])
    setBrandFilter([])
    setVariantCountFilter('all')
    setMinPriceFilter('')
    setMaxPriceFilter('')
  }

  // Katalogdaki renk adlari (en cok kullanilan once, ayni rengin farkli yazimlarindan yaygin olani):
  // yeni urun eklerken oneri olarak sunulur, boylece "pembe"/"Pembe" gibi ikilikler olusmaz.
  const knownColors = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((product) => product.variants?.forEach((variant) => {
      if (variant.colorName) counts.set(variant.colorName, (counts.get(variant.colorName) ?? 0) + 1)
    }))
    const seen = new Set<string>()
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
      .map(([color]) => color)
      .filter((color) => {
        const key = foldForSearch(color)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [products])

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((p) => p.id)))
  }

  // Yalnizca en son baslatilan yenilemenin sonucu uygulanir; daha once baslayip gec donen bir
  // yanit (orn. gorsel yuklemesinden), arada kaydedilen varyant degisikliklerini eski haliyle ezmez.
  const catalogRequest = useRef(0)
  const refreshInFlight = useRef(false)

  async function refreshCatalog() {
    const request = ++catalogRequest.current
    refreshInFlight.current = true
    try {
      const catalog = await loadAdminCatalog()
      if (request !== catalogRequest.current) return
      setProducts(catalog.products)
      setCategories(catalog.categories)
      setSelected(new Set())
      // Acik paneldeki urun ozeti (ad, gorsel, fiyat) de yenilensin.
      setManagingProduct((current) => current
        ? catalog.products.find((product) => product.id === current.id) ?? current
        : current)
    } finally {
      if (request === catalogRequest.current) refreshInFlight.current = false
    }
  }

  // Varyant kaydi/silinmesi sonrasi tum katalogu yeniden cekmek yerine yalnizca o urunun satiri
  // guncellenir. Liste yalnizca aktif varyantlari tasir (backend ozeti ile ayni).
  function applyVariantChanges(productId: number, variants: AdminVariant[]) {
    // Suren bir yenileme bu kayittan once baslamissa sonucu eskidir: yerine yenisi baslatilir.
    if (refreshInFlight.current) void refreshCatalog().catch(() => undefined)
    const patch = (product: AdminProduct): AdminProduct => {
      if (product.id !== productId) return product
      const activeVariants = variants.filter((variant) => variant.active)
      const prices = activeVariants.map((variant) => Number(variant.price)).filter(Number.isFinite)
      return {
        ...product,
        variants: activeVariants,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      }
    }
    setProducts((current) => current.map(patch))
    setManagingProduct((current) => (current ? patch(current) : current))
  }

  async function handleToggleProductActive(product: AdminProduct) {
    const nextActive = !product.active

    setBusyAction('active')
    setError(null)
    try {
      const res = await fetch(`/api/admin/products/${product.id}/active`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: nextActive }),
      })

      if (!res.ok) throw new Error(await readApiError(res, 'Urun durumu guncellenemedi.'))

      await refreshCatalog()
      setStatusFilter((current) => (current === 'active' ? 'all' : current))
      setManagingProduct((current) => current ? { ...current, active: nextActive } : current)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun durumu guncellenirken hata olustu.')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDeleteProduct(product: AdminProduct) {
    const confirmed = window.confirm(
      `${product.name} kalici olarak silinecek.\n\nBu islem urunu, varyantlarini, gorsel kayitlarini ve sepetlerdeki ilgili satirlari geri alinamayacak sekilde siler. Devam etmek istiyor musunuz?`
    )
    if (!confirmed) return

    setBusyAction('delete')
    setError(null)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) throw new Error(await readApiError(res, 'Urun silinemedi.'))

      await refreshCatalog()
      setManagingProduct(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Urun silinirken hata olustu.')
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Ürünler yükleniyor...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (forbidden) {
    return (
      <AdminShell>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <h1 className="text-[20px] font-bold text-[#3D2B1F]">Yetkisiz Erişim</h1>
          <p className="mt-2 text-[13px] text-[#B5A090]">Bu alan yalnızca ADMIN rolüne sahip kullanıcılar içindir.</p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell displayName={displayName}>
      {lightbox ? <ImageLightbox images={lightbox} onClose={() => setLightbox(null)} /> : null}

      {showAddDrawer && (
        <WorkingAddProductDrawer
          categories={categories}
          knownColors={knownColors}
          onSaved={refreshCatalog}
          onClose={() => setShowAddDrawer(false)}
        />
      )}

      {managingProduct && (
        <ProductManagementDrawer
          product={managingProduct}
          categories={categories}
          knownColors={knownColors}
          busyAction={busyAction}
          onClose={() => setManagingProduct(null)}
          onToggleActive={handleToggleProductActive}
          onDelete={handleDeleteProduct}
          onImagesChanged={refreshCatalog}
          onUpdated={refreshCatalog}
          onVariantsChanged={applyVariantChanges}
        />
      )}

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[#3D2B1F]">Ürünler</h1>
          <p className="mt-0.5 text-[13px] text-[#B5A090]">Ürünlerinizi, varyantlarınızı ve stoğunuzu yönetin.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-2 rounded-[10px] bg-[#C07B5A] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849]"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            Ürün Ekle
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-[16px] border border-[#ECE3D6] bg-white p-4">
        <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-3 max-[820px]:grid-cols-2 max-[560px]:grid-cols-1">
          <div className="relative col-span-2 max-[820px]:col-span-2 max-[560px]:col-span-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" /></svg>
          <input
            type="search"
            placeholder="Ürün, SKU, marka, renk veya beden ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-[#ECE3D6] bg-white py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
        >
          <option value="all">Tüm Stok</option>
          <option value="in_stock">Stokta</option>
          <option value="low_stock">Az Stok</option>
          <option value="out_of_stock">Tükendi</option>
        </select>

          <MultiSelect allLabel="Tüm Kategoriler" options={filterOptions.categories} selected={categoryFilter} onChange={setCategoryFilter} />
          <MultiSelect allLabel="Tüm Ürün Tipleri" options={filterOptions.productTypes} selected={productTypeFilter} onChange={setProductTypeFilter} />
          <MultiSelect allLabel="Tüm Yaş/Beden" options={filterOptions.ages} selected={ageFilter} onChange={setAgeFilter} />
          <MultiSelect allLabel="Tüm Renkler" options={filterOptions.colors} selected={colorFilter} onChange={setColorFilter} />
          <MultiSelect allLabel="Tüm Markalar" options={filterOptions.brands} selected={brandFilter} onChange={setBrandFilter} />

          <select
            value={variantCountFilter}
            onChange={(e) => setVariantCountFilter(e.target.value as VariantCountFilter)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tüm Varyantlar</option>
            <option value="single">Tek Varyant</option>
            <option value="multiple">Çoklu Varyant</option>
          </select>

          <input
            type="number"
            min={0}
            placeholder="Min fiyat"
            value={minPriceFilter}
            onChange={(e) => setMinPriceFilter(e.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] placeholder:text-[#C4B5A5] focus:outline-none"
          />

          <input
            type="number"
            min={0}
            placeholder="Max fiyat"
            value={maxPriceFilter}
            onChange={(e) => setMaxPriceFilter(e.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] placeholder:text-[#C4B5A5] focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] text-[#B5A090]">
            {filtered.length} ürün gösteriliyor
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#C07B5A] transition-colors hover:bg-[#FAF6F1]"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[16px] border border-[#ECE3D6] bg-white lg:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#ECE3D6] bg-[#FAF6F1] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#C4B5A5]">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="rounded border-[#D5C9BA] accent-[#C07B5A]"
                />
              </th>
              <th className="px-4 py-3.5">Ürün</th>
              <th className="px-4 py-3.5">Kategori</th>
              <th className="px-4 py-3.5">Varyant</th>
              <th className="px-4 py-3.5">Fiyat</th>
              <th className="px-4 py-3.5">Stok</th>
              <th className="px-4 py-3.5">Durum</th>
              <th className="px-4 py-3.5">Güncelleme</th>
              <th className="px-4 py-3.5 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EEE6]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-14 text-center text-[13px] text-[#B5A090]">
                  {hasActiveFilters
                    ? 'Arama kriterlerine uygun ürün bulunamadı.'
                    : 'Henüz ürün eklenmemiş.'}
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const price = product.basePrice ?? product.price ?? product.minPrice
                const variantsList = product.variants ?? []
                const qty = product.stockQuantity ?? product.totalStock ?? variantsList.reduce((sum, variant) => sum + variant.stockQuantity, 0)
                const category = product.categoryName ?? product.category?.name
                const variants = product.variantCount ?? variantsList.length
                return (
                  <tr key={product.id} className="hover:bg-[#FAF6F1] transition-colors">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded border-[#D5C9BA] accent-[#C07B5A]"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.thumbnailUrl ?? product.imageUrl ?? product.primaryImageUrl ?? undefined}
                          name={product.name}
                          onOpen={() => void openProductImages(product)}
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => setManagingProduct(product)}
                            className="text-left font-semibold text-[#3D2B1F] hover:text-[#C07B5A] hover:underline"
                          >
                            {product.name}
                          </button>
                          <p className="text-[11.5px] text-[#C4B5A5]">
                            {product.sku ?? `MM-${String(product.id).padStart(3, '0')}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#6B5747]">
                      <div>{category ?? '-'}</div>
                      {product.productType ? (
                        <div className="mt-1 text-[11px] font-semibold text-[#B5A090]">{product.productType}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-[#6B5747]">{variants > 0 ? variants : '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-[#3D2B1F]">
                      {price !== undefined && price !== null ? formatPrice(price, product.currency ?? 'TRY') : '—'}
                    </td>
                    <td className="px-4 py-3.5"><StockBadge qty={qty} /></td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          product.active
                            ? 'bg-[#EDF7F1] text-[#1A6640]'
                            : 'bg-[#FAF6F1] text-[#B5A090]'
                        }`}
                      >
                        {product.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#C4B5A5]">{formatDate(product.updatedAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setManagingProduct(product)}
                          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#C4B5A5] hover:bg-[#F4EEE6] hover:text-[#5B4839] transition-colors"
                          aria-label={`${product.name} detayini ac`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.8 8s2.2-4 6.2-4 6.2 4 6.2 4-2.2 4-6.2 4-6.2-4-6.2-4z" /><circle cx="8" cy="8" r="1.8" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#D5C9BA] bg-white px-5 py-12 text-center">
            <p className="text-[13px] text-[#B5A090]">
              {hasActiveFilters
                ? 'Sonuç bulunamadı.'
                : 'Henüz ürün eklenmemiş.'}
            </p>
          </div>
        ) : (
          filtered.map((product) => {
            const price = product.basePrice ?? product.price ?? product.minPrice
            const variantsList = product.variants ?? []
            const qty = product.stockQuantity ?? product.totalStock ?? variantsList.reduce((sum, variant) => sum + variant.stockQuantity, 0)
            const category = product.categoryName ?? product.category?.name
            return (
              <div key={product.id} className="rounded-[14px] border border-[#ECE3D6] bg-white p-4">
                <div className="flex items-start gap-3">
                  <ProductImage
                    src={product.thumbnailUrl ?? product.imageUrl ?? product.primaryImageUrl ?? undefined}
                    name={product.name}
                    onOpen={() => void openProductImages(product)}
                  />
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setManagingProduct(product)}
                      className="text-left font-semibold text-[#3D2B1F] hover:text-[#C07B5A] hover:underline"
                    >
                      {product.name}
                    </button>
                    <p className="text-[11.5px] text-[#C4B5A5]">
                      {product.sku ?? `MM-${String(product.id).padStart(3, '0')}`}
                      {category ? ` · ${category}` : ''}
                      {product.productType ? ` · ${product.productType}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${product.active ? 'bg-[#EDF7F1] text-[#1A6640]' : 'bg-[#FAF6F1] text-[#B5A090]'}`}>
                    {product.active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-[#3D2B1F]">
                      {price !== undefined && price !== null ? formatPrice(price, product.currency ?? 'TRY') : '—'}
                    </span>
                    <StockBadge qty={qty} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setManagingProduct(product)}
                      className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#C4B5A5] hover:bg-[#F4EEE6] hover:text-[#5B4839]"
                      aria-label={`${product.name} detayini ac`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.8 8s2.2-4 6.2-4 6.2 4 6.2 4-2.2 4-6.2 4-6.2-4-6.2-4z" /><circle cx="8" cy="8" r="1.8" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </AdminShell>
  )
}
