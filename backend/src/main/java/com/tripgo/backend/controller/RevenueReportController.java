package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.RouteRepository;
import com.tripgo.backend.repository.BusRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/operator/reports")
@RequiredArgsConstructor
public class RevenueReportController {

    private final BookingRepository bookingRepository;
    private final RouteRepository routeRepository;
    private final BusRepository busRepository;

    @GetMapping("/revenue")
    public ResponseEntity<?> getRevenueReport(Authentication auth) {

        Operator operator = getOperator(auth);
        List<Booking> confirmed  = bookingRepository.findByOperatorAndStatus(operator, BookingStatus.CONFIRMED);
        List<Booking> cancelled  = bookingRepository.findByOperatorAndStatus(operator, BookingStatus.CANCELLED);

        // ── Totals ──────────────────────────────────────────────────────────
        BigDecimal totalRevenue = confirmed.stream()
                .map(Booking::getPayableAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalBookings  = confirmed.size();
        int totalCancelled = cancelled.size();
        int totalAll       = totalBookings + totalCancelled;
        double cancellationRate = totalAll > 0
                ? BigDecimal.valueOf(totalCancelled * 100.0 / totalAll)
                             .setScale(1, RoundingMode.HALF_UP)
                             .doubleValue()
                : 0.0;

        // ── Revenue by route & bus ───────────────────────────────────────────
        Map<String, BigDecimal> revenueByRoute = confirmed.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getRoute().getOrigin() + " → " +
                             b.getRouteSchedule().getRoute().getDestination(),
                        Collectors.reducing(BigDecimal.ZERO, Booking::getPayableAmount, BigDecimal::add)
                ));

        Map<String, BigDecimal> revenueByBus = confirmed.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getBus().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Booking::getPayableAmount, BigDecimal::add)
                ));

        // ── Bookings per route (count) ───────────────────────────────────────
        Map<String, Long> bookingsByRoute = confirmed.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getRoute().getOrigin() + " → " +
                             b.getRouteSchedule().getRoute().getDestination(),
                        Collectors.counting()
                ));

        // ── Daily revenue & booking count (last 30 days) ─────────────────────
        Map<String, BigDecimal> dailyRevenue   = new LinkedHashMap<>();
        Map<String, Long>       dailyBookings  = new LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate day   = LocalDate.now().minusDays(i);
            Instant   start = day.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant   end   = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            String    key   = day.toString();

            BigDecimal rev = confirmed.stream()
                    .filter(b -> !b.getCreatedAt().isBefore(start) && b.getCreatedAt().isBefore(end))
                    .map(Booking::getPayableAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long cnt = confirmed.stream()
                    .filter(b -> !b.getCreatedAt().isBefore(start) && b.getCreatedAt().isBefore(end))
                    .count();

            dailyRevenue.put(key, rev);
            dailyBookings.put(key, cnt);
        }

        // ── Monthly revenue (last 12 months) ────────────────────────────────
        Map<String, BigDecimal> monthlyRevenue = new LinkedHashMap<>();
        for (int i = 11; i >= 0; i--) {
            YearMonth ym    = YearMonth.now().minusMonths(i);
            Instant   start = ym.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant   end   = ym.atEndOfMonth().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

            BigDecimal rev = confirmed.stream()
                    .filter(b -> !b.getCreatedAt().isBefore(start) && b.getCreatedAt().isBefore(end))
                    .map(Booking::getPayableAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            monthlyRevenue.put(ym.toString(), rev);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenue",      totalRevenue);
        result.put("totalBookings",     totalBookings);
        result.put("totalCancelled",    totalCancelled);
        result.put("cancellationRate",  cancellationRate);
        result.put("revenueByRoute",    revenueByRoute);
        result.put("revenueByBus",      revenueByBus);
        result.put("bookingsByRoute",   bookingsByRoute);
        result.put("dailyRevenue",      dailyRevenue);
        result.put("monthlyRevenue",    monthlyRevenue);
        result.put("dailyBookings",     dailyBookings);

        return ResponseEntity.ok(result);
    }

    private Operator getOperator(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        if (user.getOperator() == null) throw new RuntimeException("Not an operator");
        return user.getOperator();
    }
}
