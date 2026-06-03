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

interface FilterSetting {
  key: string
  label: string
  enabled: boolean
  sortOrder: number
}

async function readApiError(res: Response, fallback: string) {
  try {
    const payload = await res.json()
    if (typeof payload?.message === 'string') return payload.message
  } catch {
    // Empty error bodies can happen on proxy failures.
  }
  return fallback
}

export default function AdminFiltersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [settings, setSettings] = useState<FilterSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          router.replace('/account/login?next=/admin/filters')
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

        const settingsRes = await fetch('/api/admin/filter-settings', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!settingsRes.ok) throw new Error(await readApiError(settingsRes, 'Filtre ayarlari yuklenemedi.'))
        if (!active) return
        setSettings((await settingsRes.json()) as FilterSetting[])
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Filtre ayarlari yuklenirken hata olustu.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [router])

  async function toggleSetting(setting: FilterSetting) {
    setSavingKey(setting.key)
    setError(null)
    const nextEnabled = !setting.enabled

    try {
      const res = await fetch(`/api/admin/filter-settings/${setting.key}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Filtre ayari guncellenemedi.'))
      const updated = (await res.json()) as FilterSetting
      setSettings((current) => current.map((item) => item.key === updated.key ? updated : item))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Filtre ayari guncellenirken hata olustu.')
    } finally {
      setSavingKey(null)
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
            <p className="text-[13px] text-[#B5A090]">Filtre ayarlari yukleniyor...</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (forbidden) {
    return (
      <AdminShell displayName={displayName}>
        <div className="rounded-[16px] border border-[#ECE3D6] bg-white p-10 text-center">
          <h1 className="text-[20px] font-bold text-[#3D2B1F]">Yetkisiz Erisim</h1>
          <p className="mt-2 text-[13px] text-[#B5A090]">Bu alan yalnizca ADMIN rolune sahip kullanicilar icindir.</p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell displayName={displayName}>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold text-[#3D2B1F]">Filtreler</h1>
        <p className="mt-0.5 text-[13px] text-[#B5A090]">
          Musteri tarafinda hangi filtre basliklarinin gorunecegini yonetin.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-[10px] bg-[#FEEAEA] px-4 py-3 text-[13px] text-[#8A1A1A]">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-[16px] border border-[#ECE3D6] bg-white">
        {settings.map((setting) => (
          <button
            key={setting.key}
            type="button"
            onClick={() => void toggleSetting(setting)}
            disabled={savingKey !== null}
            className="flex w-full items-center justify-between gap-4 border-b border-[#F4EEE6] px-5 py-4 text-left last:border-b-0 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div>
              <p className="text-[14px] font-bold text-[#3D2B1F]">{setting.label}</p>
              <p className="mt-0.5 text-[12px] text-[#B5A090]">
                {setting.enabled ? 'Musteri filtresinde gorunur' : 'Musteri filtresinde gizli'}
              </p>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${setting.enabled ? 'bg-[#C07B5A]' : 'bg-[#DDD2C4]'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${setting.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
          </button>
        ))}
      </div>
    </AdminShell>
  )
}
