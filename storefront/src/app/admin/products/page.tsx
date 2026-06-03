'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { formatPrice } from '@/lib/utils'
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

interface AdminCategory {
  id: number
  name: string
  active: boolean
}

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
type StatusFilter = 'all' | 'active' | 'inactive'
type VariantCountFilter = 'all' | 'single' | 'multiple'
type ProductDrawerTab = 'details' | 'variant' | 'media'

interface ProductVariantDraft {
  key: string
  sku: string
  sizeLabel: string
  colorName: string
  stockQuantity: string
  price: string
  active: boolean
}

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

const BABY_SIZE_PRESETS = ['0-3 Ay', '3-6 Ay', '6-9 Ay', '9-12 Ay', '12-18 Ay', '18-24 Ay', '24-36 Ay']
const KIDS_SIZE_PRESETS = ['2 Yas', '3 Yas', '4 Yas', '5 Yas', '6 Yas', '7 Yas', '8 Yas', '9 Yas', '10 Yas', '11-12 Yas', '13-14 Yas']

function getSizePresetForCategory(categoryName?: string) {
  const normalized = toSlug(categoryName ?? '')
  if (
    normalized.includes('bebek') ||
    normalized.includes('baby') ||
    normalized.includes('newborn') ||
    normalized.includes('yenidogan')
  ) {
    return {
      label: 'Bebek ay araligi',
      sizes: BABY_SIZE_PRESETS,
    }
  }
  return {
    label: 'Cocuk yas araligi',
    sizes: KIDS_SIZE_PRESETS,
  }
}

function makeVariantKey(sizeLabel: string, colorName: string) {
  return `${toSlug(sizeLabel)}-${toSlug(colorName)}`
}

function generateSku(productName: string, colorName: string, sizeLabel: string, index: number) {
  const productPart = toSlug(productName)
    .split('-')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 5) || 'URN'
  const colorPart = toSlug(colorName).replace(/-/g, '').slice(0, 6) || 'renk'
  const sizePart = toSlug(sizeLabel).replace(/-/g, '').slice(0, 6) || 'beden'

  return `${productPart}-${colorPart}-${sizePart}-${index + 1}`.toUpperCase()
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

