package com.tripgo.backend.controller;

import com.tripgo.backend.dto.request.RescheduleRequest;
import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.BookingSeat;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.SeatLock;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.BookingSeatRepository;
import com.tripgo.backend.repository.SchedulePolicyRepository;
import com.tripgo.backend.repository.SeatLockRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/booking")
@RequiredArgsConstructor
public class RescheduleController {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SchedulePolicyRepository schedulePolicyRepository;
    private final SeatLockRepository seatLockRepository;
    private final EmailService emailService;

    @PostMapping("/{bookingId}/reschedule")
    public ResponseEntity<?> reschedule(
            @PathVariable UUID bookingId,
            @RequestBody RescheduleRequest request,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only confirmed bookings can be rescheduled"));
        }

        if (request.getNewTravelDate() == null || request.getNewSeatNumbers() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "New travel date and seat numbers are required"));
        }

        var policy = schedulePolicyRepository.findByScheduleId(booking.getRouteSchedule().getId()).orElse(null);

        if (policy != null && Boolean.FALSE.equals(policy.getDateChangeAllowed())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rescheduling is not allowed for this route"));
        }

        // Time-window check against current departure
        RouteSchedule sched = booking.getRouteSchedule();
        LocalTime deptTime = LocalDateTime.ofInstant(sched.getDepartureTime(), ZoneOffset.UTC).toLocalTime();
        Instant currentDeparture = booking.getTravelDate().atTime(deptTime).toInstant(ZoneOffset.UTC);
        long hoursLeft = Duration.between(Instant.now(), currentDeparture).toHours();
        int minHours = (policy != null && policy.getDateChangeMinHours() != null) ? policy.getDateChangeMinHours() : 12;

        if (hoursLeft < minHours) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Rescheduling window has closed. Must reschedule at least " + minHours + " hours before departure."
            ));
        }

        // Seat count must match original
        List<BookingSeat> currentSeats = bookingSeatRepository.findByBookingId(bookingId);
        List<String> newSeatNumbers = request.getNewSeatNumbers();
        if (newSeatNumbers.size() != currentSeats.size()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Please select exactly " + currentSeats.size() + " seat(s)"
            ));
        }

        // No duplicate seat numbers
        if (newSeatNumbers.stream().distinct().count() != newSeatNumbers.size()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Duplicate seat numbers selected"));
        }

        // Availability check on new date (exclude current booking to handle same-date reschedule)
        Set<String> lockedSeats = seatLockRepository
                .findByRouteScheduleIdAndTravelDate(sched.getId(), request.getNewTravelDate())
                .stream().map(SeatLock::getSeatNumber).collect(Collectors.toSet());

        for (String seatNum : newSeatNumbers) {
            if (lockedSeats.contains(seatNum)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Seat " + seatNum + " is temporarily locked. Please try again shortly."
                ));
            }
            if (bookingSeatRepository.existsByRouteScheduleIdAndSeatNumberExcluding(
                    sched.getId(), seatNum, request.getNewTravelDate(), bookingId)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Seat " + seatNum + " is not available on the selected date"
                ));
            }
        }

        // Apply: update seat numbers (preserve passenger order) and travel date
        for (int i = 0; i < currentSeats.size(); i++) {
            currentSeats.get(i).setSeatNumber(newSeatNumbers.get(i));
        }
        booking.setTravelDate(request.getNewTravelDate());
        bookingSeatRepository.saveAll(currentSeats);
        bookingRepository.save(booking);

        emailService.sendRescheduleConfirmation(user, booking, currentSeats);

        return ResponseEntity.ok(Map.of(
                "message", "Booking rescheduled successfully",
                "bookingCode", booking.getBookingCode(),
                "newTravelDate", request.getNewTravelDate().toString()
        ));
    }
}
