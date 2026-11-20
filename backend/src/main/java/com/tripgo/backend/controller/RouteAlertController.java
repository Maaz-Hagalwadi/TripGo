package com.tripgo.backend.controller;

import com.tripgo.backend.model.entities.RouteAlert;
import com.tripgo.backend.model.entities.User;
import com.tripgo.backend.repository.RouteAlertRepository;
import com.tripgo.backend.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/route-alerts")
@RequiredArgsConstructor
public class RouteAlertController {

    private final RouteAlertRepository alertRepository;

    @GetMapping
    public List<Map<String, Object>> getMyAlerts(Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        return alertRepository.findByUserIdAndActiveTrue(user.getId())
                .stream()
                .map(this::toMap)
                .toList();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();

        String fromStop = (String) body.get("fromStop");
        String toStop = (String) body.get("toStop");
        String travelDateStr = (String) body.get("travelDate");

        if (fromStop == null || toStop == null || travelDateStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "fromStop, toStop, and travelDate are required"));
        }

        LocalDate travelDate = LocalDate.parse(travelDateStr);
        if (travelDate.isBefore(LocalDate.now())) {
            return ResponseEntity.badRequest().body(Map.of("error", "travelDate must be today or in the future"));
        }

        BigDecimal targetFare = body.get("targetFare") != null
                ? new BigDecimal(body.get("targetFare").toString()) : null;
        boolean alertOnSeat = Boolean.TRUE.equals(body.get("alertOnSeatAvailable"));

        if (targetFare == null && !alertOnSeat) {
            return ResponseEntity.badRequest().body(Map.of("error", "Set targetFare or alertOnSeatAvailable"));
        }

        RouteAlert alert = alertRepository.save(RouteAlert.builder()
                .user(user)
                .fromStop(fromStop)
                .toStop(toStop)
                .travelDate(travelDate)
                .targetFare(targetFare)
                .alertOnSeatAvailable(alertOnSeat)
                .build());

        return ResponseEntity.ok(toMap(alert));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        RouteAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found"));

        if (!alert.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        if (body.containsKey("targetFare")) {
            alert.setTargetFare(body.get("targetFare") != null
                    ? new BigDecimal(body.get("targetFare").toString()) : null);
        }
        if (body.containsKey("alertOnSeatAvailable")) {
            alert.setAlertOnSeatAvailable(Boolean.TRUE.equals(body.get("alertOnSeatAvailable")));
        }
        if (body.containsKey("active")) {
            alert.setActive(Boolean.TRUE.equals(body.get("active")));
        }

        return ResponseEntity.ok(toMap(alertRepository.save(alert)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id, Authentication auth) {
        User user = ((CustomUserDetails) auth.getPrincipal()).getUser();
        RouteAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found"));

        if (!alert.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        alertRepository.delete(alert);
        return ResponseEntity.ok(Map.of("message", "Alert deleted"));
    }

    private Map<String, Object> toMap(RouteAlert a) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("fromStop", a.getFromStop());
        m.put("toStop", a.getToStop());
        m.put("travelDate", a.getTravelDate().toString());
        m.put("targetFare", a.getTargetFare());
        m.put("alertOnSeatAvailable", a.isAlertOnSeatAvailable());
        m.put("active", a.isActive());
        m.put("lastNotifiedAt", a.getLastNotifiedAt() != null ? a.getLastNotifiedAt().toString() : null);
        return m;
    }
}
