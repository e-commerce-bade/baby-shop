export type CampaignStatus = 'active' | 'scheduled' | 'paused' | 'expired'
export type CampaignType = 'percentage' | 'fixed' | 'shipping' | 'bundle'
export type CampaignPlacement = 'homeHero' | 'homeBelowCategories' | 'productListTop'
export type HeroBackgroundType = 'image' | 'color'
export type HeroTextTone = 'dark' | 'light' | 'brand'
export type HeroButtonTone = 'brand' | 'dark' | 'light'

export interface CampaignHeroSettings {
  backgroundType: HeroBackgroundType
  imageUrl: string
  backgroundColor: string
  textTone: HeroTextTone
  buttonTone: HeroButtonTone
}

export interface Campaign {
  id: number
  name: string
  code: string
  type: CampaignType
  value: string
  status: CampaignStatus
  audience: string
  startsAt: string
  endsAt: string
  usage: number
  limit: number
  revenue: string
  channels: string[]
  placements: CampaignPlacement[]
  hero: CampaignHeroSettings
}

export const campaignStorageKey = 'baby-shop-admin-campaigns'

export const placementLabels: Record<CampaignPlacement, string> = {
  homeHero: 'Ana sayfa hero',
  homeBelowCategories: 'Ana sayfa kategori alti',
  productListTop: 'Urun liste ustu',
}

export const initialCampaigns: Campaign[] = [
  {
    id: 1,
    name: 'Yaz Baslangic Indirimi',
    code: 'YAZ15',
    type: 'percentage',
    value: '%15',
    status: 'active',
    audience: 'Tum musteriler',
    startsAt: '2026-06-01',
    endsAt: '2026-06-16',
    usage: 42,
    limit: 250,
    revenue: '18,420 TL',
    channels: ['Web', 'Sepet'],
    placements: ['homeHero', 'productListTop'],
    hero: {
      backgroundType: 'image',
      imageUrl: '/images/hero_2.png',
      backgroundColor: '#F6E6E2',
      textTone: 'dark',
      buttonTone: 'brand',
    },
  },
  {
    id: 2,
    name: 'Yenidogan Setlerinde Firsat',
    code: 'MINIK100',
    type: 'fixed',
    value: '100 TL',
    status: 'scheduled',
    audience: 'Yenidogan kategorisi',
    startsAt: '2026-06-08',
    endsAt: '2026-06-22',
    usage: 0,
    limit: 120,
    revenue: '0 TL',
    channels: ['Web', 'Urun detayi'],
    placements: ['homeBelowCategories'],
    hero: {
      backgroundType: 'color',
      imageUrl: '',
      backgroundColor: '#F4ECE0',
      textTone: 'dark',
      buttonTone: 'brand',
    },
  },
  {
    id: 3,
    name: 'Ucretsiz Kargo Esigi',
    code: 'KARGO0',
    type: 'shipping',
    value: 'Kargo',
    status: 'active',
    audience: '750 TL ve uzeri sepet',
    startsAt: '2026-05-20',
    endsAt: '2026-06-30',
    usage: 87,
    limit: 500,
    revenue: '32,760 TL',
    channels: ['Sepet', 'Checkout'],
    placements: ['homeBelowCategories'],
    hero: {
      backgroundType: 'color',
      imageUrl: '',
      backgroundColor: '#DCE7EE',
      textTone: 'dark',
      buttonTone: 'dark',
    },
  },
  {
    id: 4,
    name: '2 Al 1 Aksesuar Indirimli',
    code: 'AKSESUAR',
    type: 'bundle',
    value: 'Paket',
    status: 'paused',
    audience: 'Aksesuar urunleri',
    startsAt: '2026-05-10',
    endsAt: '2026-06-10',
    usage: 16,
    limit: 100,
    revenue: '5,840 TL',
    channels: ['Web'],
    placements: [],
    hero: {
      backgroundType: 'color',
      imageUrl: '',
      backgroundColor: '#FAF6F1',
      textTone: 'dark',
      buttonTone: 'brand',
    },
  },
]

export function getCampaignsFromStorage(): Campaign[] {
  if (typeof window === 'undefined') return initialCampaigns

  try {
    const stored = window.localStorage.getItem(campaignStorageKey)
    if (!stored) return initialCampaigns
    const parsed = JSON.parse(stored) as Campaign[]
    if (!Array.isArray(parsed)) return initialCampaigns
    return parsed.map((campaign) => ({
      ...campaign,
      placements: Array.isArray(campaign.placements) ? campaign.placements : [],
      hero: campaign.hero ?? {
        backgroundType: 'color',
        imageUrl: '',
        backgroundColor: '#F6E6E2',
        textTone: 'dark',
        buttonTone: 'brand',
      },
    }))
  } catch {
    return initialCampaigns
  }
}

export function saveCampaignsToStorage(campaigns: Campaign[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(campaignStorageKey, JSON.stringify(campaigns))
}
