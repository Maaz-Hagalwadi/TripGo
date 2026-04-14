package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping("/operator")
@RequiredArgsConstructor
public class BusInsightsController {

    private final BusRepository busRepository;
    private final RouteScheduleRepository scheduleRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;

    // PATCH /operator/buses/{id}/toggle-status
    @PatchMapping("/buses/{busId}/toggle-status")
    public ResponseEntity<?> toggleBusStatus(@PathVariable UUID busId, Authentication auth) {
        Operator operator = getOperator(auth);

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        if (!bus.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        bus.setActive(!bus.isActive());
        busRepository.save(bus);

        return ResponseEntity.ok(Map.of(
                "busId", busId,
                "busName", bus.getName(),
                "active", bus.isActive(),
                "message", bus.isActive() ? "Bus is now active" : "Bus is now inactive"
        ));
    }

    // GET /operator/buses/{id}/occupancy - Seat occupancy for a bus
    @GetMapping("/buses/{busId}/occupancy")
    public ResponseEntity<?> getBusOccupancy(@PathVariable UUID busId, Authentication auth) {
        Operator operator = getOperator(auth);

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        if (!bus.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        int totalSeats = seatRepository.findByBus(bus).size();

        // Get all schedules for this bus
        List<RouteSchedule> busSchedules = scheduleRepository.findAll().stream()
                .filter(s -> s.getBus() != null && s.getBus().getId().equals(busId))
                .toList();

        List<Map<String, Object>> scheduleOccupancy = busSchedules.stream().map(schedule -> {
            List<BookingSeat> bookedSeats = bookingSeatRepository.findByRouteSchedule(schedule);
            int bookedCount = bookedSeats.size();
            double occupancyPercent = totalSeats > 0 ?
                    BigDecimal.valueOf((double) bookedCount / totalSeats * 100)
                            .setScale(1, RoundingMode.HALF_UP).doubleValue() : 0;

            return (Map<String, Object>) new HashMap<String, Object>(Map.of(
                    "scheduleId", schedule.getId(),
                    "from", schedule.getRoute().getOrigin(),
                    "to", schedule.getRoute().getDestination(),
                    "departureTime", schedule.getDepartureTime(),
                    "totalSeats", totalSeats,
                    "bookedSeats", bookedCount,
                    "availableSeats", totalSeats - bookedCount,
                    "occupancyPercent", occupancyPercent
            ));
        }).toList();

        return ResponseEntity.ok(Map.of(
                "busId", busId,
                "busName", bus.getName(),
                "totalSeats", totalSeats,
                "schedules", scheduleOccupancy
        ));
    }

    // GET /operator/insights - Popular routes and overall occupancy
    @GetMapping("/insights")
    public ResponseEntity<?> getInsights(Authentication auth) {
        Operator operator = getOperator(auth);

        List<Bus> buses = busRepository.findByOperator(operator);

        // Per bus occupancy summary
        List<Map<String, Object>> busInsights = buses.stream().map(bus -> {
            int totalSeats = seatRepository.findByBus(bus).size();

            List<RouteSchedule> busSchedules = scheduleRepository.findAll().stream()
                    .filter(s -> s.getBus() != null && s.getBus().getId().equals(bus.getId()))
                    .toList();

            int totalBooked = busSchedules.stream()
                    .mapToInt(s -> bookingSeatRepository.findByRouteSchedule(s).size())
                    .sum();

            int totalCapacity = totalSeats * busSchedules.size();
            double occupancy = totalCapacity > 0 ?
                    BigDecimal.valueOf((double) totalBooked / totalCapacity * 100)
                            .setScale(1, RoundingMode.HALF_UP).doubleValue() : 0;

            return (Map<String, Object>) new HashMap<String, Object>(Map.of(
                    "busId", bus.getId(),
                    "busName", bus.getName(),
                    "totalSchedules", busSchedules.size(),
                    "totalBooked", totalBooked,
                    "occupancyPercent", occupancy,
                    "active", bus.isActive()
            ));
        }).toList();

        // Popular routes by booking count
        Map<String, Long> routePopularity = bookingRepository.findByOperator(operator).stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        b -> b.getRouteSchedule().getRoute().getOrigin() + " → " +
                             b.getRouteSchedule().getRoute().getDestination(),
                        java.util.stream.Collectors.counting()
                ));

        return ResponseEntity.ok(Map.of(
                "busInsights", busInsights,
                "popularRoutes", routePopularity
        ));
    }

    private Operator getOperator(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        if (user.getOperator() == null) throw new RuntimeException("Not an operator");
        return user.getOperator();
    }
}
