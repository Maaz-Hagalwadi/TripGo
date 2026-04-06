package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final BusRepository busRepository;
    private final RouteScheduleRepository scheduleRepository;

    // ─── OPERATOR: GET /operator/reviews ─────────────────────────────────────
    // All reviews for this operator's buses/routes
    @GetMapping("/operator/reviews")
    public ResponseEntity<?> getOperatorReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Operator operator = user.getOperator();
        if (operator == null) return ResponseEntity.status(403).body("Not an operator");

        Page<Review> reviews = reviewRepository.findByOperatorId(
                operator.getId(),
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );

        return ResponseEntity.ok(toPageResponse(reviews, true));
    }

    // ─── OPERATOR: GET /operator/buses/{busId}/reviews ────────────────────────
    @GetMapping("/operator/buses/{busId}/reviews")
    public ResponseEntity<?> getReviewsByBus(
            @PathVariable UUID busId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Operator operator = user.getOperator();
        if (operator == null) return ResponseEntity.status(403).body("Not an operator");

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new RuntimeException("Bus not found"));

        if (!bus.getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body("Not your bus");
        }

        Page<Review> reviews = reviewRepository.findByBusId(
                busId,
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );

        return ResponseEntity.ok(toPageResponse(reviews, true));
    }

    // ─── OPERATOR: GET /operator/schedules/{scheduleId}/reviews ──────────────
    @GetMapping("/operator/schedules/{scheduleId}/reviews")
    public ResponseEntity<?> getReviewsBySchedule(
            @PathVariable UUID scheduleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Operator operator = user.getOperator();
        if (operator == null) return ResponseEntity.status(403).body("Not an operator");

        Page<Review> reviews = reviewRepository.findByRouteScheduleId(
                scheduleId,
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );

        return ResponseEntity.ok(toPageResponse(reviews, true));
    }

    // ─── ADMIN: GET /admin/reviews ────────────────────────────────────────────
    @GetMapping("/admin/reviews")
    public ResponseEntity<?> getAllReviews(
            @RequestParam(required = false) UUID operatorId,
            @RequestParam(required = false) UUID busId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Boolean hidden,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Instant fromInstant = from != null ? Instant.parse(from) : null;
        Instant toInstant = to != null ? Instant.parse(to) : null;

        Page<Review> reviews = reviewRepository.findAllWithFilters(
                operatorId, busId, rating, fromInstant, toInstant, hidden,
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );

        return ResponseEntity.ok(toPageResponse(reviews, false));
    }

    // ─── ADMIN: PATCH /admin/reviews/{id}/hide ────────────────────────────────
    @PatchMapping("/admin/reviews/{id}/hide")
    public ResponseEntity<?> hideReview(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {

        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setHidden(true);
        review.setModerationStatus("HIDDEN");
        if (body != null && body.containsKey("reason")) {
            review.setFlaggedReason(body.get("reason"));
        }
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("message", "Review hidden", "id", id));
    }

    // ─── ADMIN: PATCH /admin/reviews/{id}/unhide ──────────────────────────────
    @PatchMapping("/admin/reviews/{id}/unhide")
    public ResponseEntity<?> unhideReview(@PathVariable UUID id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setHidden(false);
        review.setModerationStatus("APPROVED");
        review.setFlaggedReason(null);
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("message", "Review unhidden", "id", id));
    }

    // ─── Helper: build review map ─────────────────────────────────────────────
    private Map<String, Object> toReviewMap(Review r, boolean operatorView) {
        // Get bookingCode if available
        String bookingCode = null;
        String seatNumber = null;
        if (r.getUser() != null && r.getRouteSchedule() != null) {
            Optional<Booking> booking = bookingRepository.findConfirmedByUserAndSchedule(
                    r.getUser(), r.getRouteSchedule().getId());
            if (booking.isPresent()) {
                bookingCode = booking.get().getBookingCode();
            }
        }

        // Masked user name: "John D."
        String userName = "Anonymous";
        if (r.getUser() != null) {
            String first = r.getUser().getFirstName() != null ? r.getUser().getFirstName() : "";
            String last = r.getUser().getLastName() != null
                    ? r.getUser().getLastName().substring(0, 1) + "." : "";
            userName = (first + " " + last).trim();
        }

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("bookingCode", bookingCode);
        map.put("rating", r.getRating());
        map.put("title", r.getTitle());
        map.put("comment", r.getComment());
        map.put("createdAt", r.getCreatedAt());
        map.put("userName", userName);
        map.put("busId", r.getBus() != null ? r.getBus().getId() : null);
        map.put("busName", r.getBus() != null ? r.getBus().getName() : null);
        map.put("routeScheduleId", r.getRouteSchedule() != null ? r.getRouteSchedule().getId() : null);
        map.put("from", r.getRoute() != null ? r.getRoute().getOrigin() : null);
        map.put("to", r.getRoute() != null ? r.getRoute().getDestination() : null);

        if (!operatorView) {
            // Admin gets extra moderation fields
            map.put("operatorId", r.getOperator() != null ? r.getOperator().getId() : null);
            map.put("operatorName", r.getOperator() != null ? r.getOperator().getName() : null);
            map.put("userId", r.getUser() != null ? r.getUser().getId() : null);
            map.put("hidden", r.getHidden());
            map.put("moderationStatus", r.getModerationStatus());
            map.put("flaggedReason", r.getFlaggedReason());
        }

        return map;
    }

    private Map<String, Object> toPageResponse(Page<Review> page, boolean operatorView) {
        return Map.of(
                "content", page.getContent().stream()
                        .map(r -> toReviewMap(r, operatorView))
                        .toList(),
                "page", page.getNumber(),
                "size", page.getSize(),
                "totalElements", page.getTotalElements(),
                "totalPages", page.getTotalPages()
        );
    }
}
