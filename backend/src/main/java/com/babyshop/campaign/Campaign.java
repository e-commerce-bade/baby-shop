package com.babyshop.campaign;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "campaigns")
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 60)
    private String code;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 60)
    private String value;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(length = 150)
    private String audience;

    @Column(name = "starts_at", length = 30)
    private String startsAt;

    @Column(name = "ends_at", length = 30)
    private String endsAt;

    @Column(name = "usage_count", nullable = false)
    private int usageCount;

    @Column(name = "usage_limit", nullable = false)
    private int usageLimit;

    @Column(length = 40)
    private String revenue;

    // Virgulle ayrilmis degerler (servis katmaninda List'e cevrilir).
    @Column(length = 255)
    private String channels;

    @Column(length = 255)
    private String placements;

    @Column(name = "hero_background_type", length = 20)
    private String heroBackgroundType;

    @Column(name = "hero_image_url", length = 500)
    private String heroImageUrl;

    @Column(name = "hero_background_color", length = 20)
    private String heroBackgroundColor;

    @Column(name = "hero_text_tone", length = 20)
    private String heroTextTone;

    @Column(name = "hero_button_tone", length = 20)
    private String heroButtonTone;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private OffsetDateTime updatedAt;
}
