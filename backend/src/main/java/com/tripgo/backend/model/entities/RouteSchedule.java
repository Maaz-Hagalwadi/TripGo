package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "route_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id")
    private Bus bus;

    @Column(name = "departure_time", nullable = false)
    private Instant departureTime;

    @Column(name = "arrival_time", nullable = false)
    private Instant arrivalTime;

    @Column
    private String frequency;

    @Column
    private Boolean active = true;

    @Column(name = "trip_status")
    @Builder.Default
    private String tripStatus = "SCHEDULED"; // SCHEDULED, STARTED, COMPLETED, DELAYED

    @Column(name = "delay_minutes")
    private Integer delayMinutes;

    @Column(name = "delay_reason")
    private String delayReason;

    @Column(name = "actual_departure_time")
    private Instant actualDepartureTime;

    @Column(name = "actual_arrival_time")
    private Instant actualArrivalTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
