package com.babyshop.campaign;

import com.babyshop.campaign.dto.CampaignAdminRequest;
import com.babyshop.campaign.dto.CampaignResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/campaigns")
@RequiredArgsConstructor
public class CampaignAdminController {

    private final CampaignService campaignService;

    @GetMapping
    public ResponseEntity<List<CampaignResponse>> getCampaigns() {
        return ResponseEntity.ok(campaignService.getAllCampaigns());
    }

    @PostMapping
    public ResponseEntity<CampaignResponse> createCampaign(@Valid @RequestBody CampaignAdminRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.createCampaign(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CampaignResponse> updateCampaign(
            @PathVariable Long id,
            @Valid @RequestBody CampaignAdminRequest request
    ) {
        return ResponseEntity.ok(campaignService.updateCampaign(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCampaign(@PathVariable Long id) {
        campaignService.deleteCampaign(id);
        return ResponseEntity.noContent().build();
    }
}
