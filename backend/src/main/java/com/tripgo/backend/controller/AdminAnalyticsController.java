package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.model.enums.OperatorStatus;
import com.tripgo.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final BookingRepository   bookingRepository;
    private final UserRepository      userRepository;
    private final OperatorRepository  operatorRepository;
    private final BusRepository       busRepository;

    @GetMapping
    public ResponseEntity<?> getAnalytics() {

        List<Booking> allBookings = bookingRepository.findAll();
        List<Booking> confirmed  = allBookings.stream().filter(b -> b.getStatus() == BookingStatus.CONFIRMED).toList();
        List<Booking> cancelled  = allBookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).toList();

        BigDecimal totalRevenue = confirmed.stream()
                .map(Booking::getPayableAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalUsers      = userRepository.count();
        long totalOperators  = operatorRepository.count();
        long activeOperators = operatorRepository.findByStatus(OperatorStatus.APPROVED).size();
        long activeBuses     = busRepository.findAll().stream().filter(b -> b.isActive()).count();

        // ── Daily stats (last 30 days) ───────────────────────────────────────
        Map<String, Long>       dailyBookings = new LinkedHashMap<>();
        Map<String, BigDecimal> dailyRevenue  = new LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate day   = LocalDate.now().minusDays(i);
            Instant   start = day.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant   end   = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            String    key   = day.toString();

            long cnt = confirmed.stream()
                    .filter(b -> !b.getCreatedAt().isBefore(start) && b.getCreatedAt().isBefore(end))
                    .count();
            BigDecimal rev = confirmed.stream()
                    .filter(b -> !b.getCreatedAt().isBefore(start) && b.getCreatedAt().isBefore(end))
                    .map(Booking::getPayableAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            dailyBookings.put(key, cnt);
            dailyRevenue.put(key, rev);
        }

        // ── Top operators ────────────────────────────────────────────────────
        Map<String, BigDecimal> revenueByOperator = confirmed.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getBus().getOperator().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Booking::getPayableAmount, BigDecimal::add)
                ));

        Map<String, Long> bookingsByOperator = confirmed.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getBus().getOperator().getName(),
                        Collectors.counting()
                ));

        // ── Top routes ───────────────────────────────────────────────────────
        Map<String, Long> topRoutes = confirmed.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getRoute().getOrigin() + " → " +
                             b.getRouteSchedule().getRoute().getDestination(),
                        Collectors.counting()
                ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalUsers",          totalUsers);
        result.put("totalOperators",      totalOperators);
        result.put("activeOperators",     activeOperators);
        result.put("activeBuses",         activeBuses);
        result.put("totalBookings",       confirmed.size());
        result.put("totalCancelled",      cancelled.size());
        result.put("totalRevenue",        totalRevenue);
        result.put("dailyBookings",       dailyBookings);
        result.put("dailyRevenue",        dailyRevenue);
        result.put("revenueByOperator",   revenueByOperator);
        result.put("bookingsByOperator",  bookingsByOperator);
        result.put("topRoutes",           topRoutes);

        return ResponseEntity.ok(result);
    }
}
