package com.tripgo.backend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripgo.backend.model.entities.*;
import com.tripgo.backend.repository.*;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/booking/schedules/{scheduleId}")
@RequiredArgsConstructor
public class ScheduleInfoController {

    private final RouteScheduleRepository scheduleRepository;
    private final RouteSegmentRepository segmentRepository;
    private final SchedulePolicyRepository policyRepository;
    private final ObjectMapper objectMapper;

    // ─── Public: GET route stops ─────────────────────────────────────────────
    @GetMapping("/route-stops")
    public ResponseEntity<?> getRouteStops(@PathVariable UUID scheduleId) {
        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<RouteSegment> segments = segmentRepository.findByRouteOrderBySeq(schedule.getRoute());

        List<Map<String, Object>> stops = new ArrayList<>();
        int cumulativeDistance = 0;
        int cumulativeDuration = 0;

        for (int i = 0; i < segments.size(); i++) {
            RouteSegment seg = segments.get(i);

            if (i == 0) {
                stops.add(Map.of(
                        "stopName", seg.getFromStop(),
                        "type", "ORIGIN",
                        "seq", 0,
                        "distanceFromOriginKm", 0,
                        "durationFromOriginMinutes", 0
                ));
            }

            cumulativeDistance += seg.getDistanceKm() != null ? seg.getDistanceKm().intValue() : 0;
            cumulativeDuration += seg.getDurationMinutes() != null ? seg.getDurationMinutes() : 0;

            stops.add(Map.<String, Object>of(
                    "stopName", seg.getToStop(),
                    "type", i == segments.size() - 1 ? "DESTINATION" : "INTERMEDIATE",
                    "seq", i + 1,
                    "distanceFromOriginKm", cumulativeDistance,
                    "durationFromOriginMinutes", cumulativeDuration
            ));
        }

        return ResponseEntity.ok(Map.of(
                "scheduleId", scheduleId,
                "from", schedule.getRoute().getOrigin(),
                "to", schedule.getRoute().getDestination(),
                "stops", stops
        ));
    }

