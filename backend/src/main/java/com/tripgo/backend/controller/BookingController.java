package com.tripgo.backend.controller;

import com.tripgo.backend.dto.response.BoardingDroppingPointResponse;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.Seat;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.BoardingDroppingPointRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.repository.SeatLockRepository;
import com.tripgo.backend.repository.SeatRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/booking")
@RequiredArgsConstructor
public class BookingController {

    private final RouteScheduleRepository scheduleRepo;
    private final SeatLockRepository lockRepo;
    private final SeatLockService lockService;
    private final SeatRepository seatRepository;
    private final BoardingDroppingPointRepository pointRepository;

    @GetMapping("/schedules/{scheduleId}/seats")
    public ResponseEntity<?> getSeatsForSchedule(@PathVariable UUID scheduleId) {
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<Seat> seats = seatRepository.findByBus(schedule.getBus());

        List<Map<String, Object>> seatDTOs = seats.stream().map(seat -> {
            boolean isLocked = lockRepo
                    .findByRouteScheduleIdAndSeatNumber(scheduleId, seat.getSeatNumber())
                    .filter(lock -> lock.getExpiresAt().isAfter(Instant.now()))
                    .isPresent();

            return Map.<String, Object>of(
                    "id", seat.getId(),
                    "seatNumber", seat.getSeatNumber(),
                    "seatType", seat.getSeatType(),
                    "isLadiesOnly", Boolean.TRUE.equals(seat.getIsLadiesOnly()),
                    "isWindow", Boolean.TRUE.equals(seat.getIsWindow()),
                    "isAisle", Boolean.TRUE.equals(seat.getIsAisle()),
                    "isBlocked", Boolean.TRUE.equals(seat.getIsBlocked()),
                    "available", !isLocked && !Boolean.TRUE.equals(seat.getIsBlocked())
            );
        }).toList();

        boolean isSeater = seats.stream().noneMatch(s -> s.getSeatNumber().startsWith("U"));

        if (isSeater) {
            return ResponseEntity.ok(Map.of(
                    "deck", "lower",
                    "seats", seatDTOs
            ));
        }

        return ResponseEntity.ok(Map.of(
                "upperDeck", seatDTOs.stream().filter(s -> s.get("seatNumber").toString().startsWith("U")).toList(),
                "lowerDeck", seatDTOs.stream().filter(s -> s.get("seatNumber").toString().startsWith("L")).toList()
        ));
    }

    @GetMapping("/schedules/{scheduleId}/points")
    public ResponseEntity<?> getBoardingDroppingPoints(@PathVariable UUID scheduleId) {
        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<BoardingDroppingPointResponse> points = pointRepository
                .findByScheduleOrderByTypeAscArrivalTimeAsc(schedule)
                .stream()
                .map(BoardingDroppingPointResponse::from)
                .toList();

        List<BoardingDroppingPointResponse> boardingPoints = points.stream()
                .filter(p -> "BOARDING".equals(p.type()))
                .toList();

        List<BoardingDroppingPointResponse> droppingPoints = points.stream()
                .filter(p -> "DROPPING".equals(p.type()))
                .toList();

        return ResponseEntity.ok(Map.of(
                "boardingPoints", boardingPoints,
                "droppingPoints", droppingPoints
        ));
    }

    @PostMapping("/lock")
    public Map<String, Object> lock(
            @RequestParam UUID scheduleId,
            @RequestBody List<String> seatNumbers,
            Authentication auth
    ) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        RouteSchedule schedule = scheduleRepo.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        UUID token = lockService.lockSeats(schedule, seatNumbers, user);

        return Map.of(
                "status", "LOCKED",
                "lockToken", token,
                "expiresInMinutes", 15
        );
    }
}
