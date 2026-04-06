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

    // GET /operator/reports/revenue
    @GetMapping("/revenue")
    public ResponseEntity<?> getRevenueReport(
            @RequestParam(required = false) String period, // daily, monthly, all
            @RequestParam(required = false) String date,   // YYYY-MM-DD for daily
            @RequestParam(required = false) String month,  // YYYY-MM for monthly
            Authentication auth) {

        Operator operator = getOperator(auth);
        List<Booking> allBookings = bookingRepository.findByOperatorAndStatus(operator, BookingStatus.CONFIRMED);

        // Total Revenue
        BigDecimal totalRevenue = allBookings.stream()
                .map(Booking::getPayableAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Per Route Revenue
        Map<String, BigDecimal> revenueByRoute = allBookings.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getRoute().getOrigin() + " → " +
                             b.getRouteSchedule().getRoute().getDestination(),
                        Collectors.reducing(BigDecimal.ZERO, Booking::getPayableAmount, BigDecimal::add)
                ));

        // Per Bus Revenue
        Map<String, BigDecimal> revenueByBus = allBookings.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getRouteSchedule().getBus().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Booking::getPayableAmount, BigDecimal::add)
                ));

        // Daily Revenue (last 7 days)
        Map<String, BigDecimal> dailyRevenue = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            Instant start = day.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant end = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

            BigDecimal dayRevenue = allBookings.stream()
                    .filter(b -> b.getCreatedAt().isAfter(start) && b.getCreatedAt().isBefore(end))
                    .map(Booking::getPayableAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            dailyRevenue.put(day.toString(), dayRevenue);
        }

        // Monthly Revenue (last 6 months)
        Map<String, BigDecimal> monthlyRevenue = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            Instant start = ym.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant end = ym.atEndOfMonth().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

            BigDecimal monthRevenue = allBookings.stream()
                    .filter(b -> b.getCreatedAt().isAfter(start) && b.getCreatedAt().isBefore(end))
                    .map(Booking::getPayableAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            monthlyRevenue.put(ym.toString(), monthRevenue);
        }

        return ResponseEntity.ok(Map.of(
                "totalRevenue", totalRevenue,
                "totalBookings", allBookings.size(),
                "revenueByRoute", revenueByRoute,
                "revenueByBus", revenueByBus,
                "dailyRevenue", dailyRevenue,
                "monthlyRevenue", monthlyRevenue
        ));
    }

    private Operator getOperator(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        if (user.getOperator() == null) throw new RuntimeException("Not an operator");
        return user.getOperator();
    }
}
