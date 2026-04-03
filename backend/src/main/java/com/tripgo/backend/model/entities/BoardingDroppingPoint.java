package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "boarding_dropping_points")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BoardingDroppingPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private RouteSchedule schedule;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // BOARDING or DROPPING

    private String address;

    @Column(name = "arrival_time")
    private LocalTime arrivalTime;

    private String landmark;
}
