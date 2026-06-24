'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Campaign, CampaignPlacement as CampaignPlacementKey } from '@/lib/mock/campaigns'

function isVisibleCampaign(campaign: Campaign, placement: CampaignPlacementKey) {
  return campaign.status === 'active' && campaign.placements.includes(placement)
}

export default function CampaignPlacement({
  placement,
}: {
  placement: CampaignPlacementKey
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    let active = true
    fetch('/api/campaigns', { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setCampaigns(Array.isArray(data) ? (data as Campaign[]) : [])
      })
      .catch(() => {
        if (active) setCampaigns([])
      })
    return () => {
      active = false
    }
  }, [])

  const visibleCampaign = useMemo(
    () => campaigns.find((campaign) => isVisibleCampaign(campaign, placement)),
    [campaigns, placement],
  )

  if (!visibleCampaign) return null

  return (
    <section className="rounded-panel border border-[#EAD8C8] bg-[#FFF8EC] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C07B5A]">
            Kampanya
          </p>
          <h2 className="mt-1 font-serif text-[22px] font-semibold text-brown">
            {visibleCampaign.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {visibleCampaign.audience} icin {visibleCampaign.value} firsat.
          </p>
        </div>
        {visibleCampaign.code ? (
          <div className="rounded-[12px] border border-[#E6D4C2] bg-white px-4 py-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B5A090]">Kod</p>
            <p className="mt-1 text-[18px] font-black text-[#C07B5A]">{visibleCampaign.code}</p>
          </div>
        ) : (
          <div className="rounded-[12px] border border-[#E6D4C2] bg-white px-4 py-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B5A090]">Firsat</p>
            <p className="mt-1 text-[18px] font-black text-[#C07B5A]">{visibleCampaign.value}</p>
          </div>
        )}
      </div>
    </section>
  )
}
