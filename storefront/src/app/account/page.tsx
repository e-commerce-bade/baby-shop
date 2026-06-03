'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatPrice } from '@/lib/utils'
import { useFavoriteStore } from '@/store/favoriteStore'

interface CustomerProfile {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  active: boolean
}

interface CustomerAddress {
  id: number
  label: string | null
  recipientFirstName: string
  recipientLastName: string
  phoneNumber: string | null
  line1: string
  line2: string | null
  district: string
  city: string
  postalCode: string | null
  country: string
  defaultAddress: boolean
}

interface OrderItem {
  id: number
  productName: string
  variantLabel: string
  quantity: number
  lineTotal: number | string
  currency: string
}

interface Order {
  id: number
  orderNumber: string
  status: string
  totalAmount: number | string
  currency: string
  createdAt: string | null
  items: OrderItem[]
}

interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

const addressSchema = z.object({
  label: z.string().trim().max(80, 'Adres başlığı en fazla 80 karakter olabilir.').optional(),
  recipientFirstName: z.string().trim().min(1, 'Ad zorunludur.').max(100),
  recipientLastName: z.string().trim().min(1, 'Soyad zorunludur.').max(100),
  phoneNumber: z.string().trim().max(30, 'Telefon en fazla 30 karakter olabilir.').optional(),
  line1: z.string().trim().min(1, 'Adres zorunludur.').max(255),
  line2: z.string().trim().max(255).optional(),
  district: z.string().trim().min(1, 'İlçe zorunludur.').max(120),
  city: z.string().trim().min(1, 'Şehir zorunludur.').max(120),
  postalCode: z.string().trim().max(20, 'Posta kodu en fazla 20 karakter olabilir.').optional(),
  country: z.string().trim().min(1, 'Ülke zorunludur.').max(100),
  defaultAddress: z.boolean(),
})

type AddressFormValues = z.infer<typeof addressSchema>

const emptyAddressValues: AddressFormValues = {
  label: 'Ev',
  recipientFirstName: '',
  recipientLastName: '',
  phoneNumber: '',
  line1: '',
  line2: '',
  district: '',
  city: '',
  postalCode: '',
  country: 'Türkiye',
  defaultAddress: false,
}

const inputCls =
  'mt-1.5 w-full rounded-[12px] border border-line bg-cream-3 px-4 py-3 text-[14px] text-brown outline-none transition-colors placeholder:text-muted focus:border-rose-soft focus:bg-white'

