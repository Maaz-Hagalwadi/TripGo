package com.tripgo.backend.controller;

import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.model.enums.OperatorStatus;
import com.tripgo.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

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
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAnalytics() {

        long totalUsers      = userRepository.count();
        long totalOperators  = operatorRepository.count();
        long activeOperators = operatorRepository.countByStatus(OperatorStatus.APPROVED);
        long activeBuses     = busRepository.countByActive(true);
        long totalBookings   = bookingRepository.countByStatus(BookingStatus.CONFIRMED);
        long totalCancelled  = bookingRepository.countByStatus(BookingStatus.CANCELLED);
        BigDecimal totalRevenue = bookingRepository.sumPayableAmountByStatus(BookingStatus.CONFIRMED);

        // ── Daily stats (last 30 days) — one DB query, one Java pass ────────
        Map<String, Long>       dailyBookings = new LinkedHashMap<>();
        Map<String, BigDecimal> dailyRevenue  = new LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            String key = LocalDate.now().minusDays(i).toString();
            dailyBookings.put(key, 0L);
            dailyRevenue.put(key, BigDecimal.ZERO);
        }
        Instant since = LocalDate.now().minusDays(29).atStartOfDay(ZoneOffset.UTC).toInstant();
        for (Object[] row : bookingRepository.findConfirmedStatsForPeriod(since)) {
            String day = ((Instant) row[0]).atZone(ZoneOffset.UTC).toLocalDate().toString();
            if (dailyBookings.containsKey(day)) {
                dailyBookings.merge(day, 1L, Long::sum);
                dailyRevenue.merge(day, (BigDecimal) row[1], BigDecimal::add);
            }
        }

        // ── Top operators — SQL GROUP BY, no entity loading ──────────────────
        Map<String, BigDecimal> revenueByOperator = new LinkedHashMap<>();
        for (Object[] row : bookingRepository.getRevenueGroupedByOperator()) {
            revenueByOperator.put((String) row[0], (BigDecimal) row[1]);
        }

        Map<String, Long> bookingsByOperator = new LinkedHashMap<>();
        for (Object[] row : bookingRepository.getBookingsCountGroupedByOperator()) {
            bookingsByOperator.put((String) row[0], (Long) row[1]);
        }

        // ── Top routes — SQL GROUP BY ────────────────────────────────────────
        Map<String, Long> topRoutes = new LinkedHashMap<>();
        for (Object[] row : bookingRepository.getTopRoutesByBookingCount()) {
            topRoutes.put(row[0] + " → " + row[1], (Long) row[2]);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalUsers",          totalUsers);
        result.put("totalOperators",      totalOperators);
        result.put("activeOperators",     activeOperators);
        result.put("activeBuses",         activeBuses);
        result.put("totalBookings",       totalBookings);
        result.put("totalCancelled",      totalCancelled);
        result.put("totalRevenue",        totalRevenue);
        result.put("dailyBookings",       dailyBookings);
        result.put("dailyRevenue",        dailyRevenue);
        result.put("revenueByOperator",   revenueByOperator);
        result.put("bookingsByOperator",  bookingsByOperator);
        result.put("topRoutes",           topRoutes);

        return ResponseEntity.ok(result);
    }
}
