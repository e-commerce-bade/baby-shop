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

export const placementLabels: Record<CampaignPlacement, string> = {
  homeHero: 'Ana sayfa hero',
  homeBelowCategories: 'Ana sayfa kategori alti',
  productListTop: 'Urun liste ustu',
}
