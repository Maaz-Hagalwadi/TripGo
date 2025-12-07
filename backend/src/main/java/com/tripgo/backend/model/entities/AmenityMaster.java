package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "amenity_master")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmenityMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;  // WIFI, AC, CHARGER, etc.

    private String description;

    @ManyToMany(mappedBy = "amenities")
    private List<Bus> buses;  // Reverse side
}
