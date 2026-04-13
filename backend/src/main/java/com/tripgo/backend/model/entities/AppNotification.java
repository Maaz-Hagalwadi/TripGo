package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String type; // BOOKING_CONFIRMED, BOOKING_CANCELLED, NEW_BOOKING, REVIEW_RECEIVED, BUS_APPROVED, etc.

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String message;

    private String link; // frontend route to navigate on click

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
