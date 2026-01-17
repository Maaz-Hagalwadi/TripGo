package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.GenerateLayoutRequest;
import com.tripgo.backend.model.entities.Bus;
import com.tripgo.backend.model.entities.Seat;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.BusRepository;
import com.tripgo.backend.repository.SeatRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.dto.response.SeatResponse;
import com.tripgo.backend.service.impl.BusLayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/operator/buses")
@RequiredArgsConstructor
public class BusLayoutController {

    private final BusLayoutService busLayoutService;
    private final SeatRepository seatRepository;
    private final BusRepository busRepository;


    @PostMapping("/{busId}/layout/generate")
    public ResponseEntity<?> generate(
            @PathVariable UUID busId,
            @RequestBody GenerateLayoutRequest req,
            Authentication auth) {

        busLayoutService.generateLayout(busId, req.template(), req.rows());

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Layout generated"
        ));
    }

    @GetMapping("/{busId}/seats")
    public ResponseEntity<?> getSeats(@PathVariable UUID busId, Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        // Ownership check
        if (user.getOperator() == null ||
                !bus.getOperator().getId().equals(user.getOperator().getId())) {
            return ResponseEntity.status(403).body("Not your bus");
        }

        List<Seat> seats = seatRepository.findByBus(bus);

        // Convert to DTOs
        List<SeatResponse> seatDTOs = seats.stream()
                .map(seat -> new SeatResponse(
                        seat.getId(),
                        seat.getSeatNumber(),
                        seat.getSeatType(),
                        true  // For now, assume all seats are available
                ))
                .toList();

        // Detect SEATER (no Upper deck seats)
        boolean isSeater = seats.stream().noneMatch(s -> s.getSeatNumber().startsWith("U"));

        if (isSeater) {
            // Single deck for seater
            return ResponseEntity.ok(Map.of(
                    "deck", "lower",
                    "seats", seatDTOs
            ));
        }

        // Sleeper bus → return upper + lower
        return ResponseEntity.ok(Map.of(
                "upperDeck", seatDTOs.stream().filter(s -> s.seatNumber().startsWith("U")).toList(),
                "lowerDeck", seatDTOs.stream().filter(s -> s.seatNumber().startsWith("L")).toList()
        ));
    }
}