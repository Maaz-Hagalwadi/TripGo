package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Seat;
import com.tripgo.backend.repository.BusRepository;
import com.tripgo.backend.repository.SeatRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusLayoutService {

    private final SeatRepository seatRepository;
    private final BusRepository busRepository;

    @Transactional
    public void generateLayout(UUID busId, String template, int rows) {

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        seatRepository.deleteByBus(bus);

        // Build exactly the bus's seat count (whole rows used to add phantom seats, e.g. 44 for a 42-seater),
        // numbered the way the operator's layout preview shows them so seat marks line up.
        int total = bus.getTotalSeats() != null && bus.getTotalSeats() > 0 ? bus.getTotalSeats() : rows * 4;
        List<Seat> seats = switch (template) {
            case "SLEEPER_2X1" -> buildSleeper(bus, total);
            case "SEATER_2X2" -> buildSeater(bus, total);
            default -> throw new RuntimeException("Invalid template");
        };

        seatRepository.saveAll(seats);
    }

    /** Lower deck gets half the berths (rounded down), upper the rest; 3 per row (1 + 2). */
    private List<Seat> buildSleeper(Bus bus, int total) {
        List<Seat> seats = new ArrayList<>();
        int lower = total / 2;
        addDeck(seats, bus, "L", "LOWER", lower);
        addDeck(seats, bus, "U", "UPPER", total - lower);
        return seats;
    }

    private void addDeck(List<Seat> seats, Bus bus, String prefix, String seatType, int count) {
        for (int i = 0; i < count; i++) {
            seats.add(buildSeat(bus, prefix + (i + 1), i / 3 + 1, i % 3 + 1, seatType));
        }
    }

    /** 2 + 2 rows: 1A 1B | 1C 1D, 2A … until the seat count is reached. */
    private List<Seat> buildSeater(Bus bus, int total) {
        List<Seat> seats = new ArrayList<>();
        String[] cols = {"A", "B", "C", "D"};
        for (int i = 0; i < total; i++) {
            int row = i / 4 + 1;
            int col = i % 4;
            seats.add(buildSeat(bus, row + cols[col], row, col + 1, "SEATER"));
        }
        return seats;
    }

    private Seat buildSeat(Bus bus, String seatNumber, int row, int col, String seatType) {
        return Seat.builder()
                .bus(bus)
                .seatNumber(seatNumber)
                .rowNo(String.valueOf(row))
                .seatType(seatType)
                .seatPosition(Map.of("row", row, "col", col))
                .build();
    }
}

