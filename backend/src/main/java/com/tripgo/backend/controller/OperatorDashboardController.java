package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.BusRepository;
import com.tripgo.backend.repository.RouteRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/operator/dashboard")
@RequiredArgsConstructor
public class OperatorDashboardController {

    private final BookingRepository bookingRepository;
    private final BusRepository busRepository;
    private final RouteRepository routeRepository;

    @GetMapping
    public ResponseEntity<?> getDashboard(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Operator operator = user.getOperator();

        if (operator == null) {
            return ResponseEntity.status(403).body("Not an operator");
        }

        long totalBookings = bookingRepository.getTotalBookingsByOperator(operator);
        BigDecimal totalRevenue = bookingRepository.getTotalRevenueByOperator(operator);
        long confirmedBookings = bookingRepository.findByOperatorAndStatus(operator, BookingStatus.CONFIRMED).size();
        long cancelledBookings = bookingRepository.findByOperatorAndStatus(operator, BookingStatus.CANCELLED).size();
        long totalBuses = busRepository.findByOperator(operator).size();
        long totalRoutes = routeRepository.findByOperator(operator).size();

        return ResponseEntity.ok(Map.of(
                "totalBookings", totalBookings,
                "confirmedBookings", confirmedBookings,
                "cancelledBookings", cancelledBookings,
                "totalRevenue", totalRevenue,
                "totalBuses", totalBuses,
                "totalRoutes", totalRoutes
        ));
    }
}
