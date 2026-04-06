package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.model.enums.BookingStatus;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequiredArgsConstructor
public class RatingController {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final RouteScheduleRepository scheduleRepository;
    private final BusRepository busRepository;

    // POST /booking/trips/{scheduleId}/rating
    @PostMapping("/booking/trips/{scheduleId}/rating")
    public ResponseEntity<?> submitRating(
            @PathVariable UUID scheduleId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        // Check if user has a completed booking for this schedule
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        boolean hasCompletedBooking = bookingRepository
                .findByUserAndStatus(user, BookingStatus.CONFIRMED)
                .stream()
                .anyMatch(b -> b.getRouteSchedule().getId().equals(scheduleId));

        if (!hasCompletedBooking) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "You can only rate trips you have completed"));
        }

        if (reviewRepository.existsByUserIdAndRouteScheduleId(user.getId(), scheduleId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "You have already rated this trip"));
        }

        Integer rating = (Integer) body.get("rating");
        String title = (String) body.getOrDefault("title", "");
        String comment = (String) body.getOrDefault("comment", "");

        if (rating == null || rating < 1 || rating > 5) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Rating must be between 1 and 5"));
        }

        Review review = Review.builder()
                .user(user)
                .routeSchedule(schedule)
                .bus(schedule.getBus())
                .route(schedule.getRoute())
                .operator(schedule.getRoute().getOperator())
                .rating(rating)
                .title(title)
                .comment(comment)
                .build();

        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of(
                "message", "Rating submitted successfully",
                "rating", rating
        ));
    }

    // GET /buses/{busId}/rating-summary
    @GetMapping("/buses/{busId}/rating-summary")
    public ResponseEntity<?> getRatingSummary(@PathVariable UUID busId) {
        List<Review> reviews = reviewRepository.findByBusId(busId);

        if (reviews.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "averageRating", 0,
                    "totalRatings", 0,
                    "breakdown", Map.of()
            ));
        }

        double avg = reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0);

        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            final int star = i;
            breakdown.put(star, reviews.stream().filter(r -> r.getRating() == star).count());
        }

        List<Map<String, Object>> recentReviews = reviews.stream()
                .sorted(Comparator.comparing(Review::getCreatedAt).reversed())
                .limit(5)
                .map(r -> Map.<String, Object>of(
                        "id", r.getId(),
                        "rating", r.getRating(),
                        "title", r.getTitle() != null ? r.getTitle() : "",
                        "comment", r.getComment() != null ? r.getComment() : "",
                        "createdAt", r.getCreatedAt()
                ))
                .toList();

        return ResponseEntity.ok(Map.of(
                "averageRating", Math.round(avg * 10.0) / 10.0,
                "totalRatings", reviews.size(),
                "breakdown", breakdown,
                "recentReviews", recentReviews
        ));
    }

    // GET /booking/my-completed-trips
    @GetMapping("/booking/my-completed-trips")
    public ResponseEntity<?> getCompletedTrips(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        List<Map<String, Object>> trips = bookingRepository
                .findByUserAndStatus(user, BookingStatus.CONFIRMED)
                .stream()
                .map(b -> {
                    RouteSchedule s = b.getRouteSchedule();
                    boolean alreadyRated = reviewRepository
                            .existsByUserIdAndRouteScheduleId(user.getId(), s.getId());
                    return Map.<String, Object>of(
                            "bookingId", b.getId(),
                            "scheduleId", s.getId(),
                            "from", s.getRoute().getOrigin(),
                            "to", s.getRoute().getDestination(),
                            "departureTime", s.getDepartureTime(),
                            "arrivalTime", s.getArrivalTime(),
                            "busName", s.getBus().getName(),
                            "totalAmount", b.getTotalAmount(),
                            "alreadyRated", alreadyRated
                    );
                })
                .toList();

        return ResponseEntity.ok(trips);
    }
}
