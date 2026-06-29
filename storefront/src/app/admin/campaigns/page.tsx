'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import {
  placementLabels,
  type Campaign,
  type CampaignPlacement,
  type HeroBackgroundType,
  type HeroButtonTone,
  type HeroTextTone,
  type CampaignStatus,
  type CampaignType,
} from '@/lib/mock/campaigns'

// id'siz kampanya govdesi (POST/PUT icin backend CampaignAdminRequest ile eslesir).
type CampaignPayload = Omit<Campaign, 'id'>

function toPayload(campaign: Campaign | CampaignPayload): CampaignPayload {
  const { name, code, type, value, status, audience, startsAt, endsAt, usage, limit, revenue, channels, placements, hero } =
    campaign as Campaign
  return { name, code, type, value, status, audience, startsAt, endsAt, usage, limit, revenue, channels, placements, hero }
}

interface AdminProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

const statusLabels: Record<CampaignStatus, string> = {
  active: 'Aktif',
  scheduled: 'Planlandi',
  paused: 'Pasif',
  expired: 'Suresi Bitti',
}

const statusClasses: Record<CampaignStatus, string> = {
  active: 'bg-[#EDF7F1] text-[#1A6640]',
  scheduled: 'bg-[#EEF4FF] text-[#315C9A]',
  paused: 'bg-[#FAF6F1] text-[#8C7A6A]',
  expired: 'bg-[#FEEAEA] text-[#8A1A1A]',
}

const typeLabels: Record<CampaignType, string> = {
  percentage: 'Yuzde Indirim',
  fixed: 'Tutar Indirimi',
  shipping: 'Kargo Kampanyasi',
  bundle: 'Paket Kampanyasi',
}

const textToneClasses: Record<HeroTextTone, { title: string; body: string; eyebrow: string }> = {
  dark: { title: 'text-[#3D2B1F]', body: 'text-[#6B5747]', eyebrow: 'text-[#8C7A6A]' },
  light: { title: 'text-white', body: 'text-white/85', eyebrow: 'text-white/75' },
  brand: { title: 'text-[#5B4839]', body: 'text-[#8C5F4A]', eyebrow: 'text-[#C07B5A]' },
}

const buttonToneClasses: Record<HeroButtonTone, string> = {
  brand: 'bg-[#C07B5A] text-white',
  dark: 'bg-[#3D2B1F] text-white',
  light: 'bg-white text-[#3D2B1F]',
}

function IconPlus() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M17 17l-3.5-3.5" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2H5a1 1 0 00-1 1v5.5l8.5 8.5a2 2 0 002.8 0l3.2-3.2a2 2 0 000-2.8L10.5 2z" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CampaignBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

