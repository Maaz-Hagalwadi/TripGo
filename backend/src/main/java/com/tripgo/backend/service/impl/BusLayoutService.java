package com.tripgo.backend.service.impl;

import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Seat;
import com.tripgo.backend.repository.BusRepository;
import com.tripgo.backend.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusLayoutService {

    private final SeatRepository seatRepository;
    private final BusRepository busRepository;

    public void generateLayout(UUID busId, String template, int rows) {

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        switch (template) {
            case "SLEEPER_2X1" -> generateSleeper(bus, rows);
            case "SEATER_2X2" -> generateSeater(bus, rows);
            default -> throw new RuntimeException("Invalid template");
        }
    }

    private void generateSleeper(Bus bus, int rows) {
        int upperCounter = 1;
        int lowerCounter = 1;

        for (int deck = 0; deck < 2; deck++) { // 0=Upper, 1=Lower
            for (int row = 1; row <= rows; row++) {

                // Left sleeper (1 bed)
                storeSeat(bus,
                        deck == 0 ? "U" + upperCounter++ : "L" + lowerCounter++,
                        row, 1, deck == 0);

                // Right sleeper (2 beds)
                storeSeat(bus,
                        deck == 0 ? "U" + upperCounter++ : "L" + lowerCounter++,
                        row, 2, deck == 0);

                storeSeat(bus,
                        deck == 0 ? "U" + upperCounter++ : "L" + lowerCounter++,
                        row, 3, deck == 0);
            }
        }
    }

    private void generateSeater(Bus bus, int rows) {
        for (int row = 1; row <= rows; row++) {
            storeSeat(bus, row + "A", row, 1, false);
            storeSeat(bus, row + "B", row, 2, false);
            storeSeat(bus, row + "C", row, 3, false);
            storeSeat(bus, row + "D", row, 4, false);
        }
    }

    private void storeSeat(Bus bus, String seatNumber, int row, int col, boolean upperDeck) {
        Seat seat = Seat.builder()
                .bus(bus)
                .seatNumber(seatNumber)
                .rowNo(String.valueOf(row))
                .seatType(upperDeck ? "SLEEPER_UPPER" : "SLEEPER_LOWER")
                .seatPosition(Map.of(
                        "row", row,
                        "col", col,
                        "deck", upperDeck ? "UPPER" : "LOWER"
                ))
                .build();

        seatRepository.save(seat);
    }
}

