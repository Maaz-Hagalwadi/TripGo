package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "route_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "from_stop", nullable = false)
    private String fromStop;

    @Column(name = "to_stop", nullable = false)
    private String toStop;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(name = "target_fare")
    private BigDecimal targetFare;

    @Column(name = "alert_on_seat_available", nullable = false)
    private boolean alertOnSeatAvailable;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "last_notified_at")
    private Instant lastNotifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
