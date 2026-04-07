package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "fares",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_fare_segment_seattype_bus",
            columnNames = {"route_segment_id", "seat_type", "bus_id"}
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fare {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_segment_id")
    private RouteSegment routeSegment;

    // null = route-level default, non-null = per-bus override
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id")
    private Bus bus;

    @Column(name = "seat_type")
    private String seatType;

    @Column(name = "base_fare", nullable = false)
    private BigDecimal baseFare;

    @Column(name = "gst_percent")
    private BigDecimal gstPercent;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;
}