function ProductImage({ src, name }: { src?: string; name: string }) {
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
  onSaved,
  onClose,
}: {
  categories: AdminCategory[]
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
  const [currency, setCurrency] = useState('TRY')
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [colorInput, setColorInput] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [baseStock, setBaseStock] = useState('0')
  const [variants, setVariants] = useState<ProductVariantDraft[]>([])
  const [colorImages, setColorImages] = useState<Record<string, ColorImageDraft>>({})
  const [saving, setSaving] = useState(false)
  const [uploadingColor, setUploadingColor] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const currentTabIndex = drawerTabs.findIndex((item) => item.id === tab)
  const selectedCategory = categories.find((category) => String(category.id) === categoryId)
  const sizePreset = getSizePresetForCategory(selectedCategory?.name)

  function handleNameChange(value: string) {
    setName(value)
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value)
    setSelectedSizes([])
    setVariants([])
  }

  function toggleSize(sizeLabel: string) {
    setSelectedSizes((prev) => (
      prev.includes(sizeLabel)
        ? prev.filter((item) => item !== sizeLabel)
        : [...prev, sizeLabel]
    ))
    setVariants([])
  }

  function addColor() {
    const color = colorInput.trim()
    if (!color) return
    setColors((prev) => (
      prev.some((item) => item.toLocaleLowerCase('tr-TR') === color.toLocaleLowerCase('tr-TR'))
        ? prev
        : [...prev, color]
    ))
    setColorInput('')
    setVariants([])
  }

  function removeColor(color: string) {
    setColors((prev) => prev.filter((item) => item !== color))
    setColorImages((prev) => {
      const next = { ...prev }
      delete next[color]
      return next
    })
    setVariants([])
  }

  function updateColorImage(color: string, patch: Partial<ColorImageDraft>) {
    setColorImages((prev) => ({
      ...prev,
      [color]: {
        imageUrl: prev[color]?.imageUrl ?? '',
        fileName: prev[color]?.fileName ?? '',
        altText: prev[color]?.altText ?? `${name.trim() || 'Urun'} ${color}`.trim(),
        ...patch,
      },
    }))
  }

  function updateVariant(key: string, patch: Partial<ProductVariantDraft>) {
    setVariants((prev) => prev.map((variant) => (
      variant.key === key ? { ...variant, ...patch } : variant
    )))
  }

  function removeVariant(key: string) {
    setVariants((prev) => prev.filter((variant) => variant.key !== key))
  }

  function generateVariants() {
    setFormError(null)
    const trimmedName = name.trim()
    const normalizedPrice = Number(basePrice)
    const normalizedStock = Number(baseStock)

    if (!trimmedName) {
      setTab('details')
      setFormError('Once urun adi girin.')
      return
    }
    if (selectedSizes.length === 0) {
      setFormError('En az bir beden/yas secin.')
      return
    }
    if (colors.length === 0) {
      setFormError('En az bir renk ekleyin.')
      return
    }
    if (!basePrice.trim() || !Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      setFormError('Gecerli bir ortak satis fiyati girin.')
      return
    }
    if (!Number.isInteger(normalizedStock) || normalizedStock < 0) {
      setFormError('Baslangic stogu 0 veya daha buyuk tam sayi olmali.')
      return
    }

    const nextVariants = selectedSizes.flatMap((sizeLabel) => (
      colors.map((colorName) => {
        const key = makeVariantKey(sizeLabel, colorName)
        const existing = variants.find((variant) => variant.key === key)
        return existing ?? {
          key,
          sku: generateSku(trimmedName, colorName, sizeLabel, variants.length),
          sizeLabel,
          colorName,
          stockQuantity: baseStock,
          price: basePrice,
          active: true,
        }
      })
    ))

    setVariants(nextVariants)
  }

  async function handleColorImageUpload(color: string, file: File | null) {
    setFormError(null)
    if (!file) return

    setUploadingColor(color)
    try {
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
      updateColorImage(color, {
        imageUrl: payload.imageUrl,
        fileName: file.name,
        altText: colorImages[color]?.altText?.trim() || `${name.trim() || file.name.replace(/\.[^.]+$/, '')} ${color}`.trim(),
      })
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
    if (variants.length === 0) {
      setTab('variant')
      setFormError('En az bir varyant olusturun.')
      return
    }
    if (currency.trim().length !== 3) {
      setTab('variant')
      setFormError('Para birimi 3 harf olmali. Ornek: TRY')
      return
    }

    const invalidVariant = variants.find((variant) => {
      const normalizedPrice = Number(variant.price)
      const normalizedStock = Number(variant.stockQuantity)
      return (
        !variant.sizeLabel.trim() ||
        !variant.colorName.trim() ||
        !variant.price.trim() ||
        !Number.isFinite(normalizedPrice) ||
        normalizedPrice < 0 ||
        !Number.isInteger(normalizedStock) ||
        normalizedStock < 0
      )
    })

    if (invalidVariant) {
      setTab('variant')
      setFormError('Tum varyantlarda beden/yas, renk, fiyat ve stok bilgisi gecerli olmali.')
      return
    }

    setSaving(true)
    try {
      const created = await postJson<{ id: number }>('/api/admin/products', {
        categoryId: numericCategoryId,
        name: trimmedName,
        slug: generatedSlug,
        description: description.trim() || null,
        brand: brand.trim() || null,
        productType: productType.trim(),
        active,
      }, 'Urun olusturulamadi.')

      for (const variant of variants) {
        await postJson(`/api/admin/products/${created.id}/variants`, {
          sku: variant.sku.trim() || null,
          sizeLabel: variant.sizeLabel.trim(),
          colorName: variant.colorName.trim(),
          stockQuantity: Number(variant.stockQuantity),
          price: Number(variant.price),
          currency: currency.trim().toUpperCase(),
          active: variant.active,
        }, 'Urun varyanti olusturulamadi.')
      }

      const uploadedImages = colors
        .map((color) => ({ color, image: colorImages[color] }))
        .filter((item): item is { color: string; image: ColorImageDraft } => Boolean(item.image?.imageUrl.trim()))

      for (const [index, item] of uploadedImages.entries()) {
        await postJson(`/api/admin/products/${created.id}/images`, {
          imageUrl: item.image.imageUrl.trim(),
          altText: item.image.altText.trim() || `${trimmedName} ${item.color}`,
          colorName: item.color,
          sortOrder: index + 1,
          primary: index === 0,
        }, 'Urun gorseli kaydedilemedi.')
      }

      await onSaved()
      onClose()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Urun kaydedilirken hata olustu.')
    } finally {
      setSaving(false)
    }
  }

  function handlePrimaryAction() {
    if (currentTabIndex < drawerTabs.length - 1) {
      setTab(drawerTabs[currentTabIndex + 1].id)
      return
    }
    void handleSave()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <h2 className="text-[16px] font-bold text-[#3D2B1F]">Yeni Urun Ekle</h2>
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
            <div className="space-y-4">
              <div className="rounded-[12px] border border-[#ECE3D6] bg-[#FAF6F1] px-4 py-3">
                <p className="text-[12px] font-bold text-[#5B4839]">{sizePreset.label}</p>
                <p className="mt-1 text-[11.5px] text-[#B5A090]">
                  Kategoriye gore uygun beden listesi otomatik secilir.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-bold text-[#5B4839]">
                  Beden / Yas Secenekleri <span className="text-[#C07B5A]">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizePreset.sizes.map((size) => {
                    const selected = selectedSizes.includes(size)
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
                          selected
                            ? 'bg-[#C07B5A] text-white'
                            : 'bg-white text-[#5B4839] ring-1 ring-[#ECE3D6] hover:bg-[#FFFDFC]'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                  Renkler <span className="text-[#C07B5A]">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Krem"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addColor()
                      }
                    }}
                    className="min-w-0 flex-1 rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addColor}
                    className="rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[12px] font-bold text-[#C07B5A] hover:bg-[#FFFDFC]"
                  >
                    Ekle
                  </button>
                </div>
                {colors.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => removeColor(color)}
                        className="rounded-full bg-[#F4EEE6] px-3 py-1.5 text-[12px] font-bold text-[#5B4839] hover:bg-[#ECE3D6]"
                      >
                        {color} x
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
                    Ortak Fiyat <span className="text-[#C07B5A]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Baslangic Stok</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={baseStock}
                    onChange={(e) => setBaseStock(e.target.value)}
                    className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Para Birimi</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={generateVariants}
                className="w-full rounded-[10px] bg-[#C07B5A] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849]"
              >
                Varyantlari Olustur
              </button>

              {variants.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-[#5B4839]">{variants.length} varyant</p>
                    <p className="text-[11.5px] text-[#B5A090]">Stok, fiyat ve SKU duzenlenebilir.</p>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {variants.map((variant) => (
                      <div key={variant.key} className="rounded-[10px] border border-[#ECE3D6] bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[12.5px] font-bold text-[#3D2B1F]">{variant.colorName} / {variant.sizeLabel}</p>
                            <p className="text-[11px] text-[#B5A090]">{variant.sku}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariant(variant.key)}
                            className="rounded-full px-2 py-1 text-[12px] font-bold text-[#C07B5A] hover:bg-[#FAF6F1]"
                          >
                            Sil
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => updateVariant(variant.key, { sku: e.target.value })}
                            className="rounded-[8px] border border-[#ECE3D6] px-2.5 py-2 text-[12px] text-[#3D2B1F] focus:border-[#A89070] focus:outline-none"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price}
                            onChange={(e) => updateVariant(variant.key, { price: e.target.value })}
                            className="rounded-[8px] border border-[#ECE3D6] px-2.5 py-2 text-[12px] text-[#3D2B1F] focus:border-[#A89070] focus:outline-none"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={variant.stockQuantity}
                            onChange={(e) => updateVariant(variant.key, { stockQuantity: e.target.value })}
                            className="rounded-[8px] border border-[#ECE3D6] px-2.5 py-2 text-[12px] text-[#3D2B1F] focus:border-[#A89070] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
                      Her renk icin ayri gorsel yukleyin. Ilk yuklenen renk ana gorsel olur.
                    </p>
                  </div>

                  {colors.map((color) => {
                    const image = colorImages[color]
                    const inputId = `product-image-upload-${toSlug(color)}`
                    return (
                      <div key={color} className="rounded-[12px] border border-[#ECE3D6] bg-white p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-bold text-[#3D2B1F]">{color}</p>
                            <p className="text-[11.5px] text-[#B5A090]">
                              {uploadingColor === color ? 'Gorsel yukleniyor...' : image?.fileName || 'JPG, PNG veya WEBP - max 5MB'}
                            </p>
                          </div>
                          <input
                            id={inputId}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => void handleColorImageUpload(color, e.target.files?.[0] ?? null)}
                          />
                          <label
                            htmlFor={inputId}
                            className="shrink-0 cursor-pointer rounded-[10px] bg-[#FAF6F1] px-3 py-2 text-[12px] font-bold text-[#C07B5A] ring-1 ring-[#ECE3D6] hover:bg-[#FFFDFC]"
                          >
                            {image?.imageUrl ? 'Degistir' : 'Sec'}
                          </label>
                        </div>

                        {image?.imageUrl ? (
                          <img
                            src={image.imageUrl}
                            alt={image.altText || `${name} ${color}`}
                            className="mb-3 h-32 w-full rounded-[10px] object-cover"
                          />
                        ) : (
                          <div className="mb-3 flex h-24 items-center justify-center rounded-[10px] border-2 border-dashed border-[#ECE3D6] bg-[#FAF6F1]">
                            <svg className="h-5 w-5 text-[#C07B5A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 16l4-4 3 3 4-5 3 3" /><rect x="2" y="4" width="16" height="12" rx="2" /></svg>
                          </div>
                        )}

                        <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Alt Metin</label>
                        <input
                          type="text"
                          value={image?.altText ?? `${name.trim() || 'Urun'} ${color}`.trim()}
                          onChange={(e) => updateColorImage(color, { altText: e.target.value })}
                          className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none"
                        />
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
            onClick={onClose}
            className="flex-1 rounded-[10px] border border-[#ECE3D6] py-2.5 text-[13px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1]"
          >
            Iptal
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={saving || Boolean(uploadingColor)}
            className="flex-1 rounded-[10px] bg-[#C07B5A] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Kaydediliyor...' : currentTabIndex < drawerTabs.length - 1 ? `Sonraki: ${drawerTabs[currentTabIndex + 1].label}` : 'Urunu Kaydet'}
          </button>
        </div>
      </div>
    </>
  )
}

function ProductManagementDrawer({
  product,
  busyAction,
  onClose,
  onToggleActive,
  onDelete,
}: {
  product: AdminProduct
  busyAction: 'active' | 'delete' | null
  onClose: () => void
  onToggleActive: (product: AdminProduct) => Promise<void> | void
  onDelete: (product: AdminProduct) => Promise<void> | void
}) {
  const variants = product.variants ?? []
  const price = product.basePrice ?? product.price ?? product.minPrice
  const qty = product.stockQuantity ?? product.totalStock ?? variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
  const category = product.categoryName ?? product.category?.name

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#3D2B1F]">Urun Detayi</h2>
            <p className="mt-0.5 text-[12px] text-[#B5A090]">Yayin durumu ve silme islemleri</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
              <ProductImage src={product.thumbnailUrl ?? product.imageUrl ?? product.primaryImageUrl ?? undefined} name={product.name} />
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
    </>
  )
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [productTypeFilter, setProductTypeFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const [colorFilter, setColorFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
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
      ages: Array.from(ages).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })),
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

      if (search) {
        const q = search.toLowerCase()
        const searchable = [
          p.name,
          p.sku,
          p.brand,
          category,
          productType,
          ...variants.flatMap((variant) => [variant.sku, variant.sizeLabel, variant.colorName]),
        ].filter(Boolean).join(' ').toLowerCase()

        if (!searchable.includes(q)) return false
      }
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'inactive' && p.active) return false
      if (stockFilter === 'in_stock' && qty === 0) return false
      if (stockFilter === 'out_of_stock' && qty > 0) return false
      if (stockFilter === 'low_stock' && (qty === 0 || qty > 5)) return false
      if (categoryFilter !== 'all' && category !== categoryFilter) return false
      if (productTypeFilter !== 'all' && productType !== productTypeFilter) return false
      if (ageFilter !== 'all' && !variants.some((variant) => variant.sizeLabel === ageFilter)) return false
      if (colorFilter !== 'all' && !variants.some((variant) => variant.colorName === colorFilter)) return false
      if (brandFilter !== 'all' && (p.brand ?? '') !== brandFilter) return false
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

  async function refreshCatalog() {
    const catalog = await loadAdminCatalog()
    setProducts(catalog.products)
    setCategories(catalog.categories)
    setSelected(new Set())
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
        body: JSON.stringify(nextActive),
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
      {showAddDrawer && (
        <WorkingAddProductDrawer
          categories={categories}
          onSaved={refreshCatalog}
          onClose={() => setShowAddDrawer(false)}
        />
      )}

      {managingProduct && (
        <ProductManagementDrawer
          product={managingProduct}
          busyAction={busyAction}
          onClose={() => setManagingProduct(null)}
          onToggleActive={handleToggleProductActive}
          onDelete={handleDeleteProduct}
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
            className="hidden rounded-[10px] border border-[#ECE3D6] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5B4839] hover:bg-[#FAF6F1] transition-colors sm:block"
          >
            İçe Aktar
          </button>
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

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            {filterOptions.categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={productTypeFilter}
            onChange={(e) => setProductTypeFilter(e.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tum Urun Tipleri</option>
            {filterOptions.productTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tüm Yaş/Beden</option>
            {filterOptions.ages.map((age) => (
              <option key={age} value={age}>{age}</option>
            ))}
          </select>

          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tüm Renkler</option>
            {filterOptions.colors.map((color) => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[13px] text-[#5B4839] focus:outline-none"
          >
            <option value="all">Tüm Markalar</option>
            {filterOptions.brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

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

          {(search || statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || productTypeFilter !== 'all' || ageFilter !== 'all' || colorFilter !== 'all' || brandFilter !== 'all' || variantCountFilter !== 'all' || minPriceFilter || maxPriceFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setStockFilter('all')
                setCategoryFilter('all')
                setProductTypeFilter('all')
                setAgeFilter('all')
                setColorFilter('all')
                setBrandFilter('all')
                setVariantCountFilter('all')
                setMinPriceFilter('')
                setMaxPriceFilter('')
              }}
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
                  {search || statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || productTypeFilter !== 'all' || ageFilter !== 'all' || colorFilter !== 'all' || brandFilter !== 'all' || variantCountFilter !== 'all' || minPriceFilter || maxPriceFilter
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
                        <ProductImage src={product.thumbnailUrl ?? product.imageUrl ?? product.primaryImageUrl ?? undefined} name={product.name} />
                        <div>
                          <p className="font-semibold text-[#3D2B1F]">{product.name}</p>
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
              {search || statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || productTypeFilter !== 'all' || ageFilter !== 'all' || colorFilter !== 'all' || brandFilter !== 'all' || variantCountFilter !== 'all' || minPriceFilter || maxPriceFilter
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
                  <ProductImage src={product.thumbnailUrl ?? product.imageUrl ?? product.primaryImageUrl ?? undefined} name={product.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#3D2B1F]">{product.name}</p>
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
