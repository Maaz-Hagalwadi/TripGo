package com.tripgo.backend.model.entities;

import com.tripgo.backend.util.JsonConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "seats",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"bus_id", "seat_number"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id", nullable = false)
    private Bus bus;

    @Column(name = "seat_number", nullable = false)
    private String seatNumber;

    @Column(name = "row_no")
    private String rowNo;

    @Column(name = "seat_type")
    private String seatType; // SLEEPER, SEATER, LOWER, UPPER

    @Column(name = "seat_position", columnDefinition = "jsonb")
    @Convert(converter = JsonConverter.class)
    private Map<String, Object> seatPosition;

    @Column(name = "is_window")
    private Boolean isWindow;

    @Column(name = "is_aisle")
    private Boolean isAisle;
}
