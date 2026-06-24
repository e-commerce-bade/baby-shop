package com.babyshop.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CampaignAdminRequest(
        @NotBlank(message = "Campaign name is required")
        @Size(max = 150, message = "Campaign name must be at most 150 characters")
        String name,
        @Size(max = 60, message = "Campaign code must be at most 60 characters")
        String code,
        @NotBlank(message = "Campaign type is required")
        String type,
        @NotBlank(message = "Campaign value is required")
        @Size(max = 60, message = "Campaign value must be at most 60 characters")
        String value,
        @NotBlank(message = "Campaign status is required")
        String status,
        @Size(max = 150, message = "Campaign audience must be at most 150 characters")
        String audience,
        String startsAt,
        String endsAt,
        Integer usage,
        Integer limit,
        String revenue,
        List<String> channels,
        List<String> placements,
        CampaignHeroDto hero
) {
}