    // ─── Public: GET policies ────────────────────────────────────────────────
    @GetMapping("/policies")
    public ResponseEntity<?> getPolicies(@PathVariable UUID scheduleId) {
        scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        SchedulePolicy policy = policyRepository.findByScheduleId(scheduleId)
                .orElse(null);

        if (policy == null) {
            return ResponseEntity.ok(defaultPolicies());
        }

        try {
            List<?> cancellationSlabs = policy.getCancellationSlabs() != null
                    ? objectMapper.readValue(policy.getCancellationSlabs(), new TypeReference<List<?>>() {})
                    : defaultCancellationSlabs();

            List<?> restStops = policy.getRestStops() != null
                    ? objectMapper.readValue(policy.getRestStops(), new TypeReference<List<?>>() {})
                    : List.of();

            return ResponseEntity.ok(Map.of(
                    "cancellation", cancellationSlabs,
                    "dateChange", Map.of(
                            "allowed", Boolean.TRUE.equals(policy.getDateChangeAllowed()),
                            "feePercent", policy.getDateChangeFeePercent() != null ? policy.getDateChangeFeePercent() : 10,
                            "minHoursBeforeDeparture", policy.getDateChangeMinHours() != null ? policy.getDateChangeMinHours() : 12
                    ),
                    "rules", Map.of(
                            "luggage", policy.getLuggagePolicy() != null ? policy.getLuggagePolicy() : "1 bag up to 15kg allowed",
                            "children", policy.getChildrenPolicy() != null ? policy.getChildrenPolicy() : "Children below 5 travel free",
                            "pets", Boolean.TRUE.equals(policy.getPetsAllowed()) ? "Allowed" : "Not allowed",
                            "liquor", Boolean.TRUE.equals(policy.getLiquorAllowed()) ? "Allowed" : "Not allowed",
                            "smoking", Boolean.TRUE.equals(policy.getSmokingAllowed()) ? "Allowed" : "Not allowed",
                            "pickup", policy.getPickupNotes() != null ? policy.getPickupNotes() : ""
                    ),
                    "restStops", restStops
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(defaultPolicies());
        }
    }

    // ─── Operator: PUT policies ──────────────────────────────────────────────
    @PutMapping("/policies")
    public ResponseEntity<?> updatePolicies(
            @PathVariable UUID scheduleId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (user.getOperator() == null ||
                !schedule.getRoute().getOperator().getId().equals(user.getOperator().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Not your schedule"));
        }

        SchedulePolicy policy = policyRepository.findByScheduleId(scheduleId)
                .orElse(SchedulePolicy.builder().schedule(schedule).build());

        try {
            if (body.containsKey("cancellation")) {
                policy.setCancellationSlabs(objectMapper.writeValueAsString(body.get("cancellation")));
            }
            if (body.containsKey("restStops")) {
                policy.setRestStops(objectMapper.writeValueAsString(body.get("restStops")));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> dateChange = (Map<String, Object>) body.get("dateChange");
            if (dateChange != null) {
                policy.setDateChangeAllowed((Boolean) dateChange.getOrDefault("allowed", true));
                policy.setDateChangeFeePercent((Integer) dateChange.getOrDefault("feePercent", 10));
                policy.setDateChangeMinHours((Integer) dateChange.getOrDefault("minHoursBeforeDeparture", 12));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> rules = (Map<String, Object>) body.get("rules");
            if (rules != null) {
                if (rules.containsKey("luggage")) policy.setLuggagePolicy((String) rules.get("luggage"));
                if (rules.containsKey("children")) policy.setChildrenPolicy((String) rules.get("children"));
                if (rules.containsKey("pets")) policy.setPetsAllowed("Allowed".equals(rules.get("pets")));
                if (rules.containsKey("liquor")) policy.setLiquorAllowed("Allowed".equals(rules.get("liquor")));
                if (rules.containsKey("smoking")) policy.setSmokingAllowed("Allowed".equals(rules.get("smoking")));
                if (rules.containsKey("pickup")) policy.setPickupNotes((String) rules.get("pickup"));
            }

            policyRepository.save(policy);
            return ResponseEntity.ok(Map.of("message", "Policies updated successfully"));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to update policies: " + e.getMessage()));
        }
    }

    // ─── Public: GET features ────────────────────────────────────────────────
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

        SchedulePolicy policy = policyRepository.findByScheduleId(scheduleId).orElse(null);
        List<?> restStops = List.of();
        if (policy != null && policy.getRestStops() != null) {
            try {
                restStops = objectMapper.readValue(policy.getRestStops(), new TypeReference<List<?>>() {});
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of(
                "busType", schedule.getBus().getBusType() != null
                        ? schedule.getBus().getBusType().toString() : "STANDARD",
                "amenities", amenities,
                "restStops", restStops,
                "tripStatus", schedule.getTripStatus() != null ? schedule.getTripStatus() : "SCHEDULED",
                "delayMinutes", schedule.getDelayMinutes() != null ? schedule.getDelayMinutes() : 0,
                "actualDepartureTime", schedule.getActualDepartureTime() != null
                        ? schedule.getActualDepartureTime().toString() : null,
                "actualArrivalTime", schedule.getActualArrivalTime() != null
                        ? schedule.getActualArrivalTime().toString() : null
        ));
    }

    private Map<String, Object> defaultPolicies() {
        return Map.of(
                "cancellation", defaultCancellationSlabs(),
                "dateChange", Map.of("allowed", true, "feePercent", 10, "minHoursBeforeDeparture", 12),
                "rules", Map.of(
                        "luggage", "1 bag up to 15kg allowed",
                        "children", "Children below 5 travel free",
                        "pets", "Not allowed",
                        "liquor", "Not allowed",
                        "smoking", "Not allowed",
                        "pickup", ""
                ),
                "restStops", List.of()
        );
    }

    private List<Map<String, Object>> defaultCancellationSlabs() {
        return List.of(
                Map.of("hoursBeforeDeparture", 24, "refundPercent", 100, "label", "Before 24 hrs"),
                Map.of("hoursBeforeDeparture", 12, "refundPercent", 50, "label", "12-24 hrs before"),
                Map.of("hoursBeforeDeparture", 4, "refundPercent", 25, "label", "4-12 hrs before"),
                Map.of("hoursBeforeDeparture", 0, "refundPercent", 0, "label", "Less than 4 hrs")
        );
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
