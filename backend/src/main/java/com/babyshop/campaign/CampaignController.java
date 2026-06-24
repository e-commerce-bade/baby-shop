package com.babyshop.campaign;

import com.babyshop.campaign.dto.CampaignResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Storefront tarafi: yalnizca aktif kampanyalar (herkese acik). */
@RestController
@RequestMapping("/api/v1/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @GetMapping
    public ResponseEntity<List<CampaignResponse>> getActiveCampaigns() {
        return ResponseEntity.ok(campaignService.getActiveCampaigns());
    }
}
