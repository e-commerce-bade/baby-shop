package com.babyshop.campaign.dto;

import java.util.List;

public record CampaignResponse(
        Long id,
        String name,
        String code,
        String type,
        String value,
        String status,
        String audience,
        String startsAt,
        String endsAt,
        int usage,
        int limit,
        String revenue,
        List<String> channels,
        List<String> placements,
        CampaignHeroDto hero
) {
}
