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

        List<Seat> seats = switch (template) {
            case "SLEEPER_2X1" -> buildSleeper(bus, rows);
            case "SEATER_2X2" -> buildSeater(bus, rows);
            default -> throw new RuntimeException("Invalid template");
        };

        seatRepository.saveAll(seats);
    }

    private List<Seat> buildSleeper(Bus bus, int rows) {
        List<Seat> seats = new ArrayList<>();
        int upperCounter = 1, lowerCounter = 1;

        for (int deck = 0; deck < 2; deck++) {
            for (int row = 1; row <= rows; row++) {
                for (int col = 1; col <= 3; col++) {
                    boolean isUpper = deck == 0;
                    String seatNumber = isUpper ? "U" + upperCounter++ : "L" + lowerCounter++;
                    seats.add(buildSeat(bus, seatNumber, row, col, isUpper ? "SLEEPER_UPPER" : "SLEEPER_LOWER"));
                }
            }
        }
        return seats;
    }

    private List<Seat> buildSeater(Bus bus, int rows) {
        List<Seat> seats = new ArrayList<>();
        String[] cols = {"A", "B", "C", "D"};
        for (int row = 1; row <= rows; row++) {
            for (int col = 0; col < cols.length; col++) {
                seats.add(buildSeat(bus, row + cols[col], row, col + 1, "SEATER"));
            }
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

