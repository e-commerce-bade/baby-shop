'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface AdminCategory {
  id: number
  parentId?: number | null
  name: string
  active: boolean
  slug?: string
  productCount?: number
  sortOrder?: number
  updatedAt?: string
  description?: string
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function deleteErrorMessage(backendMessage?: string) {
  if (backendMessage?.includes('products')) {
    return 'Bu kategoriye bağlı ürünler olduğu için silinemez. Önce ürünleri başka bir kategoriye taşıyın.'
  }
  if (backendMessage?.includes('sub-categories')) {
    return 'Bu kategorinin alt kategorileri olduğu için silinemez. Önce alt kategorileri silin.'
  }
  return 'Kategori silinemedi.'
}

function AddCategoryDrawer({
  onClose,
  onSaved,
  sortOrder,
}: {
  onClose: () => void
  onSaved: () => void
  sortOrder: number
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toSlug(val: string) {
    return val
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleNameChange(val: string) {
    setName(val)
    setSlug(toSlug(val))
  }

  async function handleSave() {
    if (!name.trim()) { setError('Kategori adı zorunludur.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug || toSlug(name),
          description: description.trim() || null,
          active,
          sortOrder,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Kategori kaydedilemedi.')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <h2 className="text-[16px] font-bold text-[#3D2B1F]">Yeni Kategori</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#C4B5A5] hover:bg-[#FAF6F1] hover:text-[#5B4839]"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
              Kategori Adı <span className="text-[#C07B5A]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: Bebek Kız"
              className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="bebek-kiz"
              className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] font-mono text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
            <p className="mt-1 text-[11.5px] text-[#C4B5A5]">URL'de kullanılacak kısa ad.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Açıklama</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kategori açıklaması..."
              className="w-full resize-none rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <div className="flex items-center justify-between rounded-[10px] border border-[#ECE3D6] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[#3D2B1F]">Aktif</p>
              <p className="text-[11.5px] text-[#C4B5A5]">Storefront'ta görüntülensin</p>
            </div>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${active ? 'bg-[#C07B5A]' : 'bg-[#D5C9BA]'}`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
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
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 rounded-[10px] bg-[#C07B5A] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kategori Ekle'}
          </button>
        </div>
      </div>
    </>
  )
}

function EditCategoryDrawer({
  category,
  onClose,
  onSaved,
}: {
  category: AdminCategory
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(category.name)
  const [slug, setSlug] = useState(category.slug ?? '')
  const [description, setDescription] = useState(category.description ?? '')
  const [active, setActive] = useState(category.active)
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder ?? 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const nextSortOrder = Number.parseInt(sortOrder, 10)

    if (!name.trim()) { setError('Kategori adı zorunludur.'); return }
    if (!slug.trim()) { setError('Slug zorunludur.'); return }
    if (Number.isNaN(nextSortOrder) || nextSortOrder < 0) {
      setError('Sıralama değeri sıfır veya daha büyük bir sayı olmalı.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: category.parentId ?? null,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          active,
          sortOrder: nextSortOrder,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Kategori güncellenemedi.')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-[#ECE3D6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ECE3D6] px-6 py-4">
          <h2 className="text-[16px] font-bold text-[#3D2B1F]">Kategoriyi Düzenle</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#C4B5A5] hover:bg-[#FAF6F1] hover:text-[#5B4839] disabled:opacity-50"
            title="Kapat"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">
              Kategori Adı <span className="text-[#C07B5A]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] font-mono text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Açıklama</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Sıralama</label>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
            />
          </div>

          <div className="flex items-center justify-between rounded-[10px] border border-[#ECE3D6] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[#3D2B1F]">Aktif</p>
              <p className="text-[11.5px] text-[#C4B5A5]">Storefront'ta görüntülensin</p>
            </div>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${active ? 'bg-[#C07B5A]' : 'bg-[#D5C9BA]'}`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#ECE3D6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-[10px] border border-[#ECE3D6] py-2.5 text-[13px] font-bold text-[#5B4839] hover:bg-[#FAF6F1] transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 rounded-[10px] bg-[#C07B5A] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849] disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </>
  )
}

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-[16px] border border-[#ECE3D6] bg-white p-6 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEEAEA]">
          <svg className="h-6 w-6 text-[#8A1A1A]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4h16M7 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M8 9v5M12 9v5M4 4l1 12.5a1 1 0 001 .9h8a1 1 0 001-.9L16 4" /></svg>
        </div>
        <h3 className="text-[16px] font-bold text-[#3D2B1F]">Kategoriyi Sil</h3>
        <p className="mt-2 text-[13px] text-[#B5A090]">
          <span className="font-semibold text-[#5B4839]">{name}</span> kategorisi silinecek. Bu işlem geri alınamaz.
        </p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-[10px] border border-[#ECE3D6] py-2.5 text-[13px] font-bold text-[#5B4839] hover:bg-[#FAF6F1]">
            İptal
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-[10px] bg-[#8A1A1A] py-2.5 text-[13px] font-bold text-white hover:bg-[#6A1414]">
            Sil
          </button>
        </div>
      </div>
    </>
  )
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null)

  async function loadCategories() {
    const res = await fetch('/api/admin/categories', { cache: 'no-store', headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('Kategoriler yüklenemedi.')
    setCategories((await res.json()) as AdminCategory[])
  }

  useEffect(() => {
    let active = true

    async function init() {
      setLoading(true)
      try {
        const res = await fetch('/api/account/me', { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' } })
        if (res.status === 401) { router.replace('/account/login?next=/admin'); return }
        if (!res.ok) { setForbidden(true); return }
        const p = (await res.json()) as AdminProfile
        if (!p.roles?.includes('ADMIN')) { setForbidden(true); return }
        if (!active) return
        setProfile(p)
        await loadCategories()
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Hata oluştu.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void init()
    return () => { active = false }
  }, [router])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  const filtered = useMemo(
    () => categories.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  )
  const nextSortOrder = useMemo(
    () => Math.max(0, ...categories.map((category) => category.sortOrder ?? 0)) + 1,
    [categories]
  )

  async function handleDelete(cat: AdminCategory) {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(deleteErrorMessage(body.message))
      }
      await loadCategories()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silme işlemi başarısız.')
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleToggleActive(cat: AdminCategory) {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !cat.active }),
      })
      if (!res.ok) return
      await loadCategories()
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Kategoriler yükleniyor...</p>
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
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell displayName={displayName}>
      {showAdd && (
        <AddCategoryDrawer
          onClose={() => setShowAdd(false)}
          onSaved={() => void loadCategories()}
          sortOrder={nextSortOrder}
        />
      )}
      {editTarget && (
        <EditCategoryDrawer
          category={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => void loadCategories()}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => void handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[#3D2B1F]">Kategoriler</h1>
          <p className="mt-0.5 text-[13px] text-[#B5A090]">
            {categories.length} kategori · {categories.filter((c) => c.active).length} aktif
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-[10px] bg-[#C07B5A] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#A86849]"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          Kategori Ekle
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="9" r="5.5" /><path d="M17 17l-3.5-3.5" /></svg>
          <input
            type="search"
            placeholder="Kategori ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-[#ECE3D6] bg-white py-2 pl-9 pr-4 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
          />
        </div>
        <span className="text-[12.5px] text-[#B5A090]">{filtered.length} sonuç</span>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[16px] border border-[#ECE3D6] bg-white">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EEE6]">
              <svg className="h-6 w-6 text-[#C4B5A5]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 7a1.5 1.5 0 011.5-1.5h4l2 2h7A1.5 1.5 0 0118 9v6.5A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5V7z" /></svg>
            </div>
            <p className="text-[14px] font-semibold text-[#5B4839]">
              {search ? 'Arama sonucu bulunamadı.' : 'Henüz kategori eklenmemiş.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="mt-3 text-[13px] font-semibold text-[#C07B5A] hover:underline"
              >
                İlk kategoriyi ekle
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#ECE3D6] bg-[#FAF6F1] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#C4B5A5]">
                <th className="px-5 py-3.5">Kategori Adı</th>
                <th className="hidden px-5 py-3.5 sm:table-cell">Slug</th>
                <th className="hidden px-5 py-3.5 md:table-cell">Ürün Sayısı</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="hidden px-5 py-3.5 lg:table-cell">Güncelleme</th>
                <th className="px-5 py-3.5 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EEE6]">
              {filtered.map((cat) => (
                <tr key={cat.id} className="hover:bg-[#FAF6F1] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4EEE6]">
                        <svg className="h-4.5 w-4.5 text-[#C07B5A]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 5.5a1 1 0 011-1h3l1.5 1.5h5a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V5.5z" /></svg>
                      </div>
                      <span className="font-semibold text-[#3D2B1F]">{cat.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <span className="font-mono text-[12px] text-[#B5A090]">{cat.slug ?? '—'}</span>
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell text-[#6B5747]">
                    {cat.productCount !== undefined ? `${cat.productCount} ürün` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(cat)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        cat.active
                          ? 'bg-[#EDF7F1] text-[#1A6640] hover:bg-[#D8F0E4]'
                          : 'bg-[#FAF6F1] text-[#B5A090] hover:bg-[#F4EEE6]'
                      }`}
                    >
                      {cat.active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="hidden px-5 py-4 text-[#C4B5A5] lg:table-cell">{formatDate(cat.updatedAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTarget(cat)}
                        className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#C4B5A5] hover:bg-[#F4EEE6] hover:text-[#5B4839] transition-colors"
                        title="Düzenle"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8H3v-3L11 2z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#C4B5A5] hover:bg-[#FEEAEA] hover:text-[#8A1A1A] transition-colors"
                        title="Sil"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l.8 9.6A1 1 0 004.8 14.7h6.4a1 1 0 001-.9L13 4" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  )
}
