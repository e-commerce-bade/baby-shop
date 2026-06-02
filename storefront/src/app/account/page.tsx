'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface CustomerProfile {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  active: boolean
  roles: string[]
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

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<PageResponse<Order> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        const ordersResponse = await fetch('/api/account/orders?page=0&size=10', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        if (!ordersResponse.ok) {
          throw new Error('Siparişler alınamadı.')
        }

        if (!active) return
        setProfile(await profileResponse.json())
        setOrders(await ordersResponse.json())
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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
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

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email

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
              Siparişlerinizi ve hesap bilgilerinizi buradan takip edebilirsiniz.
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

        <div className="grid grid-cols-[300px_1fr] gap-7 max-[900px]:grid-cols-1">
          <aside className="rounded-panel border border-line bg-white p-6">
            <h2 className="font-serif text-[18px] font-semibold text-brown">Profil</h2>
            <div className="mt-5 space-y-3 text-[13px]">
              <InfoRow label="E-posta" value={profile?.email} />
              <InfoRow label="Telefon" value={profile?.phoneNumber || 'Eklenmedi'} />
              <InfoRow label="Durum" value={profile?.active ? 'Aktif' : 'Pasif'} />
              <InfoRow label="Rol" value={profile?.roles?.join(', ') || '-'} />
            </div>
          </aside>

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
