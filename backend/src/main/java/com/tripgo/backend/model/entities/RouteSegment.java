package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "route_segments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @Column(nullable = false)
    private Integer seq;

    @Column(name = "from_stop", nullable = false)
    private String fromStop;

    @Column(name = "to_stop", nullable = false)
    private String toStop;

    @Column(name = "distance_km")
    private BigDecimal distanceKm;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;
}
