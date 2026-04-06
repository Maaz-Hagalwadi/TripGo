package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.Operator;
import com.tripgo.backend.model.entities.RouteSchedule;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RouteScheduleRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/operator/schedules")
@RequiredArgsConstructor
public class TripManagementController {

    private final RouteScheduleRepository scheduleRepository;

    // POST /operator/schedules/{id}/start
    @PostMapping("/{scheduleId}/start")
    public ResponseEntity<?> startTrip(@PathVariable UUID scheduleId, Authentication auth) {
        RouteSchedule schedule = getOwnedSchedule(scheduleId, auth);

        if (!"SCHEDULED".equals(schedule.getTripStatus()) && !"DELAYED".equals(schedule.getTripStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Trip already started or completed"));
        }

        schedule.setTripStatus("STARTED");
        schedule.setActualDepartureTime(Instant.now());
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
            return ResponseEntity.badRequest().body(Map.of("message", "Trip must be started before completing"));
        }

        schedule.setTripStatus("COMPLETED");
        schedule.setActualArrivalTime(Instant.now());
        scheduleRepository.save(schedule);

        return ResponseEntity.ok(Map.of(
                "scheduleId", scheduleId,
                "tripStatus", "COMPLETED",
                "actualArrivalTime", schedule.getActualArrivalTime()
        ));
    }

    // PATCH /operator/schedules/{id}/delay
    @PatchMapping("/{scheduleId}/delay")
    public ResponseEntity<?> markDelay(
            @PathVariable UUID scheduleId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        RouteSchedule schedule = getOwnedSchedule(scheduleId, auth);

        if ("COMPLETED".equals(schedule.getTripStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot delay a completed trip"));
        }

        Integer delayMinutes = (Integer) body.get("delayMinutes");
        String delayReason = (String) body.getOrDefault("delayReason", "Unspecified");

        schedule.setTripStatus("DELAYED");
        schedule.setDelayMinutes(delayMinutes);
        schedule.setDelayReason(delayReason);
        scheduleRepository.save(schedule);

        return ResponseEntity.ok(Map.of(
                "scheduleId", scheduleId,
                "tripStatus", "DELAYED",
                "delayMinutes", delayMinutes,
                "delayReason", delayReason
        ));
    }

    private RouteSchedule getOwnedSchedule(UUID scheduleId, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        Operator operator = user.getOperator();

        if (operator == null) throw new RuntimeException("Not an operator");

        RouteSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (!schedule.getRoute().getOperator().getId().equals(operator.getId())) {
            throw new RuntimeException("Access denied");
        }

        return schedule;
    }
}
