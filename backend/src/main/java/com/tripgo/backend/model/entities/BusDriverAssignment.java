package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bus_drivers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusDriverAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Many assignments -> one bus
    @ManyToOne
    @JoinColumn(name = "bus_id", nullable = false)
    private Bus bus;

    // Many assignments -> one driver
    @ManyToOne
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @Column(name = "assigned_from", updatable = false)
    @CreationTimestamp
    private Instant assignedFrom;

    @Column(name = "assigned_to")
    private Instant assignedTo;
}
