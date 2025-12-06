package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bus_tracking")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id")
    private Bus bus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_schedule_id")
    private RouteSchedule routeSchedule;

    private Double latitude;

    private Double longitude;

    @Column(name = "speed_kmph")
    private Double speedKmph;

    private Double heading;

    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private Instant recordedAt;
}
