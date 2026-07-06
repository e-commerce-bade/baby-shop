'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface AdminUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  active: boolean
  roles: string[]
  createdAt: string | null
}

interface StoreSettings {
  freeShippingThreshold: number | string
  shippingFee: number | string
  minimumOrderAmount: number | string
  cardEnabled: boolean
  codEnabled: boolean
  codSurcharge: number | string
  bankTransferEnabled: boolean
  bankTransferIban: string | null
  bankTransferAccountName: string | null
  bankTransferBankName: string | null
  shippingCarriers: string[]
  currency: string
  updatedAt: string | null
}

interface StoreForm {
  freeShippingThreshold: string
  shippingFee: string
  minimumOrderAmount: string
  cardEnabled: boolean
  codEnabled: boolean
  codSurcharge: string
  bankTransferEnabled: boolean
  bankTransferIban: string
  bankTransferAccountName: string
  bankTransferBankName: string
  shippingCarriers: string
}

const emptyStoreForm: StoreForm = {
  freeShippingThreshold: '',
  shippingFee: '',
  minimumOrderAmount: '',
  cardEnabled: true,
  codEnabled: true,
  codSurcharge: '',
  bankTransferEnabled: true,
  bankTransferIban: '',
  bankTransferAccountName: '',
  bankTransferBankName: '',
  shippingCarriers: '',
}

const emptyForm = { email: '', password: '', firstName: '', lastName: '', phoneNumber: '' }

