package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.CancelledBy;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.CancellationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/booking")
@RequiredArgsConstructor
public class CancellationController {

    private final BookingRepository bookingRepository;
    private final CancellationService cancellationService;

    // User cancels their own booking
    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<?> userCancel(
            @PathVariable UUID bookingId,
            @RequestBody Map<String, String> body,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        String reason = body.getOrDefault("reason", "Cancelled by user");
        BigDecimal refundAmount = cancellationService.cancel(booking, CancelledBy.USER, reason);

        return ResponseEntity.ok(Map.of(
                "message", "Booking cancelled successfully",
                "bookingCode", booking.getBookingCode(),
                "refundAmount", refundAmount,
                "refundStatus", booking.getRefundStatus()
        ));
    }

    // Operator cancels a booking on their route
    @PostMapping("/{bookingId}/operator-cancel")
    public ResponseEntity<?> operatorCancel(
            @PathVariable UUID bookingId,
            @RequestBody Map<String, String> body,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Operator operator = user.getOperator();

        if (operator == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Not an operator"));
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        String reason = body.get("reason");
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cancellation reason is required"));
        }
        BigDecimal refundAmount = cancellationService.cancel(booking, CancelledBy.OPERATOR, reason);

        return ResponseEntity.ok(Map.of(
                "message", "Booking cancelled successfully",
                "bookingCode", booking.getBookingCode(),
                "refundAmount", refundAmount,
                "refundStatus", booking.getRefundStatus()
        ));
    }
}
