package com.tripgo.backend.controller;

import com.tripgo.backend.config.AppTime;
import com.tripgo.backend.exception.BadRequestException;
import com.tripgo.backend.exception.ResourceNotFoundException;
import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.Driver;
import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.BookingSeatRepository;
import com.tripgo.backend.repository.BusDriverAssignmentRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import com.tripgo.backend.service.impl.EmailService;
import com.tripgo.backend.service.impl.NotificationService;
import com.tripgo.backend.service.impl.ScheduleRolloverService;
import com.tripgo.backend.model.enums.BookingStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Day-of-travel controls. "Start trip" means the bus has actually left: it closes the departure for
 * booking, so it is only allowed close to departure time and with a driver assigned.
 */
@Slf4j
@RestController
@RequestMapping("/operator/schedules")
@RequiredArgsConstructor
public class TripManagementController {

    /** How early before the scheduled departure an operator may start the trip. */
    private static final Duration START_WINDOW = Duration.ofHours(2);

    private final RouteScheduleRepository scheduleRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BusDriverAssignmentRepository assignmentRepository;
    private final ScheduleRolloverService rolloverService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    // POST /operator/schedules/{id}/start
    @PostMapping("/{scheduleId}/start")
    public ResponseEntity<?> startTrip(@PathVariable UUID scheduleId, Authentication auth) {
        RouteSchedule schedule = getOwnedSchedule(scheduleId, auth);

        if (!"SCHEDULED".equals(schedule.getTripStatus()) && !"DELAYED".equals(schedule.getTripStatus())) {
            throw new BadRequestException("This trip has already started or finished");
        }
        if (schedule.getBus() == null) {
            throw new BadRequestException("Assign a bus to this departure before starting it");
        }

        Driver driver = assignmentRepository.findByBusAndAssignedToIsNull(schedule.getBus())
                .map(a -> a.getDriver())
                .orElseThrow(() -> new BadRequestException("Assign a driver to " + schedule.getBus().getName() + " before starting the trip"));
        if (driver.getLicenseExpiry() != null && driver.getLicenseExpiry().isBefore(LocalDate.now(AppTime.ZONE))) {
            throw new BadRequestException("The assigned driver's licence has expired — assign another driver first");
        }

        Instant now = Instant.now();
        Instant earliest = schedule.getDepartureTime().minus(START_WINDOW);
        if (now.isBefore(earliest)) {
            throw new BadRequestException("You can start this trip from "
                    + DateTimeFormatter.ofPattern("d MMM, h:mm a").format(earliest.atZone(AppTime.ZONE))
                    + " (2 hours before departure). Starting it closes the bus for booking.");
        }
        if (now.isAfter(schedule.getArrivalTime())) {
            throw new BadRequestException("This departure's arrival time has already passed");
        }

        schedule.setTripStatus("STARTED");
        schedule.setActualDepartureTime(now);
        scheduleRepository.save(schedule);

        return ResponseEntity.ok(Map.of(
                "scheduleId", scheduleId,
                "tripStatus", "STARTED",
                "actualDepartureTime", schedule.getActualDepartureTime()
        ));
    }

    // POST /operator/schedules/{id}/complete
    @PostMapping("/{scheduleId}/complete")
    public ResponseEntity<?> completeTrip(@PathVariable UUID scheduleId, Authentication auth) {
        RouteSchedule schedule = getOwnedSchedule(scheduleId, auth);

        if (!"STARTED".equals(schedule.getTripStatus())) {
            throw new BadRequestException("Start the trip before completing it");
        }

        Instant now = Instant.now();
        schedule.setActualArrivalTime(now);
        scheduleRepository.save(schedule);

        // Same path as the automatic completion: marks it COMPLETED and creates the next departure for
        // recurring schedules (completing by hand used to end a daily service for good).
        rolloverService.completeAndRollOver(scheduleId, now);

        LocalDate runDate = schedule.getDepartureTime().atZone(AppTime.ZONE).toLocalDate();
        bookingRepository.findByRouteScheduleAndStatus(schedule, BookingStatus.CONFIRMED).stream()
                .filter(b -> b.getTravelDate() == null || b.getTravelDate().equals(runDate))
                .forEach(booking -> sendReviewPrompt(schedule, booking));

        return ResponseEntity.ok(Map.of(
                "scheduleId", scheduleId,
                "tripStatus", "COMPLETED",
                "actualArrivalTime", now
        ));
    }

    private void sendReviewPrompt(RouteSchedule schedule, Booking booking) {
        if (booking.getUser() == null) return; // guest bookings have no account to review from
        try {
            var seats = bookingSeatRepository.findByBookingId(booking.getId());
            String from = seats.isEmpty() ? schedule.getRoute().getOrigin() : seats.get(0).getFromStop();
            String to = seats.isEmpty() ? schedule.getRoute().getDestination() : seats.get(0).getToStop();

            notificationService.send(booking.getUser(),
                    "TRIP_COMPLETED",
                    "Trip Completed! Rate your experience ⭐",
                    "Your trip from " + from + " to " + to + " is complete. How was it?",
                    "/bookings?review=" + schedule.getId());

            emailService.sendTripCompletedReviewPrompt(
                    booking.getUser(), from, to,
                    schedule.getBus() != null ? schedule.getBus().getName() : "your bus",
                    schedule.getRoute().getOperator().getName(),
                    schedule.getId());
        } catch (Exception e) {
            log.warn("Review prompt failed for booking {}: {}", booking.getId(), e.getMessage());
        }
    }

    // PATCH /operator/schedules/{id}/delay
    @PatchMapping("/{scheduleId}/delay")
    public ResponseEntity<?> markDelay(
            @PathVariable UUID scheduleId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        RouteSchedule schedule = getOwnedSchedule(scheduleId, auth);

        if ("COMPLETED".equals(schedule.getTripStatus()) || "CANCELLED".equals(schedule.getTripStatus())) {
            throw new BadRequestException("This trip has already finished");
        }

        int delayMinutes = body.get("delayMinutes") instanceof Number n ? n.intValue() : -1;
        if (delayMinutes < 0 || delayMinutes > 24 * 60) {
            throw new BadRequestException("Delay must be between 0 and 1440 minutes");
        }
        String delayReason = body.get("delayReason") instanceof String s && !s.isBlank() ? s.trim() : "Unspecified";

        // A bus that is already on the road stays STARTED (it used to flip back to DELAYED and could be
        // "started" again); a delay of 0 clears it.
        if (!"STARTED".equals(schedule.getTripStatus())) {
            schedule.setTripStatus(delayMinutes > 0 ? "DELAYED" : "SCHEDULED");
        }
        schedule.setDelayMinutes(delayMinutes > 0 ? delayMinutes : null);
        schedule.setDelayReason(delayMinutes > 0 ? delayReason : null);
        scheduleRepository.save(schedule);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("scheduleId", scheduleId);
        res.put("tripStatus", schedule.getTripStatus());
        res.put("delayMinutes", delayMinutes);
        res.put("delayReason", schedule.getDelayReason());
        return ResponseEntity.ok(res);
    }

    private RouteSchedule getOwnedSchedule(UUID scheduleId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Operator operator = user.getOperator();

        if (operator == null) throw new AccessDeniedException("Not an operator");

        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found"));

        if (!schedule.getRoute().getOperator().getId().equals(operator.getId())) {
            throw new AccessDeniedException("Access denied");
        }

        return schedule;
    }
}
