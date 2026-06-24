package com.babyshop.campaign;

import com.babyshop.campaign.dto.CampaignAdminRequest;
import com.babyshop.campaign.dto.CampaignHeroDto;
import com.babyshop.campaign.dto.CampaignResponse;
import com.babyshop.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CampaignService {

    private static final String STATUS_ACTIVE = "active";

    private final CampaignRepository campaignRepository;

    public List<CampaignResponse> getAllCampaigns() {
        return campaignRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<CampaignResponse> getActiveCampaigns() {
        return campaignRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(STATUS_ACTIVE).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CampaignResponse createCampaign(CampaignAdminRequest request) {
        Campaign campaign = new Campaign();
        applyRequest(campaign, request);
        return toResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public CampaignResponse updateCampaign(Long id, CampaignAdminRequest request) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found for id: " + id));
        applyRequest(campaign, request);
        return toResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public void deleteCampaign(Long id) {
        if (!campaignRepository.existsById(id)) {
            throw new ResourceNotFoundException("Campaign not found for id: " + id);
        }
        campaignRepository.deleteById(id);
    }

    private void applyRequest(Campaign campaign, CampaignAdminRequest request) {
        campaign.setName(request.name().trim());
        campaign.setCode(normalize(request.code()));
        campaign.setType(request.type().trim());
        campaign.setValue(request.value().trim());
        campaign.setStatus(request.status().trim());
        campaign.setAudience(normalize(request.audience()));
        campaign.setStartsAt(normalize(request.startsAt()));
        campaign.setEndsAt(normalize(request.endsAt()));
        campaign.setUsageCount(request.usage() == null ? 0 : Math.max(request.usage(), 0));
        campaign.setUsageLimit(request.limit() == null ? 0 : Math.max(request.limit(), 0));
        campaign.setRevenue(normalize(request.revenue()));
        campaign.setChannels(joinCsv(request.channels()));
        campaign.setPlacements(joinCsv(request.placements()));

        CampaignHeroDto hero = request.hero();
        campaign.setHeroBackgroundType(hero == null ? null : normalize(hero.backgroundType()));
        campaign.setHeroImageUrl(hero == null ? null : normalize(hero.imageUrl()));
        campaign.setHeroBackgroundColor(hero == null ? null : normalize(hero.backgroundColor()));
        campaign.setHeroTextTone(hero == null ? null : normalize(hero.textTone()));
        campaign.setHeroButtonTone(hero == null ? null : normalize(hero.buttonTone()));
    }

    private CampaignResponse toResponse(Campaign campaign) {
        return new CampaignResponse(
                campaign.getId(),
                campaign.getName(),
                campaign.getCode(),
                campaign.getType(),
                campaign.getValue(),
                campaign.getStatus(),
                campaign.getAudience(),
                campaign.getStartsAt(),
                campaign.getEndsAt(),
                campaign.getUsageCount(),
                campaign.getUsageLimit(),
                campaign.getRevenue(),
                splitCsv(campaign.getChannels()),
                splitCsv(campaign.getPlacements()),
                new CampaignHeroDto(
                        campaign.getHeroBackgroundType(),
                        campaign.getHeroImageUrl(),
                        campaign.getHeroBackgroundColor(),
                        campaign.getHeroTextTone(),
                        campaign.getHeroButtonTone()
                )
        );
    }

    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .toList();
    }

    private String joinCsv(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.stream()
                .filter(value -> value != null && !value.trim().isEmpty())
                .map(String::trim)
                .reduce((a, b) -> a + "," + b)
                .orElse(null);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
