package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.BusTracking;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.repository.BusTrackingRepository;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/tracking")
@RequiredArgsConstructor
public class BusTrackingController {

    private final BusTrackingRepository trackingRepository;
    private final RouteScheduleRepository scheduleRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/{scheduleId}/latest")
    public ResponseEntity<?> getLatest(@PathVariable UUID scheduleId) {
        return trackingRepository.findTopByRouteScheduleIdOrderByRecordedAtDesc(scheduleId)
                .<ResponseEntity<?>>map(t -> ResponseEntity.ok(Map.of(
                        "scheduleId", scheduleId,
                        "latitude", t.getLatitude(),
                        "longitude", t.getLongitude(),
                        "speedKmph", t.getSpeedKmph() != null ? t.getSpeedKmph() : 0,
                        "heading", t.getHeading() != null ? t.getHeading() : 0,
                        "recordedAt", t.getRecordedAt()
                )))
                .orElseGet(() -> {
                    Map<String, Object> empty = new LinkedHashMap<>();
                    empty.put("scheduleId", scheduleId);
                    empty.put("latitude", null);
                    empty.put("longitude", null);
                    return ResponseEntity.ok(empty);
                });
    }

    @PostMapping("/{scheduleId}")
    @PreAuthorize("hasRole('OPERATOR')")
    public ResponseEntity<?> pushLocation(
            @PathVariable UUID scheduleId,
            @RequestBody Map<String, Double> body,
            Authentication auth) {

        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        var operator = ((CustomUserDetails) auth.getPrincipal()).getUser().getOperator();
        if (operator == null || !schedule.getBus().getOperator().getId().equals(operator.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Not your schedule"));
        }

        BusTracking tracking = BusTracking.builder()
                .bus(schedule.getBus())
                .routeSchedule(schedule)
                .latitude(body.get("latitude"))
                .longitude(body.get("longitude"))
                .speedKmph(body.get("speedKmph"))
                .heading(body.get("heading"))
                .build();

        trackingRepository.save(tracking);

        messagingTemplate.convertAndSend("/topic/tracking/" + scheduleId, Map.of(
                "scheduleId", scheduleId,
                "latitude", tracking.getLatitude(),
                "longitude", tracking.getLongitude(),
                "speedKmph", tracking.getSpeedKmph() != null ? tracking.getSpeedKmph() : 0,
                "heading", tracking.getHeading() != null ? tracking.getHeading() : 0
        ));

        return ResponseEntity.ok(Map.of("status", "updated"));
    }
}
