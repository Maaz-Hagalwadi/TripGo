package com.tripgo.backend.model.entities;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
        name = "booking_seats",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"booking_id", "seat_number"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id")
    private Seat seat;

    @Column(name = "seat_number", nullable = false)
    private String seatNumber;

    @Column(nullable = false)
    private BigDecimal fare;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id")
    private Passenger passenger;

    @Column(name = "from_stop")
    private String fromStop;

    @Column(name = "to_stop")
    private String toStop;

}