async function readApiError(res: Response, fallback: string) {
  try {
    const payload = await res.json()
    if (typeof payload?.message === 'string') return payload.message
  } catch {
    // ignore
  }
  return fallback
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createOk, setCreateOk] = useState(false)

  const [storeForm, setStoreForm] = useState<StoreForm>(emptyStoreForm)
  const [shippingSaving, setShippingSaving] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [shippingOk, setShippingOk] = useState(false)

  function applyStoreSettings(data: StoreSettings) {
    setStoreForm({
      freeShippingThreshold: String(data.freeShippingThreshold ?? ''),
      shippingFee: String(data.shippingFee ?? ''),
      minimumOrderAmount: String(data.minimumOrderAmount ?? ''),
      cardEnabled: data.cardEnabled,
      codEnabled: data.codEnabled,
      codSurcharge: String(data.codSurcharge ?? ''),
      bankTransferEnabled: data.bankTransferEnabled,
      bankTransferIban: data.bankTransferIban ?? '',
      bankTransferAccountName: data.bankTransferAccountName ?? '',
      bankTransferBankName: data.bankTransferBankName ?? '',
      shippingCarriers: (data.shippingCarriers ?? []).join('\n'),
    })
  }

  async function loadShippingSettings() {
    const res = await fetch('/api/admin/store-settings', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(await readApiError(res, 'Mağaza ayarları yüklenemedi.'))
    applyStoreSettings((await res.json()) as StoreSettings)
  }

  async function saveShippingSettings(e: React.FormEvent) {
    e.preventDefault()
    setShippingError(null)
    setShippingOk(false)

    const threshold = Number(storeForm.freeShippingThreshold.replace(',', '.'))
    const fee = Number(storeForm.shippingFee.replace(',', '.'))
    const minOrder = Number(storeForm.minimumOrderAmount.replace(',', '.'))
    const cod = Number((storeForm.codSurcharge || '0').replace(',', '.'))
    if (!Number.isFinite(threshold) || threshold < 0) {
      setShippingError('Ücretsiz kargo eşiği sıfır veya daha büyük bir sayı olmalı.')
      return
    }
    if (!Number.isFinite(fee) || fee < 0) {
      setShippingError('Kargo ücreti sıfır veya daha büyük bir sayı olmalı.')
      return
    }
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      setShippingError('Minimum sepet tutarı sıfır veya daha büyük bir sayı olmalı.')
      return
    }
    if (!Number.isFinite(cod) || cod < 0) {
      setShippingError('Kapıda ödeme farkı sıfır veya daha büyük bir sayı olmalı.')
      return
    }

    setShippingSaving(true)
    try {
      const res = await fetch('/api/admin/store-settings', {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeShippingThreshold: threshold,
          shippingFee: fee,
          minimumOrderAmount: minOrder,
          cardEnabled: storeForm.cardEnabled,
          codEnabled: storeForm.codEnabled,
          codSurcharge: cod,
          bankTransferEnabled: storeForm.bankTransferEnabled,
          bankTransferIban: storeForm.bankTransferIban.trim() || null,
          bankTransferAccountName: storeForm.bankTransferAccountName.trim() || null,
          bankTransferBankName: storeForm.bankTransferBankName.trim() || null,
          shippingCarriers: storeForm.shippingCarriers,
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Mağaza ayarları kaydedilemedi.'))
      applyStoreSettings((await res.json()) as StoreSettings)
      setShippingOk(true)
    } catch (err) {
      setShippingError(err instanceof Error ? err.message : 'Mağaza ayarları kaydedilirken hata oluştu.')
    } finally {
      setShippingSaving(false)
    }
  }

  function updateStoreForm<K extends keyof StoreForm>(key: K, value: StoreForm[K]) {
    setStoreForm((f) => ({ ...f, [key]: value }))
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(await readApiError(res, 'Yöneticiler yüklenemedi.'))
    setUsers((await res.json()) as AdminUser[])
  }

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const profileRes = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })
        if (profileRes.status === 401) {
          router.replace('/account/login?next=/admin/settings')
          return
        }
        if (!profileRes.ok) {
          setForbidden(true)
          return
        }
        const nextProfile = (await profileRes.json()) as AdminProfile
        if (!nextProfile.roles?.includes('ADMIN')) {
          setForbidden(true)
          return
        }
        if (!active) return
        setProfile(nextProfile)
        await Promise.all([loadUsers(), loadShippingSettings()])
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Ayarlar yüklenirken hata oluştu.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [router])

  async function toggleActive(user: AdminUser) {
    setSavingId(user.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/active`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Durum güncellenemedi.'))
      const updated = (await res.json()) as AdminUser
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Durum güncellenirken hata oluştu.')
    } finally {
      setSavingId(null)
    }
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setCreateOk(false)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
          phoneNumber: form.phoneNumber.trim() || null,
          active: true,
          roles: ['ADMIN'],
        }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Yönetici oluşturulamadı.'))
      setForm(emptyForm)
      setCreateOk(true)
      await loadUsers()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Yönetici oluşturulurken hata oluştu.')
    } finally {
      setCreating(false)
    }
  }

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  if (loading) {
    return (
      <AdminShell displayName={displayName}>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Ayarlar yükleniyor...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (forbidden) {
    return (
      <AdminShell displayName={displayName}>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <h1 className="text-[20px] font-bold text-[#3D2B1F]">Yetkisiz Erişim</h1>
          <p className="mt-2 text-[13px] text-[#B5A090]">Bu alan yalnızca ADMIN rolüne sahip kullanıcılar içindir.</p>
        </div>
      </AdminShell>
    )
  }

  const inputCls =
    'w-full rounded-[10px] border border-[#ECE3D6] bg-[#FAF6F1] px-3.5 py-2.5 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#A89070]/20'

  return (
    <AdminShell displayName={displayName}>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold text-[#3D2B1F]">Ayarlar</h1>
        <p className="mt-0.5 text-[13px] text-[#B5A090]">
          Yönetici hesaplarını ve mağaza ayarlarını yönetin.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      ) : null}

      {/* Mağaza / Ödeme ayarları */}
      <div className="mb-4 rounded-[16px] border border-[#ECE3D6] bg-white p-5">
        <h2 className="text-[15px] font-bold text-[#3D2B1F]">Mağaza & Ödeme Ayarları</h2>
        <p className="mt-0.5 mb-4 text-[12px] text-[#B5A090]">
          Kargo, minimum sepet tutarı ve ödeme seçenekleri. Sepet ve siparişlerde bu değerler kullanılır.
        </p>

        <form onSubmit={(e) => void saveShippingSettings(e)} className="space-y-5">
          {/* Kargo + minimum tutar */}
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Ücretsiz Kargo Eşiği (₺)</span>
              <input
                type="number" min={0} step="0.01" required
                value={storeForm.freeShippingThreshold}
                onChange={(e) => updateStoreForm('freeShippingThreshold', e.target.value)}
                className={`${inputCls} w-40`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Kargo Ücreti (₺)</span>
              <input
                type="number" min={0} step="0.01" required
                value={storeForm.shippingFee}
                onChange={(e) => updateStoreForm('shippingFee', e.target.value)}
                className={`${inputCls} w-40`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Minimum Sepet Tutarı (₺)</span>
              <input
                type="number" min={0} step="0.01" required
                value={storeForm.minimumOrderAmount}
                onChange={(e) => updateStoreForm('minimumOrderAmount', e.target.value)}
                className={`${inputCls} w-40`}
              />
            </label>
          </div>
          <p className="text-[11.5px] text-[#B5A090]">
            Minimum sepet tutarının altındaki siparişler engellenir. 0 girilirse limit uygulanmaz.
          </p>

          {/* Ödeme yöntemleri */}
          <div className="border-t border-[#F4EEE6] pt-4">
            <h3 className="mb-2.5 text-[13px] font-bold text-[#3D2B1F]">Ödeme Yöntemleri</h3>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-[13px] text-[#5B4839]">
                <input
                  type="checkbox"
                  checked={storeForm.cardEnabled}
                  onChange={(e) => updateStoreForm('cardEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-[#ECE3D6] accent-[#C07B5A]"
                />
                Kredi / Banka Kartı (iyzico)
              </label>
              <label className="flex flex-wrap items-center gap-2.5 text-[13px] text-[#5B4839]">
                <input
                  type="checkbox"
                  checked={storeForm.codEnabled}
                  onChange={(e) => updateStoreForm('codEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-[#ECE3D6] accent-[#C07B5A]"
                />
                Kapıda Nakit Ödeme — ek ücret (₺):
                <input
                  type="number" min={0} step="0.01"
                  value={storeForm.codSurcharge}
                  onChange={(e) => updateStoreForm('codSurcharge', e.target.value)}
                  className={`${inputCls} w-24`}
                />
              </label>
              <label className="flex items-center gap-2.5 text-[13px] text-[#5B4839]">
                <input
                  type="checkbox"
                  checked={storeForm.bankTransferEnabled}
                  onChange={(e) => updateStoreForm('bankTransferEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-[#ECE3D6] accent-[#C07B5A]"
                />
                EFT / Havale
              </label>
            </div>

            {/* Banka bilgileri */}
            <div className="mt-3 grid grid-cols-3 gap-3 max-[720px]:grid-cols-1">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Banka Adı</span>
                <input
                  value={storeForm.bankTransferBankName}
                  onChange={(e) => updateStoreForm('bankTransferBankName', e.target.value)}
                  placeholder="Akbank"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">Hesap Sahibi</span>
                <input
                  value={storeForm.bankTransferAccountName}
                  onChange={(e) => updateStoreForm('bankTransferAccountName', e.target.value)}
                  placeholder="Ad Soyad"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold text-[#5B4839]">IBAN</span>
                <input
                  value={storeForm.bankTransferIban}
                  onChange={(e) => updateStoreForm('bankTransferIban', e.target.value)}
                  placeholder="TR.. .. .. .."
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          {/* Kargo firmaları */}
          <div className="border-t border-[#F4EEE6] pt-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold text-[#3D2B1F]">Anlaşmalı Kargo Firmaları</span>
              <span className="mb-2 block text-[11.5px] text-[#B5A090]">
                Her satıra bir firma yazın. Müşteri ödeme adımında bunlardan birini seçer.
              </span>
              <textarea
                rows={3}
                value={storeForm.shippingCarriers}
                onChange={(e) => updateStoreForm('shippingCarriers', e.target.value)}
                placeholder={'PTT Kargo\nYurtiçi Kargo'}
                className={inputCls}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={shippingSaving}
            className="rounded-[10px] bg-[#5B4839] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#4A3A2E] disabled:opacity-60"
          >
            {shippingSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>

        {shippingError ? (
          <p className="mt-3 rounded-[8px] bg-[#FEEAEA] px-3 py-2 text-[12px] text-[#8A1A1A]">{shippingError}</p>
        ) : null}
        {shippingOk ? (
          <p className="mt-3 rounded-[8px] bg-[#EDF7F1] px-3 py-2 text-[12px] text-[#1A6640]">Mağaza ayarları güncellendi.</p>
        ) : null}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-[860px]:grid-cols-1">
        {/* Admin users list */}
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white">
          <div className="border-b border-[#ECE3D6] px-5 py-4">
            <h2 className="text-[15px] font-bold text-[#3D2B1F]">Yönetici Kullanıcılar</h2>
            <p className="mt-0.5 text-[12px] text-[#B5A090]">Panele erişimi olan hesaplar.</p>
          </div>
          {users.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-[#B5A090]">Yönetici bulunamadı.</p>
          ) : (
            users.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
              const isSelf = profile?.email?.toLowerCase() === u.email.toLowerCase()
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 border-b border-[#F4EEE6] px-5 py-3.5 last:border-b-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4EEE6] text-[12px] font-bold text-[#5B4839]">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-[#3D2B1F]">
                      {name}
                      {isSelf ? <span className="ml-2 text-[11px] font-normal text-[#B5A090]">(siz)</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-[#B5A090]">{u.email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      u.active ? 'bg-[#EDF7F1] text-[#1A6640]' : 'bg-[#FEEAEA] text-[#8A1A1A]'
                    }`}
                  >
                    {u.active ? 'Aktif' : 'Pasif'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleActive(u)}
                    disabled={savingId !== null || isSelf}
                    title={isSelf ? 'Kendi hesabınızı pasifleştiremezsiniz' : ''}
                    className="shrink-0 rounded-[8px] border border-[#ECE3D6] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#5B4839] transition-colors hover:bg-[#FAF6F1] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {u.active ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Create admin form */}
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-5">
          <h2 className="text-[15px] font-bold text-[#3D2B1F]">Yeni Yönetici Ekle</h2>
          <p className="mt-0.5 mb-4 text-[12px] text-[#B5A090]">ADMIN rolüyle yeni hesap oluşturun.</p>

          <form onSubmit={(e) => void createAdmin(e)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 max-[380px]:grid-cols-1">
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Ad"
                className={inputCls}
              />
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Soyad"
                className={inputCls}
              />
            </div>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="E-posta"
              className={inputCls}
            />
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder="Telefon (opsiyonel)"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Şifre (en az 8 karakter)"
              className={inputCls}
            />

            {createError ? (
              <p className="rounded-[8px] bg-[#FEEAEA] px-3 py-2 text-[12px] text-[#8A1A1A]">{createError}</p>
            ) : null}
            {createOk ? (
              <p className="rounded-[8px] bg-[#EDF7F1] px-3 py-2 text-[12px] text-[#1A6640]">Yönetici oluşturuldu.</p>
            ) : null}

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-[10px] bg-[#5B4839] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#4A3A2E] disabled:opacity-60"
            >
              {creating ? 'Oluşturuluyor...' : 'Yönetici Oluştur'}
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  )
}