export default function AdminCampaignsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CampaignStatus>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftCode, setDraftCode] = useState('')
  const [draftType, setDraftType] = useState<CampaignType>('percentage')
  const [draftValue, setDraftValue] = useState('')
  const [draftAudience, setDraftAudience] = useState('Tum musteriler')
  const [draftStartsAt, setDraftStartsAt] = useState('')
  const [draftEndsAt, setDraftEndsAt] = useState('')
  const [draftPlacements, setDraftPlacements] = useState<CampaignPlacement[]>(['homeHero'])
  const [draftHeroBackgroundType, setDraftHeroBackgroundType] = useState<HeroBackgroundType>('image')
  const [draftHeroImageUrl, setDraftHeroImageUrl] = useState('/images/hero_2.png')
  const [draftHeroBackgroundColor, setDraftHeroBackgroundColor] = useState('#F6E6E2')
  const [draftHeroTextTone, setDraftHeroTextTone] = useState<HeroTextTone>('dark')
  const [draftHeroButtonTone, setDraftHeroButtonTone] = useState<HeroButtonTone>('brand')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function checkAdmin() {
      try {
        const res = await fetch('/api/account/me', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })

        if (res.status === 401) {
          router.replace('/account/login?next=/admin/campaigns')
          return
        }
        if (!res.ok) {
          setForbidden(true)
          return
        }

        const loadedProfile = (await res.json()) as AdminProfile
        if (!loadedProfile.roles?.includes('ADMIN')) {
          setForbidden(true)
          return
        }
        if (active) {
          setProfile(loadedProfile)
          const campaignsRes = await fetch('/api/admin/campaigns', {
            cache: 'no-store',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
          })
          if (campaignsRes.ok && active) {
            setCampaigns((await campaignsRes.json()) as Campaign[])
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void checkAdmin()
    return () => {
      active = false
    }
  }, [router])

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : undefined

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase()
    return campaigns.filter((campaign) => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false
      if (!q) return true
      return [
        campaign.name,
        campaign.code,
        campaign.audience,
        typeLabels[campaign.type],
        ...campaign.channels,
      ].join(' ').toLowerCase().includes(q)
    })
  }, [campaigns, search, statusFilter])

  const metrics = useMemo(() => {
    const active = campaigns.filter((campaign) => campaign.status === 'active').length
    const scheduled = campaigns.filter((campaign) => campaign.status === 'scheduled').length
    const paused = campaigns.filter((campaign) => campaign.status === 'paused').length
    return { active, scheduled, paused, total: campaigns.length }
  }, [campaigns])

  function resetDraft() {
    setDraftName('')
    setDraftCode('')
    setDraftType('percentage')
    setDraftValue('')
    setDraftAudience('Tum musteriler')
    setDraftStartsAt('')
    setDraftEndsAt('')
    setDraftPlacements(['homeHero'])
    setDraftHeroBackgroundType('image')
    setDraftHeroImageUrl('/images/hero_2.png')
    setDraftHeroBackgroundColor('#F6E6E2')
    setDraftHeroTextTone('dark')
    setDraftHeroButtonTone('brand')
  }

  // Bir kampanyayi sunucuda guncelle (PUT) ve basariliysa yerel listeyi yanitla degistir.
  async function persistCampaignUpdate(id: number, updated: Campaign) {
    const res = await fetch(`/api/admin/campaigns/${id}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(toPayload(updated)),
    })
    if (!res.ok) {
      setNotice('Kampanya guncellenemedi. Lutfen tekrar deneyin.')
      return
    }
    const saved = (await res.json()) as Campaign
    setCampaigns((current) => current.map((campaign) => (campaign.id === id ? saved : campaign)))
  }

  function toggleDraftPlacement(placement: CampaignPlacement) {
    setDraftPlacements((current) =>
      current.includes(placement)
        ? current.filter((item) => item !== placement)
        : [...current, placement],
    )
  }

  async function createCampaign() {
    if (!draftName.trim() || !draftValue.trim()) {
      setNotice('Kampanya adi ve indirim degeri zorunlu.')
      return
    }

    // Tarih araligi: iki tarih de doluysa bitis baslangictan once olamaz.
    // date input 'YYYY-MM-DD' verir; sozluksel karsilastirma kronolojik siralamayla ayni.
    if (draftStartsAt && draftEndsAt && draftEndsAt < draftStartsAt) {
      setNotice('Bitis tarihi baslangic tarihinden once olamaz.')
      return
    }

    // Yuzde indirimde sade sayi girildiyse ("20") gosterimi "%20" olarak normalize et.
    let normalizedValue = draftValue.trim()
    if (draftType === 'percentage' && /^\d+([.,]\d+)?$/.test(normalizedValue)) {
      normalizedValue = `%${normalizedValue}`
    }

    const payload: CampaignPayload = {
      name: draftName.trim(),
      code: draftCode.trim().toUpperCase(),
      type: draftType,
      value: normalizedValue,
      status: draftStartsAt ? 'scheduled' : 'paused',
      audience: draftAudience.trim() || 'Tum musteriler',
      startsAt: draftStartsAt || '-',
      endsAt: draftEndsAt || '-',
      usage: 0,
      limit: 100,
      revenue: '0 TL',
      channels: ['Web'],
      placements: draftPlacements,
      hero: {
        backgroundType: draftHeroBackgroundType,
        imageUrl: draftHeroImageUrl,
        backgroundColor: draftHeroBackgroundColor,
        textTone: draftHeroTextTone,
        buttonTone: draftHeroButtonTone,
      },
    }

    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      setNotice('Kampanya olusturulamadi. Lutfen tekrar deneyin.')
      return
    }

    const created = (await res.json()) as Campaign
    setCampaigns((current) => [created, ...current])
    setNotice('Kampanya taslagi olusturuldu. Secilen yayin alanlarinda aktif edilince musterilere gorunecek.')
    setDrawerOpen(false)
    resetDraft()
  }

  function toggleCampaignStatus(id: number) {
    const campaign = campaigns.find((item) => item.id === id)
    if (!campaign) return
    void persistCampaignUpdate(id, {
      ...campaign,
      status: campaign.status === 'active' ? 'paused' : 'active',
    })
  }

  function toggleCampaignPlacement(id: number, placement: CampaignPlacement) {
    const campaign = campaigns.find((item) => item.id === id)
    if (!campaign) return
    const hasPlacement = campaign.placements.includes(placement)
    void persistCampaignUpdate(id, {
      ...campaign,
      placements: hasPlacement
        ? campaign.placements.filter((item) => item !== placement)
        : [...campaign.placements, placement],
    })
  }

  function handleHeroImageUpload(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftHeroImageUrl(reader.result)
        setDraftHeroBackgroundType('image')
      }
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <AdminShell displayName={displayName}>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#ECE3D6] border-t-[#C07B5A]" />
            <p className="text-[13px] text-[#B5A090]">Kampanyalar yukleniyor...</p>
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#3D2B1F]">Kampanyalar</h1>
          <p className="mt-0.5 text-[13px] text-[#B5A090]">
            Indirim kodlari, kargo firsatlari ve kategori kampanyalarini yonetin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#C07B5A] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#A9684B]"
        >
          <IconPlus />
          Yeni Kampanya
        </button>
      </div>

      {notice ? (
        <div className="mb-4 rounded-[10px] border border-[#EAD8C8] bg-[#FFF8EC] px-4 py-3 text-[13px] font-semibold text-[#8A6038]">
          {notice}
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-[14px] border border-[#ECE3D6] bg-white p-4">
          <p className="text-[12px] font-semibold text-[#B5A090]">Aktif Kampanya</p>
          <p className="mt-2 text-[24px] font-bold text-[#3D2B1F]">{metrics.active}</p>
        </div>
        <div className="rounded-[14px] border border-[#ECE3D6] bg-white p-4">
          <p className="text-[12px] font-semibold text-[#B5A090]">Planlanan</p>
          <p className="mt-2 text-[24px] font-bold text-[#3D2B1F]">{metrics.scheduled}</p>
        </div>
        <div className="rounded-[14px] border border-[#ECE3D6] bg-white p-4">
          <p className="text-[12px] font-semibold text-[#B5A090]">Pasif</p>
          <p className="mt-2 text-[24px] font-bold text-[#3D2B1F]">{metrics.paused}</p>
        </div>
        <div className="rounded-[14px] border border-[#ECE3D6] bg-white p-4">
          <p className="text-[12px] font-semibold text-[#B5A090]">Toplam Kampanya</p>
          <p className="mt-2 text-[24px] font-bold text-[#3D2B1F]">{metrics.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#C4B5A5]">
            <IconSearch />
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kampanya adi, kod veya hedef kitle ara..."
            className="h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white pl-9 pr-3 text-[13px] text-[#3D2B1F] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | CampaignStatus)}
          className="h-10 rounded-[10px] border border-[#ECE3D6] bg-white px-3 text-[13px] font-semibold text-[#5B4839] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
        >
          <option value="all">Tum Durumlar</option>
          <option value="active">Aktif</option>
          <option value="scheduled">Planlandi</option>
          <option value="paused">Pasif</option>
          <option value="expired">Suresi Bitti</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[16px] border border-[#ECE3D6] bg-white">
        <div className="hidden grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_120px] border-b border-[#ECE3D6] bg-[#FAF6F1] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[#B5A090] lg:grid">
          <span>Kampanya</span>
          <span>Tip</span>
          <span>Durum</span>
          <span>Tarih</span>
          <span className="text-right">Aksiyon</span>
        </div>

        {filteredCampaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="grid gap-4 border-b border-[#F4EEE6] px-4 py-4 last:border-b-0 lg:grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_120px] lg:items-center lg:px-5"
          >
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[#F4EEE6] text-[#C07B5A]">
                <IconTag />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[#3D2B1F]">{campaign.name}</p>
                <p className="mt-1 text-[12px] font-semibold text-[#B5A090]">
                  {campaign.code ? `${campaign.code} · ` : ''}{campaign.audience}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
                  {campaign.placements.length > 0 ? campaign.placements.map((placement) => (
                    <span key={placement} className="rounded-full bg-[#FAF6F1] px-2 py-0.5 text-[10px] font-bold text-[#8C7A6A]">
                      {placementLabels[placement]}
                    </span>
                  )) : (
                    <span className="rounded-full bg-[#FEEAEA] px-2 py-0.5 text-[10px] font-bold text-[#8A1A1A]">
                      Yayinda degil
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#3D2B1F]">{typeLabels[campaign.type]}</p>
              <p className="mt-1 text-[12px] text-[#B5A090]">{campaign.value}</p>
            </div>
            <div>
              <CampaignBadge status={campaign.status} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#5B4839]">{campaign.startsAt}</p>
              <p className="mt-1 text-[12px] text-[#B5A090]">{campaign.endsAt}</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => toggleCampaignStatus(campaign.id)}
                className="rounded-[9px] border border-[#ECE3D6] px-3 py-2 text-[12px] font-bold text-[#5B4839] transition-colors hover:bg-[#FAF6F1]"
              >
                {campaign.status === 'active' ? 'Pasife Cek' : 'Aktif Et'}
              </button>
            </div>
            <div className="lg:col-span-5">
              <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-[#FAF6F1] px-3 py-2">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#B5A090]">
                  Yayin alani
                </span>
                {(Object.keys(placementLabels) as CampaignPlacement[]).map((placement) => {
                  const selected = campaign.placements.includes(placement)
                  return (
                    <button
                      key={placement}
                      type="button"
                      onClick={() => toggleCampaignPlacement(campaign.id, placement)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                        selected
                          ? 'bg-[#C07B5A] text-white'
                          : 'bg-white text-[#8C7A6A] hover:bg-[#F4EEE6]'
                      }`}
                    >
                      {placementLabels[placement]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {filteredCampaigns.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[14px] font-bold text-[#3D2B1F]">Kampanya bulunamadi</p>
            <p className="mt-1 text-[13px] text-[#B5A090]">Arama veya durum filtresini degistirerek tekrar deneyin.</p>
          </div>
        ) : null}
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <button
            type="button"
            aria-label="Paneli kapat"
            className="absolute inset-0"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative h-full w-full max-w-[480px] overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ECE3D6] bg-white px-6 py-5">
              <div>
                <h2 className="text-[20px] font-bold text-[#3D2B1F]">Yeni Kampanya</h2>
                <p className="mt-1 text-[12px] text-[#B5A090]">Indirim kurallarini kampanya motoruna baglamadan once taslaklayin.</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-[9px] px-3 py-2 text-[13px] font-bold text-[#B5A090] hover:bg-[#FAF6F1] hover:text-[#5B4839]"
              >
                Kapat
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div
                className="relative overflow-hidden rounded-[16px] border border-[#ECE3D6] px-5 py-6"
                style={{ background: draftHeroBackgroundColor }}
              >
                {draftHeroBackgroundType === 'image' && draftHeroImageUrl ? (
                  <>
                    <img
                      src={draftHeroImageUrl}
                      alt="Hero onizleme"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/62 to-white/10" />
                  </>
                ) : null}
                <div className="relative z-10 max-w-[300px]">
                  <p className={`text-[11px] font-extrabold uppercase tracking-[0.14em] ${textToneClasses[draftHeroTextTone].eyebrow}`}>
                    Ozel Kampanya
                  </p>
                  <h3 className={`mt-2 font-serif text-[28px] font-semibold leading-tight ${textToneClasses[draftHeroTextTone].title}`}>
                    {draftName || 'Kampanya basligi'}
                    <span className="block italic text-[#C07B5A]">{draftCode || draftValue || 'Firsat'}</span>
                  </h3>
                  <p className={`mt-3 text-[13px] leading-relaxed ${textToneClasses[draftHeroTextTone].body}`}>
                    {draftAudience || 'Hedef kitle'} icin {draftValue || 'indirim'} firsat.
                  </p>
                  <button
                    type="button"
                    className={`mt-4 rounded-full px-4 py-2 text-[12px] font-bold ${buttonToneClasses[draftHeroButtonTone]}`}
                  >
                    Kampanyayi Kesfet
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="text-[12px] font-bold text-[#5B4839]">Kampanya Adi</span>
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] px-3 text-[13px] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-bold text-[#5B4839]">Kod</span>
                  <input
                    value={draftCode}
                    onChange={(event) => setDraftCode(event.target.value)}
                    placeholder="Opsiyonel"
                    className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] px-3 text-[13px] uppercase focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-bold text-[#5B4839]">Tip</span>
                  <select
                    value={draftType}
                    onChange={(event) => setDraftType(event.target.value as CampaignType)}
                    className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] px-3 text-[13px] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                  >
                    <option value="percentage">Yuzde Indirim</option>
                    <option value="fixed">Tutar Indirimi</option>
                    <option value="shipping">Kargo Kampanyasi</option>
                    <option value="bundle">Paket Kampanyasi</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-[12px] font-bold text-[#5B4839]">Indirim Degeri</span>
                <input
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  placeholder="%15, 100 TL veya Kargo"
                  className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] px-3 text-[13px] placeholder:text-[#C4B5A5] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-bold text-[#5B4839]">Hedef Kitle / Kural</span>
                <input
                  value={draftAudience}
                  onChange={(event) => setDraftAudience(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] px-3 text-[13px] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-bold text-[#5B4839]">Baslangic</span>
                  <input
                    type="date"
                    value={draftStartsAt}
                    onChange={(event) => setDraftStartsAt(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] px-3 text-[13px] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-bold text-[#5B4839]">Bitis</span>
                  <input
                    type="date"
                    value={draftEndsAt}
                    onChange={(event) => setDraftEndsAt(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] px-3 text-[13px] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                  />
                </label>
              </div>
              <div>
                <span className="text-[12px] font-bold text-[#5B4839]">Musteri Sayfasinda Nerede Gorunsun?</span>
                <div className="mt-2 grid gap-2">
                  {(Object.keys(placementLabels) as CampaignPlacement[]).map((placement) => {
                    const checked = draftPlacements.includes(placement)
                    return (
                      <label
                        key={placement}
                        className={`flex cursor-pointer items-center justify-between rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                          checked
                            ? 'border-[#C07B5A] bg-[#FFF8EC] text-[#5B4839]'
                            : 'border-[#ECE3D6] text-[#8C7A6A] hover:bg-[#FAF6F1]'
                        }`}
                      >
                        <span>{placementLabels[placement]}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDraftPlacement(placement)}
                          className="h-4 w-4 accent-[#C07B5A]"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#ECE3D6] bg-[#FAF6F1] p-4">
                <h3 className="text-[13px] font-bold text-[#3D2B1F]">Hero Tasarimi</h3>
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="text-[12px] font-bold text-[#5B4839]">Arka Plan Tipi</span>
                    <select
                      value={draftHeroBackgroundType}
                      onChange={(event) => setDraftHeroBackgroundType(event.target.value as HeroBackgroundType)}
                      className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 text-[13px] focus:border-[#A89070] focus:outline-none focus:ring-2 focus:ring-[#A89070]/20"
                    >
                      <option value="image">Gorsel</option>
                      <option value="color">Duz Renk</option>
                    </select>
                  </label>
                  {draftHeroBackgroundType === 'image' ? (
                    <label className="block">
                      <span className="text-[12px] font-bold text-[#5B4839]">Hero Gorseli</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleHeroImageUpload(event.target.files?.[0] ?? null)}
                        className="mt-1.5 block w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 py-2 text-[12px] text-[#5B4839] file:mr-3 file:rounded-[8px] file:border-0 file:bg-[#F4EEE6] file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-[#5B4839]"
                      />
                    </label>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-[12px] font-bold text-[#5B4839]">Arka Plan</span>
                      <input
                        type="color"
                        value={draftHeroBackgroundColor}
                        onChange={(event) => setDraftHeroBackgroundColor(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white p-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[12px] font-bold text-[#5B4839]">Metin</span>
                      <select
                        value={draftHeroTextTone}
                        onChange={(event) => setDraftHeroTextTone(event.target.value as HeroTextTone)}
                        className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 text-[13px] focus:border-[#A89070] focus:outline-none"
                      >
                        <option value="dark">Koyu</option>
                        <option value="light">Acik</option>
                        <option value="brand">Marka</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[12px] font-bold text-[#5B4839]">Buton</span>
                      <select
                        value={draftHeroButtonTone}
                        onChange={(event) => setDraftHeroButtonTone(event.target.value as HeroButtonTone)}
                        className="mt-1.5 h-10 w-full rounded-[10px] border border-[#ECE3D6] bg-white px-3 text-[13px] focus:border-[#A89070] focus:outline-none"
                      >
                        <option value="brand">Marka</option>
                        <option value="dark">Koyu</option>
                        <option value="light">Acik</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-[#ECE3D6] bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-10 flex-1 rounded-[10px] border border-[#ECE3D6] text-[13px] font-bold text-[#5B4839] hover:bg-[#FAF6F1]"
              >
                Vazgec
              </button>
              <button
                type="button"
                onClick={createCampaign}
                className="h-10 flex-1 rounded-[10px] bg-[#C07B5A] text-[13px] font-bold text-white hover:bg-[#A9684B]"
              >
                Taslak Olustur
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </AdminShell>
  )
}