function optionalValue(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function addressToFormValues(address: CustomerAddress): AddressFormValues {
  return {
    label: address.label ?? '',
    recipientFirstName: address.recipientFirstName,
    recipientLastName: address.recipientLastName,
    phoneNumber: address.phoneNumber ?? '',
    line1: address.line1,
    line2: address.line2 ?? '',
    district: address.district,
    city: address.city,
    postalCode: address.postalCode ?? '',
    country: address.country,
    defaultAddress: address.defaultAddress,
  }
}

export default function AccountPage() {
  const router = useRouter()
  const clearFavorites = useFavoriteStore((state) => state.clearFavorites)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<PageResponse<Order> | null>(null)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressNotice, setAddressNotice] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null)
  const [addressActionId, setAddressActionId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddressValues,
  })

  useEffect(() => {
    let active = true

    async function loadAccount() {
      setLoading(true)
      setError(null)

      try {
        const profileResponse = await fetch('/api/account/me', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        if (profileResponse.status === 401) {
          router.replace('/account/login?next=/account')
          return
        }

        if (!profileResponse.ok) {
          throw new Error('Hesap bilgileri alınamadı.')
        }

        const [ordersResponse, addressesResponse] = await Promise.all([
          fetch('/api/account/orders?page=0&size=10', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/account/addresses', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
        ])

        if (!ordersResponse.ok) {
          throw new Error('Siparişler alınamadı.')
        }

        if (!addressesResponse.ok) {
          throw new Error('Adresler alınamadı.')
        }

        if (!active) return
        setProfile(await profileResponse.json())
        setOrders(await ordersResponse.json())
        setAddresses(await addressesResponse.json())
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Hesap bilgileri alınamadı.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadAccount()

    return () => {
      active = false
    }
  }, [router])

  const displayName = useMemo(
    () => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email,
    [profile],
  )

  const editingAddress = addresses.find((address) => address.id === editingAddressId) ?? null

  async function refreshAddresses() {
    const response = await fetch('/api/account/addresses', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error('Adresler yenilenemedi.')
    }

    setAddresses(await response.json())
  }

  function openNewAddressForm() {
    setAddressError(null)
    setAddressNotice(null)
    setEditingAddressId(null)
    reset({
      ...emptyAddressValues,
      recipientFirstName: profile?.firstName ?? '',
      recipientLastName: profile?.lastName ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
      defaultAddress: addresses.length === 0,
    })
    setFormOpen(true)
  }

  function openEditAddressForm(address: CustomerAddress) {
    setAddressError(null)
    setAddressNotice(null)
    setEditingAddressId(address.id)
    reset(addressToFormValues(address))
    setFormOpen(true)
  }

  function closeAddressForm() {
    setFormOpen(false)
    setEditingAddressId(null)
    reset(emptyAddressValues)
  }

  async function onAddressSubmit(values: AddressFormValues) {
    setAddressError(null)
    setAddressNotice(null)

    const payload = {
      label: optionalValue(values.label),
      recipientFirstName: values.recipientFirstName,
      recipientLastName: values.recipientLastName,
      phoneNumber: optionalValue(values.phoneNumber),
      line1: values.line1,
      line2: optionalValue(values.line2),
      district: values.district,
      city: values.city,
      postalCode: optionalValue(values.postalCode),
      country: values.country,
      defaultAddress: values.defaultAddress,
    }

    try {
      const response = await fetch(
        editingAddressId ? `/api/account/addresses/${editingAddressId}` : '/api/account/addresses',
        {
          method: editingAddressId ? 'PUT' : 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      const responsePayload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(responsePayload?.message ?? 'Adres kaydedilemedi.')
      }

      await refreshAddresses()
      setAddressNotice(editingAddressId ? 'Adres güncellendi.' : 'Adres eklendi.')
      closeAddressForm()
    } catch (submitError) {
      setAddressError(submitError instanceof Error ? submitError.message : 'Adres kaydedilemedi.')
    }
  }

  async function handleSetDefault(addressId: number) {
    setAddressActionId(addressId)
    setAddressError(null)
    setAddressNotice(null)

    try {
      const response = await fetch(`/api/account/addresses/${addressId}/default`, {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Varsayılan adres güncellenemedi.')
      }

      await refreshAddresses()
      setAddressNotice('Varsayılan teslimat adresi güncellendi.')
    } catch (defaultError) {
      setAddressError(defaultError instanceof Error ? defaultError.message : 'Varsayılan adres güncellenemedi.')
    } finally {
      setAddressActionId(null)
    }
  }

  async function handleDeleteAddress(addressId: number) {
    const confirmed = window.confirm('Bu adresi silmek istediğinize emin misiniz?')
    if (!confirmed) return

    setAddressActionId(addressId)
    setAddressError(null)
    setAddressNotice(null)

    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Adres silinemedi.')
      }

      await refreshAddresses()
      if (editingAddressId === addressId) {
        closeAddressForm()
      }
      setAddressNotice('Adres silindi.')
    } catch (deleteError) {
      setAddressError(deleteError instanceof Error ? deleteError.message : 'Adres silinemedi.')
    } finally {
      setAddressActionId(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearFavorites()
    router.replace('/account/login')
    router.refresh()
  }

  if (loading) {
    return <div className="min-h-[60vh] bg-cream-3" />
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-cream-3 px-5 text-center">
        <h1 className="font-serif text-[28px] font-semibold text-brown">Hesap yüklenemedi</h1>
        <p className="max-w-[420px] text-[14px] text-muted">{error}</p>
        <Link
          href="/account/login"
          className="rounded-[14px] bg-rose px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-dk"
        >
          Tekrar Giriş Yap
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] bg-cream-3 px-[38px] py-10 max-[680px]:px-5">
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-7 flex items-start justify-between gap-4 max-[680px]:flex-col">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-rose">
              Hesabım
            </p>
            <h1 className="mt-2 font-serif text-[34px] font-semibold text-brown">
              {displayName}
            </h1>
            <p className="mt-1 text-[13.5px] text-muted">
              Siparişlerinizi, adreslerinizi ve hesap bilgilerinizi buradan takip edebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-[12px] border border-line bg-white px-5 py-2.5 text-[13px] font-bold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk"
          >
            Çıkış Yap
          </button>
        </header>

        <div className="grid grid-cols-[300px_1fr] gap-7 max-[980px]:grid-cols-1">
          <aside className="space-y-5">
            <section className="rounded-panel border border-line bg-white p-6">
              <h2 className="font-serif text-[18px] font-semibold text-brown">Profil</h2>
              <div className="mt-5 space-y-3 text-[13px]">
                <InfoRow label="E-posta" value={profile?.email} />
                <InfoRow label="Telefon" value={profile?.phoneNumber || 'Eklenmedi'} />
                <InfoRow label="Durum" value={profile?.active ? 'Aktif' : 'Pasif'} />
              </div>
            </section>

            <section className="rounded-panel border border-line bg-white p-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-rose">
                Teslimat
              </p>
              <h2 className="mt-2 font-serif text-[18px] font-semibold text-brown">
                Varsayılan Adres
              </h2>
              {addresses.find((address) => address.defaultAddress) ? (
                <AddressMini address={addresses.find((address) => address.defaultAddress)!} />
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  Henüz varsayılan teslimat adresiniz yok. İlk eklediğiniz adres otomatik varsayılan olur.
                </p>
              )}
            </section>
          </aside>

          <div className="space-y-7">
            <section className="rounded-panel border border-line bg-white p-6">
              <div className="mb-5 flex items-start justify-between gap-3 max-[680px]:flex-col">
                <div>
                  <h2 className="font-serif text-[22px] font-semibold text-brown">
                    Adreslerim
                  </h2>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Checkout sırasında kullanacağınız teslimat adreslerini yönetin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewAddressForm}
                  className="rounded-[12px] bg-rose px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-rose-dk"
                >
                  Yeni Adres Ekle
                </button>
              </div>

              {addressError ? (
                <p className="mb-4 rounded-[12px] border border-rose-soft bg-rose-tint px-4 py-3 text-[13px] font-semibold text-rose-dk">
                  {addressError}
                </p>
              ) : null}

              {addressNotice ? (
                <p className="mb-4 rounded-[12px] border border-[#D9E8D0] bg-[#F0F6EA] px-4 py-3 text-[13px] font-semibold text-sage">
                  {addressNotice}
                </p>
              ) : null}

              {formOpen ? (
                <AddressForm
                  editing={Boolean(editingAddress)}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  register={register}
                  onCancel={closeAddressForm}
                  onSubmit={(event) => void handleSubmit(onAddressSubmit)(event)}
                />
              ) : null}

              {addresses.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-line bg-cream-3 px-6 py-8 text-center">
                  <p className="font-serif text-[18px] font-semibold text-brown">
                    Henüz adres eklenmedi
                  </p>
                  <p className="mt-2 text-[13px] text-muted">
                    Bir adres kaydedin, sonraki siparişlerinizde checkout daha hızlı tamamlansın.
                  </p>
                  <button
                    type="button"
                    onClick={openNewAddressForm}
                    className="mt-5 inline-flex rounded-[14px] bg-rose px-6 py-3 text-[13px] font-bold text-white transition-colors hover:bg-rose-dk"
                  >
                    İlk Adresi Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      busy={addressActionId === address.id}
                      onEdit={() => openEditAddressForm(address)}
                      onDelete={() => void handleDeleteAddress(address.id)}
                      onSetDefault={() => void handleSetDefault(address.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-panel border border-line bg-white p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-[20px] font-semibold text-brown">
                    Siparişlerim
                  </h2>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Toplam {orders?.totalElements ?? 0} sipariş
                  </p>
                </div>
              </div>

              {!orders || orders.content.length === 0 ? (
                <div className="rounded-[16px] border border-line bg-cream-3 px-6 py-8 text-center">
                  <p className="font-serif text-[18px] font-semibold text-brown">
                    Henüz siparişiniz yok
                  </p>
                  <p className="mt-2 text-[13px] text-muted">
                    Giriş yaptıktan sonra oluşturduğunuz siparişler burada görünecek.
                  </p>
                  <Link
                    href="/products"
                    className="mt-5 inline-flex rounded-[14px] bg-rose px-6 py-3 text-[13px] font-bold text-white transition-colors hover:bg-rose-dk"
                  >
                    Alışverişe Başla
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {orders.content.map((order) => (
                    <article key={order.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4 max-[680px]:flex-col">
                        <div>
                          <p className="font-serif text-[17px] font-semibold text-brown">
                            {order.orderNumber}
                          </p>
                          <p className="mt-1 text-[12px] text-muted">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : 'Tarih yok'}
                          </p>
                        </div>
                        <div className="text-right max-[680px]:text-left">
                          <span className="rounded-full bg-cream-2 px-3 py-1 text-[11px] font-extrabold text-brown-2">
                            {order.status}
                          </span>
                          <p className="mt-2 font-serif text-[18px] font-semibold text-rose-dk">
                            {formatPrice(order.totalAmount, order.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {order.items.map((item) => (
                          <p key={item.id} className="text-[12.5px] text-muted">
                            {item.quantity} x {item.productName} ({item.variantLabel})
                          </p>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-brown">{value || '-'}</p>
    </div>
  )
}

function AddressMini({ address }: { address: CustomerAddress }) {
  return (
    <div className="mt-4 rounded-[14px] border border-line bg-cream-3 p-4 text-[13px] text-brown-2">
      <p className="font-bold text-brown">{address.label || 'Adres'}</p>
      <p className="mt-1">
        {address.recipientFirstName} {address.recipientLastName}
      </p>
      <p className="mt-1 text-muted">{address.line1}</p>
      <p className="text-muted">
        {[address.district, address.city, address.country].filter(Boolean).join(', ')}
      </p>
    </div>
  )
}

function AddressCard({
  address,
  busy,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: CustomerAddress
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  return (
    <article className="flex min-h-[230px] flex-col rounded-[16px] border border-line bg-cream-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-[18px] font-semibold text-brown">
              {address.label || 'Adres'}
            </h3>
            {address.defaultAddress ? (
              <span className="rounded-full bg-rose-tint px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-rose-dk">
                Varsayılan
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[13px] font-semibold text-brown-2">
            {address.recipientFirstName} {address.recipientLastName}
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-1 text-[13px] leading-relaxed text-muted">
        <p className="text-brown-2">{address.line1}</p>
        {address.line2 ? <p>{address.line2}</p> : null}
        <p>{[address.district, address.city].filter(Boolean).join(', ')}</p>
        <p>{[address.postalCode, address.country].filter(Boolean).join(' / ')}</p>
        {address.phoneNumber ? <p>Tel: {address.phoneNumber}</p> : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {!address.defaultAddress ? (
          <button
            type="button"
            disabled={busy}
            onClick={onSetDefault}
            className="rounded-[10px] border border-line bg-white px-3 py-2 text-[12px] font-bold text-brown-2 transition-colors hover:border-rose-soft hover:text-rose-dk disabled:opacity-60"
          >
            Varsayılan Yap
          </button>
        ) : null}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-[10px] border border-line bg-white px-3 py-2 text-[12px] font-bold text-brown-2 transition-colors hover:border-rose-soft hover:text-rose-dk"
        >
          Düzenle
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded-[10px] border border-rose-soft bg-white px-3 py-2 text-[12px] font-bold text-rose-dk transition-colors hover:bg-rose-tint disabled:opacity-60"
        >
          Sil
        </button>
      </div>
    </article>
  )
}

function AddressForm({
  editing,
  errors,
  isSubmitting,
  register,
  onCancel,
  onSubmit,
}: {
  editing: boolean
  errors: Partial<Record<keyof AddressFormValues, { message?: string }>>
  isSubmitting: boolean
  register: ReturnType<typeof useForm<AddressFormValues>>['register']
  onCancel: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="mb-5 rounded-[18px] border border-line bg-cream-3 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-[19px] font-semibold text-brown">
            {editing ? 'Adresi Düzenle' : 'Yeni Adres'}
          </h3>
          <p className="mt-1 text-[12.5px] text-muted">
            Teslimat için alıcı ve adres bilgilerini girin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[680px]:grid-cols-1">
        <Field label="Adres Başlığı" error={errors.label?.message}>
          <input {...register('label')} placeholder="Ev, İş, Aile..." className={inputCls} />
        </Field>
        <Field label="Telefon" error={errors.phoneNumber?.message}>
          <input {...register('phoneNumber')} type="tel" placeholder="+90 555 000 00 00" className={inputCls} />
        </Field>
        <Field label="Alıcı Adı" required error={errors.recipientFirstName?.message}>
          <input {...register('recipientFirstName')} placeholder="Ad" className={inputCls} />
        </Field>
        <Field label="Alıcı Soyadı" required error={errors.recipientLastName?.message}>
          <input {...register('recipientLastName')} placeholder="Soyad" className={inputCls} />
        </Field>
        <Field label="Adres" required error={errors.line1?.message} className="col-span-2 max-[680px]:col-span-1">
          <input {...register('line1')} placeholder="Cadde, mahalle, bina no..." className={inputCls} />
        </Field>
        <Field label="Daire / Kat" error={errors.line2?.message} className="col-span-2 max-[680px]:col-span-1">
          <input {...register('line2')} placeholder="Daire, kat, blok" className={inputCls} />
        </Field>
        <Field label="Şehir" required error={errors.city?.message}>
          <input {...register('city')} placeholder="İstanbul" className={inputCls} />
        </Field>
        <Field label="İlçe" required error={errors.district?.message}>
          <input {...register('district')} placeholder="Beşiktaş" className={inputCls} />
        </Field>
        <Field label="Posta Kodu" error={errors.postalCode?.message}>
          <input {...register('postalCode')} placeholder="34000" className={inputCls} />
        </Field>
        <Field label="Ülke" required error={errors.country?.message}>
          <input {...register('country')} placeholder="Türkiye" className={inputCls} />
        </Field>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-brown-2">
        <input
          type="checkbox"
          {...register('defaultAddress')}
          className="h-4 w-4 rounded border-line accent-rose"
        />
        Varsayılan teslimat adresi yap
      </label>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[12px] border border-line bg-white px-5 py-2.5 text-[13px] font-bold text-brown-2 transition-colors hover:bg-cream-2"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[12px] bg-rose px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-rose-dk disabled:opacity-60"
        >
          {isSubmitting ? 'Kaydediliyor...' : editing ? 'Adresi Güncelle' : 'Adresi Kaydet'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col ${className ?? ''}`}>
      <span className="text-[13px] font-bold text-brown-2">
        {label}
        {!required && <span className="ml-1 font-normal text-muted">(Opsiyonel)</span>}
      </span>
      {children}
      {error ? <span className="mt-1 text-[12px] font-semibold text-rose-dk">{error}</span> : null}
    </label>
  )
}
