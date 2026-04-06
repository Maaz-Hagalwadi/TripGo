package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.RouteSegment;
import com.tripgo.backend.repository.BoardingDroppingPointRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.repository.RouteSegmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/booking/schedules/{scheduleId}")
@RequiredArgsConstructor
public class ScheduleInfoController {

    private final RouteScheduleRepository scheduleRepository;
    private final RouteSegmentRepository segmentRepository;
    private final BoardingDroppingPointRepository pointRepository;

    // GET /booking/schedules/{scheduleId}/route-stops
    @GetMapping("/route-stops")
    public ResponseEntity<?> getRouteStops(@PathVariable UUID scheduleId) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<RouteSegment> segments = segmentRepository.findByRouteOrderBySeq(schedule.getRoute());

        List<Map<String, Object>> stops = new ArrayList<>();

        for (int i = 0; i < segments.size(); i++) {
            RouteSegment seg = segments.get(i);

            // Add fromStop for first segment
            if (i == 0) {
                stops.add(Map.of(
                        "stopName", seg.getFromStop(),
                        "type", "ORIGIN",
                        "seq", i,
                        "distanceFromOriginKm", 0
                ));
            }

            // Add toStop for each segment
            stops.add(Map.<String, Object>of(
                    "stopName", seg.getToStop(),
                    "type", i == segments.size() - 1 ? "DESTINATION" : "INTERMEDIATE",
                    "seq", i + 1,
                    "distanceFromOriginKm", seg.getDistanceKm() != null ? seg.getDistanceKm() : 0,
                    "durationMinutes", seg.getDurationMinutes() != null ? seg.getDurationMinutes() : 0
            ));
        }

        return ResponseEntity.ok(Map.of(
                "scheduleId", scheduleId,
                "from", schedule.getRoute().getOrigin(),
                "to", schedule.getRoute().getDestination(),
                "stops", stops
        ));
    }

    // GET /booking/schedules/{scheduleId}/policies
    @GetMapping("/policies")
    public ResponseEntity<?> getPolicies(@PathVariable UUID scheduleId) {
        scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        // Default policies - operator can configure these later
        return ResponseEntity.ok(Map.of(
                "cancellation", List.of(
                        Map.of("hoursBeforeDeparture", 24, "refundPercent", 100, "label", "Before 24 hrs"),
                        Map.of("hoursBeforeDeparture", 12, "refundPercent", 50, "label", "12-24 hrs before"),
                        Map.of("hoursBeforeDeparture", 4, "refundPercent", 25, "label", "4-12 hrs before"),
                        Map.of("hoursBeforeDeparture", 0, "refundPercent", 0, "label", "Less than 4 hrs")
                ),
                "dateChange", Map.of(
                        "allowed", true,
                        "feePercent", 10,
                        "minHoursBeforeDeparture", 12
                ),
                "rules", Map.of(
                        "luggage", "1 bag up to 15kg allowed",
                        "children", "Children below 5 travel free",
                        "pets", "Not allowed",
                        "liquor", "Not allowed",
                        "smoking", "Not allowed"
                )
        ));
    }

    // GET /booking/schedules/{scheduleId}/features
    @GetMapping("/features")
    public ResponseEntity<?> getFeatures(@PathVariable UUID scheduleId) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<Map<String, String>> amenities = schedule.getBus().getAmenities().stream()
                .map(a -> Map.of(
                        "code", a.getCode(),
                        "label", a.getDescription() != null ? a.getDescription() : a.getCode(),
                        "icon", getIconForAmenity(a.getCode())
                ))
                .toList();

        return ResponseEntity.ok(Map.of(
                "busType", schedule.getBus().getBusType() != null
                        ? schedule.getBus().getBusType().toString() : "STANDARD",
                "amenities", amenities,
                "restStops", List.of(
                        Map.of("name", "Highway Dhaba", "location", "Midway", "durationMinutes", 20)
                ),
                "tripStatus", schedule.getTripStatus() != null ? schedule.getTripStatus() : "SCHEDULED",
                "delayMinutes", schedule.getDelayMinutes() != null ? schedule.getDelayMinutes() : 0,
                "actualDepartureTime", schedule.getActualDepartureTime() != null
                        ? schedule.getActualDepartureTime().toString() : null,
                "actualArrivalTime", schedule.getActualArrivalTime() != null
                        ? schedule.getActualArrivalTime().toString() : null
        ));
    }

    private String getIconForAmenity(String code) {
        return switch (code.toUpperCase()) {
            case "WIFI" -> "wifi";
            case "AC" -> "ac_unit";
            case "CHARGER" -> "electrical_services";
            case "WATER" -> "water_drop";
            case "BLANKET" -> "bed";
            case "TV" -> "tv";
            default -> "check_circle";
        };
    }
}
