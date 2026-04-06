package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.BookingSeatRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/operator")
@RequiredArgsConstructor
public class OperatorBookingController {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final RouteScheduleRepository scheduleRepository;

    // GET /operator/bookings - All bookings for operator
    @GetMapping("/bookings")
    public ResponseEntity<?> getAllBookings(
            @RequestParam(required = false) String status,
            Authentication auth) {

        Operator operator = getOperator(auth);

        List<Booking> bookings = (status != null)
                ? bookingRepository.findByOperatorAndStatus(operator, BookingStatus.valueOf(status))
                : bookingRepository.findByOperator(operator);

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
                ? bookingRepository.findByRouteScheduleAndStatus(schedule, BookingStatus.valueOf(status))
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
                    Map<String, Object> seatMap = new java.util.HashMap<>();
                    seatMap.put("seatNumber", seat.getSeatNumber());
                    seatMap.put("fare", seat.getFare());
                    seatMap.put("fromStop", seat.getFromStop());
                    seatMap.put("toStop", seat.getToStop());

                    if (seat.getPassenger() != null) {
                        seatMap.put("passenger", Map.of(
                                "name", seat.getPassenger().getFirstName() + " " +
                                        (seat.getPassenger().getLastName() != null ? seat.getPassenger().getLastName() : ""),
                                "age", seat.getPassenger().getAge() != null ? seat.getPassenger().getAge() : "",
                                "gender", seat.getPassenger().getGender() != null ? seat.getPassenger().getGender() : "",
                                "phone", seat.getPassenger().getPhone() != null ? seat.getPassenger().getPhone() : ""
                        ));
                    }
                    return seatMap;
                }).toList();

        return Map.of(
                "bookingId", booking.getId(),
                "status", booking.getStatus(),
                "totalAmount", booking.getTotalAmount(),
                "gstAmount", booking.getGstAmount() != null ? booking.getGstAmount() : 0,
                "payableAmount", booking.getPayableAmount(),
                "bookedAt", booking.getCreatedAt(),
                "schedule", Map.of(
                        "id", booking.getRouteSchedule().getId(),
                        "from", booking.getRouteSchedule().getRoute().getOrigin(),
                        "to", booking.getRouteSchedule().getRoute().getDestination(),
                        "departureTime", booking.getRouteSchedule().getDepartureTime()
                ),
                "seats", seatDetails
        );
    }

    private Operator getOperator(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        if (user.getOperator() == null) {
            throw new RuntimeException("Not an operator");
        }
        return user.getOperator();
    }
}
