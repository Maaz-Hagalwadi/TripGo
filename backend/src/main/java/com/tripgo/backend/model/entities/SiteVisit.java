package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "site_visits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SiteVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "visitor_id", length = 64, nullable = false)
    private String visitorId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 255, nullable = false)
    private String path;

    @Column(length = 255)
    private String referrer;

    @Column(name = "utm_source", length = 100)
    private String utmSource;

    @Column(name = "utm_medium", length = 100)
    private String utmMedium;

    @Column(name = "utm_campaign", length = 100)
    private String utmCampaign;

    @Column(name = "screen_width")
    private Integer screenWidth;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
