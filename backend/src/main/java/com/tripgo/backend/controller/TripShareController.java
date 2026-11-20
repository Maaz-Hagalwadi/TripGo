package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Booking;
import com.tripgo.backend.model.entities.TripShareToken;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.repository.BookingRepository;
import com.tripgo.backend.repository.BusTrackingRepository;
import com.tripgo.backend.repository.TripShareTokenRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class TripShareController {

    private final BookingRepository bookingRepository;
    private final TripShareTokenRepository tokenRepository;
    private final BusTrackingRepository trackingRepository;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    // ─── POST /booking/{id}/share ─────────────────────────────────────────────
    @PostMapping("/booking/{bookingId}/share")
    public ResponseEntity<?> createShareLink(
            @PathVariable UUID bookingId,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getUser() == null || !booking.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only confirmed bookings can be shared"));
        }

        // Reuse an existing, non-expired token for this booking
        TripShareToken existing = tokenRepository.findTopByBookingIdOrderByCreatedAtDesc(bookingId).orElse(null);
        if (existing != null && existing.getExpiresAt().isAfter(Instant.now())) {
            return ResponseEntity.ok(buildTokenResponse(existing));
        }

        // Create a new token that expires 6 hours after the schedule's arrival time
        Instant arrival = booking.getRouteSchedule().getArrivalTime();
        Instant expiresAt = arrival.plus(6, ChronoUnit.HOURS);

        // If the trip is already past its extended window, still give 6h from now so the link isn't dead instantly
        if (expiresAt.isBefore(Instant.now())) {
            expiresAt = Instant.now().plus(6, ChronoUnit.HOURS);
        }

        TripShareToken token = tokenRepository.save(TripShareToken.builder()
                .token(UUID.randomUUID())
                .booking(booking)
                .expiresAt(expiresAt)
                .build());

        return ResponseEntity.ok(buildTokenResponse(token));
    }

    // ─── GET /trip-share/{token} (public) ─────────────────────────────────────
    @GetMapping("/trip-share/{token}")
    public ResponseEntity<?> getTripShare(@PathVariable UUID token) {
        TripShareToken shareToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        if (shareToken.getExpiresAt().isBefore(Instant.now())) {
            return ResponseEntity.status(410).body(Map.of("error", "This share link has expired"));
        }

        Booking booking = shareToken.getBooking();
        var schedule = booking.getRouteSchedule();
        var route = schedule.getRoute();
        var bus = schedule.getBus();

        Map<String, Object> location = trackingRepository
                .findTopByRouteScheduleIdOrderByRecordedAtDesc(schedule.getId())
                .<Map<String, Object>>map(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("latitude", t.getLatitude());
                    m.put("longitude", t.getLongitude());
                    m.put("speedKmph", t.getSpeedKmph() != null ? t.getSpeedKmph() : 0);
                    m.put("recordedAt", t.getRecordedAt().toString());
                    return m;
                })
                .orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bookingCode", booking.getBookingCode());
        result.put("from", route.getOrigin());
        result.put("to", route.getDestination());
        result.put("busName", bus != null ? bus.getName() : null);
        result.put("busCode", bus != null ? bus.getBusCode() : null);
        result.put("operatorName", route.getOperator() != null ? route.getOperator().getName() : null);
        result.put("departureTime", schedule.getDepartureTime().toString());
        result.put("arrivalTime", schedule.getArrivalTime().toString());
        result.put("tripStatus", schedule.getTripStatus() != null ? schedule.getTripStatus() : "SCHEDULED");
        result.put("delayMinutes", schedule.getDelayMinutes() != null ? schedule.getDelayMinutes() : 0);
        result.put("travelDate", booking.getTravelDate() != null ? booking.getTravelDate().toString() : null);
        result.put("liveLocation", location);
        result.put("expiresAt", shareToken.getExpiresAt().toString());

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> buildTokenResponse(TripShareToken token) {
        return Map.of(
                "token", token.getToken(),
                "url", frontendUrl + "/track/" + token.getToken(),
                "expiresAt", token.getExpiresAt().toString()
        );
    }
}
