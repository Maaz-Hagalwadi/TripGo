package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.BookingSeatRepository;
import com.tripgo.backend.repository.PaymentRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/operator")
@RequiredArgsConstructor
public class OperatorBookingController {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final RouteScheduleRepository scheduleRepository;
    private final PaymentRepository paymentRepository;

    // GET /operator/bookings - All bookings for operator
    @GetMapping("/bookings")
    public ResponseEntity<?> getAllBookings(
            @RequestParam(required = false) String status,
            Authentication auth) {

        Operator operator = getOperator(auth);

        List<Booking> bookings = (status != null)
                ? safeParseStatus(status).map(s -> bookingRepository.findByOperatorAndStatus(operator, s))
                        .orElse(List.of())
                : bookingRepository.findByOperator(operator).stream()
                        .filter(b -> b.getStatus() != BookingStatus.PENDING
                                  && b.getStatus() != BookingStatus.FAILED)
                        .toList();

        return ResponseEntity.ok(bookings.stream().map(this::toBookingResponse).toList());
    }

    // GET /operator/schedules/{id}/bookings - Bookings for specific schedule
    @GetMapping("/schedules/{scheduleId}/bookings")
    public ResponseEntity<?> getScheduleBookings(
            @PathVariable UUID scheduleId,
            @RequestParam(required = false) String status,
            Authentication auth) {

        Operator operator = getOperator(auth);

        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (!schedule.getRoute().getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        List<Booking> bookings = (status != null)
                ? safeParseStatus(status).map(s -> bookingRepository.findByRouteScheduleAndStatus(schedule, s))
                        .orElse(List.of())
                : bookingRepository.findByRouteSchedule(schedule);

        return ResponseEntity.ok(bookings.stream().map(this::toBookingResponse).toList());
    }

    // PATCH /operator/bookings/{id}/cancel - Cancel a booking
    @PatchMapping("/bookings/{bookingId}/cancel")
    public ResponseEntity<?> cancelBooking(
            @PathVariable UUID bookingId,
            Authentication auth) {

        Operator operator = getOperator(auth);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return ResponseEntity.badRequest().body(Map.of("message", "Booking already cancelled"));
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of(
                "message", "Booking cancelled successfully",
                "bookingId", bookingId,
                "status", "CANCELLED",
                "refundStatus", "PENDING"
        ));
    }

    private Map<String, Object> toBookingResponse(Booking booking) {
        List<BookingSeat> seats = bookingSeatRepository.findByRouteSchedule(booking.getRouteSchedule());

        List<Map<String, Object>> seatDetails = seats.stream()
                .filter(s -> s.getBooking().getId().equals(booking.getId()))
                .map(seat -> {
                    Map<String, Object> seatMap = new LinkedHashMap<>();
                    seatMap.put("seatNumber", seat.getSeatNumber());
                    seatMap.put("fare", seat.getFare());
                    seatMap.put("fromStop", seat.getFromStop());
                    seatMap.put("toStop", seat.getToStop());
                    if (seat.getPassenger() != null) {
                        seatMap.put("passenger", Map.of(
                                "firstName", seat.getPassenger().getFirstName(),
                                "lastName", seat.getPassenger().getLastName() != null ? seat.getPassenger().getLastName() : "",
                                "age", seat.getPassenger().getAge() != null ? seat.getPassenger().getAge() : "",
                                "gender", seat.getPassenger().getGender() != null ? seat.getPassenger().getGender() : "",
                                "phone", seat.getPassenger().getPhone() != null ? seat.getPassenger().getPhone() : ""
                        ));
                    }
                    return seatMap;
                }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bookingId", booking.getId());
        result.put("bookingCode", booking.getBookingCode());
        result.put("status", booking.getStatus());

        paymentRepository.findTopByBookingOrderByCreatedAtDesc(booking).ifPresentOrElse(payment -> {
            result.put("paymentStatus", payment.getStatus());
            result.put("paymentIntentId", payment.getProviderTransactionId());
            result.put("paidAt", payment.getStatus().name().equals("SUCCESS") ? payment.getUpdatedAt() : null);
        }, () -> {
            result.put("paymentStatus", null);
            result.put("paymentIntentId", null);
            result.put("paidAt", null);
        });
        result.put("from", booking.getRouteSchedule().getRoute().getOrigin());
        result.put("to", booking.getRouteSchedule().getRoute().getDestination());
        result.put("seatNumbers", seatDetails.stream().map(s -> s.get("seatNumber")).toList());
        result.put("passengers", seatDetails.stream().map(s -> s.get("passenger")).filter(Objects::nonNull).toList());
        result.put("totalAmount", booking.getTotalAmount());
        result.put("gstAmount", booking.getGstAmount() != null ? booking.getGstAmount() : 0);
        result.put("payableAmount", booking.getPayableAmount());
        result.put("bookedAt", booking.getCreatedAt());
        result.put("cancelledBy", booking.getCancelledBy());
        result.put("cancelReason", booking.getCancelReason());
        result.put("refundAmount", booking.getRefundAmount());
        result.put("refundStatus", booking.getRefundStatus());
        result.put("schedule", Map.of(
                "id", booking.getRouteSchedule().getId(),
                "from", booking.getRouteSchedule().getRoute().getOrigin(),
                "to", booking.getRouteSchedule().getRoute().getDestination(),
                "departureTime", booking.getRouteSchedule().getDepartureTime()
        ));
        result.put("seats", seatDetails);
        return result;
    }

    private java.util.Optional<BookingStatus> safeParseStatus(String status) {
        try {
            return java.util.Optional.of(BookingStatus.valueOf(status.toUpperCase()));
        } catch (IllegalArgumentException e) {
            return java.util.Optional.empty();
        }
    }

    private Operator getOperator(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        if (user.getOperator() == null) {
            throw new RuntimeException("Not an operator");
        }
        return user.getOperator();
    }
}
