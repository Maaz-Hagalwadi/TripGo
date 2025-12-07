package com.tripgo.backend.model.entities;

import com.tripgo.backend.model.enums.BusType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "buses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "operator_id")
    private Operator operator;

    @Column(name = "bus_code", unique = true)
    private String busCode;

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    private String model;

    @Enumerated(EnumType.STRING)
    @Column(name = "bus_type")
    private BusType busType;

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats;

    @ManyToMany
    @JoinTable(
            name = "bus_amenities",
            joinColumns = @JoinColumn(name = "bus_id"),
            inverseJoinColumns = @JoinColumn(name = "amenity_id")
    )
    private List<AmenityMaster> amenities;


    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
